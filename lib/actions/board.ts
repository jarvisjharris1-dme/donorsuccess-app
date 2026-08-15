'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { Role, BoardRole, CommitmentType, CommitmentStatus, IntroductionStatus, AttendanceStatus, AttendanceMethod } from '@prisma/client';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { assertRole } from '@/lib/permissions';

export type ActionState = { error?: string; success?: string } | undefined;

// ── Boards & Committees ──────────────────────────────────────────────────

const boardSchema = z.object({
  name: z.string().trim().min(1, 'Give this board a name'),
  startDate: z.string().min(1, 'Start date is required'),
});

export async function createBoardAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.ADMIN);

  const parsed = boardSchema.safeParse({ name: formData.get('name'), startDate: formData.get('startDate') });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form for errors.' };

  const db = forOrg(session.user.organizationId);
  await db.board.create({
    data: {
      organizationId: session.user.organizationId,
      name: parsed.data.name,
      startDate: new Date(parsed.data.startDate),
    },
  });

  revalidatePath('/board');
  return { success: 'Board created.' };
}

export async function addCommitteeAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.ADMIN);

  const boardId = formData.get('boardId');
  const name = formData.get('name');
  if (typeof boardId !== 'string' || !boardId) return { error: 'Missing board.' };
  if (typeof name !== 'string' || !name.trim()) return { error: 'Give this committee a name.' };

  const db = forOrg(session.user.organizationId);
  const board = await db.board.findUnique({ where: { id: boardId } });
  if (!board) return { error: 'Board not found.' };

  await db.committee.create({
    data: { organizationId: session.user.organizationId, boardId, name: name.trim() },
  });

  revalidatePath('/board');
  return { success: 'Committee added.' };
}

// ── Board Terms (membership) ─────────────────────────────────────────────

const boardTermSchema = z.object({
  boardId: z.string().min(1, 'Missing board'),
  donorId: z.string().min(1, 'Select a donor'),
  role: z.nativeEnum(BoardRole).default(BoardRole.MEMBER),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional().nullable().transform((v) => (v ? v : undefined)),
  votingMember: z.coerce.boolean().default(true),
});

export async function addBoardTermAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.ADMIN);

  const parsed = boardTermSchema.safeParse({
    boardId: formData.get('boardId'),
    donorId: formData.get('donorId'),
    role: formData.get('role'),
    startDate: formData.get('startDate'),
    endDate: formData.get('endDate'),
    votingMember: formData.get('votingMember'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form for errors.' };

  // A board member can be assigned to more than one committee at once —
  // formData.getAll picks up every checked committeeIds[] checkbox.
  const committeeIds = formData.getAll('committeeIds').filter((v): v is string => typeof v === 'string' && v.length > 0);

  const db = forOrg(session.user.organizationId);

  const [board, donor] = await Promise.all([
    db.board.findUnique({ where: { id: parsed.data.boardId } }),
    db.donor.findUnique({ where: { id: parsed.data.donorId } }),
  ]);
  if (!board) return { error: 'Board not found.' };
  if (!donor) return { error: 'Donor not found.' };

  const existing = await db.boardTerm.findFirst({
    where: { boardId: parsed.data.boardId, donorId: parsed.data.donorId, isActive: true },
  });
  if (existing) return { error: 'This donor already has an active term on this board.' };

  const term = await db.boardTerm.create({
    data: {
      organizationId: session.user.organizationId,
      boardId: parsed.data.boardId,
      donorId: parsed.data.donorId,
      role: parsed.data.role,
      startDate: new Date(parsed.data.startDate),
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
      votingMember: parsed.data.votingMember,
    },
  });

  if (committeeIds.length > 0) {
    await db.committeeMembership.createMany({
      data: committeeIds.map((committeeId) => ({
        organizationId: session.user.organizationId,
        boardTermId: term.id,
        committeeId,
      })),
    });
  }

  revalidatePath('/board');
  revalidatePath(`/donors/${parsed.data.donorId}`);
  return { success: 'Added to the board.' };
}

export async function updateBoardTermAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.ADMIN);

  const id = formData.get('id');
  if (typeof id !== 'string' || !id) return { error: 'Missing board term.' };

  const parsed = z
    .object({
      role: z.nativeEnum(BoardRole),
      endDate: z.string().optional().nullable().transform((v) => (v ? v : undefined)),
      votingMember: z.coerce.boolean().default(true),
    })
    .safeParse({
      role: formData.get('role'),
      endDate: formData.get('endDate'),
      votingMember: formData.get('votingMember'),
    });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form for errors.' };

  const committeeIds = formData.getAll('committeeIds').filter((v): v is string => typeof v === 'string' && v.length > 0);

  const db = forOrg(session.user.organizationId);
  const term = await db.boardTerm.update({
    where: { id },
    data: {
      role: parsed.data.role,
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
      votingMember: parsed.data.votingMember,
    },
  });

  // Replace-all, same reasoning as Sequence/Plan template steps: the
  // submitted form is the full source of truth for this term's
  // committee assignments each time it's saved, not an incremental diff.
  await db.committeeMembership.deleteMany({ where: { boardTermId: id } });
  if (committeeIds.length > 0) {
    await db.committeeMembership.createMany({
      data: committeeIds.map((committeeId) => ({
        organizationId: session.user.organizationId,
        boardTermId: id,
        committeeId,
      })),
    });
  }

  revalidatePath('/board');
  revalidatePath(`/donors/${term.donorId}`);
  return { success: 'Updated.' };
}

export async function endBoardTermAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.ADMIN);

  const id = formData.get('id');
  if (typeof id !== 'string' || !id) return { error: 'Missing board term.' };

  const db = forOrg(session.user.organizationId);
  const term = await db.boardTerm.update({
    where: { id },
    data: { isActive: false, endDate: new Date() },
  });

  revalidatePath('/board');
  revalidatePath(`/donors/${term.donorId}`);
  return { success: 'Term ended.' };
}

// ── Commitments ───────────────────────────────────────────────────────────

const commitmentSchema = z.object({
  type: z.nativeEnum(CommitmentType),
  description: z.string().trim().min(1, 'Describe this commitment'),
  targetAmount: z.coerce.number().positive().optional().nullable(),
  targetCount: z.coerce.number().int().positive().optional().nullable(),
  dueDate: z.string().optional().nullable().transform((v) => (v ? v : undefined)),
  isConfidential: z.coerce.boolean().default(false),
});

export async function addBoardCommitmentAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.ADMIN);

  const boardTermId = formData.get('boardTermId');
  const donorId = formData.get('donorId');
  if (typeof boardTermId !== 'string' || !boardTermId) return { error: 'Missing board term.' };

  const parsed = commitmentSchema.safeParse({
    type: formData.get('type'),
    description: formData.get('description'),
    targetAmount: formData.get('targetAmount'),
    targetCount: formData.get('targetCount'),
    dueDate: formData.get('dueDate'),
    isConfidential: formData.get('isConfidential'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form for errors.' };

  const db = forOrg(session.user.organizationId);
  const term = await db.boardTerm.findUnique({ where: { id: boardTermId } });
  if (!term) return { error: 'Board term not found.' };

  await db.boardCommitment.create({
    data: {
      organizationId: session.user.organizationId,
      boardTermId,
      type: parsed.data.type,
      description: parsed.data.description,
      targetAmount: parsed.data.targetAmount ?? null,
      targetCount: parsed.data.targetCount ?? null,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      isConfidential: parsed.data.isConfidential,
    },
  });

  if (typeof donorId === 'string') revalidatePath(`/donors/${donorId}`);
  revalidatePath('/board');
  return { success: 'Commitment added.' };
}

export async function updateBoardCommitmentStatusAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.FUNDRAISER);

  const id = formData.get('id');
  const donorId = formData.get('donorId');
  const status = formData.get('status');
  if (typeof id !== 'string' || !id) return { error: 'Missing commitment.' };
  if (typeof status !== 'string' || !(status in CommitmentStatus)) return { error: 'Invalid status.' };

  const db = forOrg(session.user.organizationId);
  await db.boardCommitment.update({ where: { id }, data: { status: status as CommitmentStatus } });

  if (typeof donorId === 'string') revalidatePath(`/donors/${donorId}`);
  revalidatePath('/board');
  return { success: 'Updated.' };
}

export async function deleteBoardCommitmentAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.ADMIN);

  const id = formData.get('id');
  const donorId = formData.get('donorId');
  if (typeof id !== 'string' || !id) return { error: 'Missing commitment.' };

  const db = forOrg(session.user.organizationId);
  await db.boardCommitment.delete({ where: { id } });

  if (typeof donorId === 'string') revalidatePath(`/donors/${donorId}`);
  revalidatePath('/board');
  return { success: 'Removed.' };
}

// ── Introductions ─────────────────────────────────────────────────────────

export async function addBoardIntroductionAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.FUNDRAISER);

  const boardTermId = formData.get('boardTermId');
  const prospectDonorId = formData.get('prospectDonorId');
  const donorId = formData.get('donorId');
  const notes = formData.get('notes');
  if (typeof boardTermId !== 'string' || !boardTermId) return { error: 'Missing board term.' };
  if (typeof prospectDonorId !== 'string' || !prospectDonorId) return { error: 'Choose a prospect.' };

  const db = forOrg(session.user.organizationId);
  const [term, prospect] = await Promise.all([
    db.boardTerm.findUnique({ where: { id: boardTermId } }),
    db.donor.findUnique({ where: { id: prospectDonorId } }),
  ]);
  if (!term) return { error: 'Board term not found.' };
  if (!prospect) return { error: 'Prospect donor not found.' };

  await db.boardIntroduction.create({
    data: {
      organizationId: session.user.organizationId,
      boardTermId,
      prospectDonorId,
      notes: typeof notes === 'string' && notes.trim() ? notes.trim() : null,
    },
  });

  if (typeof donorId === 'string') revalidatePath(`/donors/${donorId}`);
  revalidatePath('/board');
  return { success: 'Introduction logged.' };
}

export async function updateBoardIntroductionStatusAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.FUNDRAISER);

  const id = formData.get('id');
  const donorId = formData.get('donorId');
  const status = formData.get('status');
  if (typeof id !== 'string' || !id) return { error: 'Missing introduction.' };
  if (typeof status !== 'string' || !(status in IntroductionStatus)) return { error: 'Invalid status.' };

  const typedStatus = status as IntroductionStatus;
  const db = forOrg(session.user.organizationId);
  await db.boardIntroduction.update({
    where: { id },
    data: {
      status: typedStatus,
      requestedAt: typedStatus === IntroductionStatus.REQUESTED ? new Date() : undefined,
      completedAt:
        typedStatus === IntroductionStatus.MADE || typedStatus === IntroductionStatus.MEETING_HELD
          ? new Date()
          : undefined,
    },
  });

  if (typeof donorId === 'string') revalidatePath(`/donors/${donorId}`);
  revalidatePath('/board');
  return { success: 'Updated.' };
}

// ── Meetings & Attendance ─────────────────────────────────────────────────

const meetingSchema = z.object({
  boardId: z.string().min(1, 'Missing board'),
  committeeId: z.string().optional().nullable().transform((v) => (v ? v : undefined)),
  title: z.string().trim().min(1, 'Give this meeting a title'),
  date: z.string().min(1, 'Date is required'),
  notes: z.string().trim().optional().nullable().transform((v) => (v ? v : undefined)),
});

/**
 * Creates the meeting and, in the same action, records attendance for
 * every active board term on this board — defaulting to ATTENDED, with
 * the caller expected to correct anyone who was actually excused or
 * absent afterward via updateMeetingAttendanceAction. This is simpler
 * than requiring attendance to be marked one member at a time on
 * every single meeting, which — for a board of 15-20 people meeting
 * quarterly — would be real, avoidable friction for something that's
 * usually "everyone but one or two people showed up."
 */
export async function addBoardMeetingAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.ADMIN);

  const parsed = meetingSchema.safeParse({
    boardId: formData.get('boardId'),
    committeeId: formData.get('committeeId'),
    title: formData.get('title'),
    date: formData.get('date'),
    notes: formData.get('notes'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form for errors.' };

  const db = forOrg(session.user.organizationId);
  const board = await db.board.findUnique({ where: { id: parsed.data.boardId } });
  if (!board) return { error: 'Board not found.' };

  const meeting = await db.boardMeeting.create({
    data: {
      organizationId: session.user.organizationId,
      boardId: parsed.data.boardId,
      committeeId: parsed.data.committeeId,
      title: parsed.data.title,
      date: new Date(parsed.data.date),
      notes: parsed.data.notes,
    },
  });

  // If this is a committee meeting, only that committee's active
  // members get a default attendance row; a full board meeting covers
  // every active term on the board.
  const activeTerms = await db.boardTerm.findMany({
    where: {
      boardId: parsed.data.boardId,
      isActive: true,
      ...(parsed.data.committeeId
        ? { committeeMemberships: { some: { committeeId: parsed.data.committeeId } } }
        : {}),
    },
    select: { id: true },
  });

  if (activeTerms.length > 0) {
    await db.boardMeetingAttendance.createMany({
      data: activeTerms.map((t) => ({
        organizationId: session.user.organizationId,
        meetingId: meeting.id,
        boardTermId: t.id,
      })),
    });
  }

  revalidatePath('/board');
  return { success: 'Meeting logged.' };
}

export async function updateMeetingAttendanceAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.FUNDRAISER);

  const id = formData.get('id');
  const donorId = formData.get('donorId');
  const status = formData.get('status');
  const method = formData.get('method');
  if (typeof id !== 'string' || !id) return { error: 'Missing attendance record.' };
  if (typeof status !== 'string' || !(status in AttendanceStatus)) return { error: 'Invalid status.' };

  const db = forOrg(session.user.organizationId);
  const attendance = await db.boardMeetingAttendance.update({
    where: { id },
    data: {
      status: status as AttendanceStatus,
      method: typeof method === 'string' && method in AttendanceMethod ? (method as AttendanceMethod) : null,
    },
  });

  if (typeof donorId === 'string') revalidatePath(`/donors/${donorId}`);
  revalidatePath(`/board/meetings/${attendance.meetingId}`);
  revalidatePath('/board');
  return { success: 'Updated.' };
}

export async function deleteBoardMeetingAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.ADMIN);

  const id = formData.get('id');
  if (typeof id !== 'string' || !id) return { error: 'Missing meeting.' };

  const db = forOrg(session.user.organizationId);
  await db.boardMeetingAttendance.deleteMany({ where: { meetingId: id } });
  await db.boardMeeting.delete({ where: { id } });

  revalidatePath('/board');
  return { success: 'Meeting removed.' };
}
