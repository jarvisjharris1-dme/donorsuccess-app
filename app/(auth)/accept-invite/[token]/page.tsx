import Link from 'next/link';
import { prisma } from '@/lib/db';
import BrandPanel from '@/components/auth/BrandPanel';
import AcceptInviteForm from './AcceptInviteForm';

export default async function AcceptInvitePage({ params }: { params: { token: string } }) {
  const invitation = await prisma.invitation.findUnique({
    where: { token: params.token },
    include: { organization: { select: { name: true } } },
  });

  if (!invitation) {
    return (
      <InviteMessage title="Invalid invitation">
        This invitation link doesn&rsquo;t exist. Double-check the link, or ask whoever invited
        you to send a new one.
      </InviteMessage>
    );
  }

  if (invitation.acceptedAt) {
    return (
      <InviteMessage title="Already accepted">
        This invitation has already been used.{' '}
        <Link href="/login" className="font-semibold text-evergreen">
          Log in
        </Link>{' '}
        instead.
      </InviteMessage>
    );
  }

  if (invitation.expiresAt < new Date()) {
    return (
      <InviteMessage title="Invitation expired">
        This invitation has expired. Ask an admin at {invitation.organization.name} to send you
        a new one.
      </InviteMessage>
    );
  }

  return (
    <div className="flex min-h-screen">
      <BrandPanel />
      <div className="flex flex-1 items-center justify-center bg-gray-50 px-5 py-12 lg:bg-white">
        <div className="w-full max-w-[420px] fade-up">
          <h1 className="text-[28px] font-extrabold text-gray-900">
            Join {invitation.organization.name}
          </h1>
          <p className="mt-2 text-[15px] text-gray-600">
            You&rsquo;ve been invited as <strong>{invitation.email}</strong> with{' '}
            <strong>{invitation.role.charAt(0) + invitation.role.slice(1).toLowerCase()}</strong>{' '}
            access. Set your name and password to finish creating your account.
          </p>

          <div className="mt-8">
            <AcceptInviteForm token={invitation.token} />
          </div>
        </div>
      </div>
    </div>
  );
}

function InviteMessage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <BrandPanel />
      <div className="flex flex-1 items-center justify-center bg-gray-50 px-5 lg:bg-white">
        <div className="w-full max-w-[420px] fade-up text-center">
          <h1 className="text-[24px] font-extrabold text-gray-900">{title}</h1>
          <p className="mt-3 text-[15px] text-gray-600">{children}</p>
        </div>
      </div>
    </div>
  );
}
