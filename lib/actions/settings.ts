'use server';

import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Role, GrantRole } from '@prisma/client';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { forOrg } from '@/lib/tenant-db';
import { assertRole, hasRole } from '@/lib/permissions';
import { updateOrgSchema, inviteSchema, changePasswordSchema } from '@/lib/validation';
import { generateToken } from '@/lib/tokens';
import { sendEmail } from '@/lib/email/resend';
import { invitationEmail } from '@/lib/email/templates/invitation';

export type ActionState = { error?: string; success?: string } | undefined;
export type ResetLinkState = { error?: string; token?: string } | undefined;
const INVITE_EXPIRY_DAYS = 7;
const RESET_TOKEN_EXPIRY_HOURS = 1;

export async function updateUserProfileAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth(); if (!session) redirect('/login');
  const nameValue = formData.get('name'); const name = typeof nameValue === 'string' ? nameValue.trim() : '';
  if (name.length < 2) return { error: 'Please enter your name.' };
  if (name.length > 100) return { error: 'Name must be 100 characters or fewer.' };
  const db = forOrg(session.user.organizationId); await db.user.update({ where: { id: session.user.id }, data: { name } });
  revalidatePath('/settings'); revalidatePath('/', 'layout'); return { success: 'Profile updated.' };
}

export async function updateOrganizationAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth(); if (!session) redirect('/login'); assertRole(session.user.role as Role, Role.ADMIN);
  const parsed = updateOrgSchema.safeParse({ name: formData.get('name'), timezone: formData.get('timezone') });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the organization details.' };
  await prisma.organization.update({ where: { id: session.user.organizationId }, data: parsed.data }); revalidatePath('/settings'); return { success: 'Organization updated.' };
}

export async function inviteUserAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth(); if (!session) redirect('/login'); assertRole(session.user.role as Role, Role.ADMIN);
  const parsed = inviteSchema.safeParse({ email: formData.get('email'), role: formData.get('role') }); if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the invite details.' };
  const db = forOrg(session.user.organizationId); const existingUser = await prisma.user.findUnique({ where: { email: parsed.data.email } }); if (existingUser) return { error: 'Someone with that email already has an account.' };
  const existingInvite = await db.invitation.findFirst({ where: { email: parsed.data.email, acceptedAt: null } }); if (existingInvite) return { error: 'There is already a pending invitation for that email.' };
  const token = generateToken(); const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  await db.invitation.create({ data: { email: parsed.data.email, role: parsed.data.role, token, invitedById: session.user.id, expiresAt, organizationId: session.user.organizationId } });
  try { const organization = await prisma.organization.findUnique({ where: { id: session.user.organizationId }, select: { name: true } }); const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'; const acceptUrl = `${baseUrl}/accept-invite/${token}`; const { subject, html, text } = invitationEmail({ acceptUrl, organizationName: organization?.name ?? 'your organization', inviterName: session.user.name ?? session.user.email ?? 'A teammate' }); await sendEmail({ to: parsed.data.email, subject, html, text }); } catch (err) { console.error('Invitation email failed to send:', err); }
  revalidatePath('/settings'); return { success: `Invitation sent to ${parsed.data.email}.` };
}

export async function revokeInvitationAction(_prevState: ActionState, formData: FormData): Promise<ActionState> { const session = await auth(); if (!session) redirect('/login'); assertRole(session.user.role as Role, Role.ADMIN); const invitationId=formData.get('id'); if(typeof invitationId!=='string'||!invitationId)return{error:'Missing invitation id.'}; const db=forOrg(session.user.organizationId); await db.invitation.delete({where:{id:invitationId}}); revalidatePath('/settings'); }

export async function updateUserRoleAction(_prevState: ActionState, formData: FormData): Promise<ActionState> { const session=await auth();if(!session)redirect('/login');assertRole(session.user.role as Role,Role.ADMIN);const userId=formData.get('userId'),role=formData.get('role');if(typeof userId!=='string'||!userId)return{error:'Missing user.'};if(typeof role!=='string'||!(role in Role))return{error:'Invalid role.'};const targetRole=role as Role,db=forOrg(session.user.organizationId),targetUser=await db.user.findUniqueOrThrow({where:{id:userId}});if((targetRole===Role.OWNER||targetUser.role===Role.OWNER)&&session.user.role!==Role.OWNER)return{error:'Only an Owner can change Owner-level access.'};if(targetUser.role===Role.OWNER&&targetRole!==Role.OWNER){const ownerCount=await db.user.count({where:{role:Role.OWNER,isActive:true}});if(ownerCount<=1)return{error:'An organization must have at least one Owner.'};}await db.user.update({where:{id:userId},data:{role:targetRole}});revalidatePath('/settings'); }

export async function updateUserGrantRoleAction(_prevState: ActionState, formData: FormData): Promise<ActionState> { const session=await auth();if(!session)redirect('/login');assertRole(session.user.role as Role,Role.ADMIN);const userId=formData.get('userId'),grantRole=formData.get('grantRole');if(typeof userId!=='string'||!userId)return{error:'Missing user.'};if(typeof grantRole!=='string'||(grantRole!==''&&!(grantRole in GrantRole)))return{error:'Invalid grant role.'};const db=forOrg(session.user.organizationId);await db.user.update({where:{id:userId},data:{grantRole:grantRole===''?null:grantRole as GrantRole}});revalidatePath('/settings'); }

export async function toggleUserActiveAction(_prevState: ActionState, formData: FormData): Promise<ActionState> { const session=await auth();if(!session)redirect('/login');assertRole(session.user.role as Role,Role.ADMIN);const userId=formData.get('userId'),nextActive=formData.get('active')==='true';if(typeof userId!=='string'||!userId)return{error:'Missing user.'};if(userId===session.user.id)return{error:"You can't deactivate your own account."};const db=forOrg(session.user.organizationId),target=await db.user.findUniqueOrThrow({where:{id:userId}});if(target.role===Role.OWNER&&!hasRole(session.user.role as Role,Role.OWNER))return{error:'Only an Owner can deactivate another Owner.'};if(target.role===Role.OWNER&&!nextActive){const owners=await db.user.count({where:{role:Role.OWNER,isActive:true}});if(owners<=1)return{error:'An organization must have at least one active Owner.'};}await db.user.update({where:{id:userId},data:{isActive:nextActive}});revalidatePath('/settings'); }

export async function adminResetPasswordAction(_prevState: ResetLinkState, formData: FormData): Promise<ResetLinkState> { const session=await auth();if(!session)redirect('/login');assertRole(session.user.role as Role,Role.ADMIN);const userId=formData.get('userId');if(typeof userId!=='string'||!userId)return{error:'Missing user.'};if(userId===session.user.id)return{error:'Use "Change your password" below to update your own password.'};const db=forOrg(session.user.organizationId),targetUser=await db.user.findUniqueOrThrow({where:{id:userId}});if(targetUser.role===Role.OWNER&&!hasRole(session.user.role as Role,Role.OWNER))return{error:'Only an Owner can reset another Owner\u2019s password.'};const token=generateToken();await prisma.verificationToken.deleteMany({where:{identifier:targetUser.email}});await prisma.verificationToken.create({data:{identifier:targetUser.email,token,expires:new Date(Date.now()+RESET_TOKEN_EXPIRY_HOURS*60*60*1000)}});revalidatePath('/settings');return{token}; }

export async function dismissPasswordResetAction(_prevState: ActionState, formData: FormData): Promise<ActionState> { const session=await auth();if(!session)redirect('/login');assertRole(session.user.role as Role,Role.ADMIN);const token=formData.get('token');if(typeof token!=='string'||!token)return{error:'Missing token.'};await prisma.verificationToken.delete({where:{token}}).catch(()=>undefined);revalidatePath('/settings'); }

export async function changeOwnPasswordAction(_prevState: ActionState, formData: FormData): Promise<ActionState> { const session=await auth();if(!session)redirect('/login');const parsed=changePasswordSchema.safeParse({currentPassword:formData.get('currentPassword'),newPassword:formData.get('newPassword')});if(!parsed.success)return{error:parsed.error.issues[0]?.message??'Check the form for errors.'};const user=await prisma.user.findUniqueOrThrow({where:{id:session.user.id}});if(!user.passwordHash)return{error:'This account has no password set.'};const valid=await bcrypt.compare(parsed.data.currentPassword,user.passwordHash);if(!valid)return{error:'Current password is incorrect.'};const passwordHash=await bcrypt.hash(parsed.data.newPassword,12);await prisma.user.update({where:{id:user.id},data:{passwordHash}});return{success:'Password updated.'}; }

// Backward-compatible aliases used by older settings UI code.
export const changePasswordAction = changeOwnPasswordAction;
export async function generatePasswordResetAction(_prevState: ResetLinkState, formData: FormData): Promise<ResetLinkState> { const session=await auth();if(!session)redirect('/login');if(!hasRole(session.user.role as Role,Role.ADMIN))return{error:'Not authorized.'};const email=formData.get('email');if(typeof email!=='string'||!email)return{error:'Missing email.'};const db=forOrg(session.user.organizationId),user=await db.user.findFirst({where:{email}});if(!user)return{error:'User not found.'};const token=generateToken(),expires=new Date(Date.now()+60*60*1000);await prisma.verificationToken.deleteMany({where:{identifier:email}});await prisma.verificationToken.create({data:{identifier:email,token,expires}});return{token}; }
