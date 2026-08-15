import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { permissions } from '@/lib/permissions';
import { Role } from '@prisma/client';
import { donorDisplayName, formatCurrency, formatDate } from '@/lib/format';
import { calculateTenure, BOARD_ROLE_LABELS } from '@/lib/board-engagement';
import CommitmentStatusSelect from '@/components/board/CommitmentStatusSelect';
import AttendanceStatusSelect from '@/components/board/AttendanceStatusSelect';
import IntroductionStatusSelect from '@/components/board/IntroductionStatusSelect';
import AddCommitmentForm from '@/components/board/AddCommitmentForm';
import AddIntroductionForm from '@/components/board/AddIntroductionForm';

export default async function BoardMemberDashboardPage({ params }: { params: { termId: string } }) {
  const session = await auth();
  const db = forOrg(session!.user.organizationId);
  const canEdit = permissions.canEditDonors(session!.user.role as Role);
  const canManage = permissions.canManageOrgSettings(session!.user.role as Role);

  const [term, donorOptions] = await Promise.all([
    db.boardTerm.findUnique({
      where: { id: params.termId },
      include: {
        donor: true,
        board: { select: { name: true } },
        committeeMemberships: { include: { committee: { select: { name: true } } } },
        commitments: { orderBy: { createdAt: 'desc' } },
        introductions: {
          orderBy: { createdAt: 'desc' },
          include: { prospectDonor: { select: { firstName: true, lastName: true, organizationName: true } } },
        },
        meetingAttendance: {
          orderBy: { meeting: { date: 'desc' } },
          include: { meeting: { select: { title: true, date: true } } },
        },
      },
    }),
    db.donor.findMany({
      select: { id: true, firstName: true, lastName: true, organizationName: true },
      orderBy: { lastName: 'asc' },
    }),
  ]);

  if (!term) notFound();

  const tenure = calculateTenure(term.startDate, term.endDate);
  const meetingsAttended = term.meetingAttendance.filter((a) => a.status === 'ATTENDED').length;
  const attendanceRate =
    term.meetingAttendance.length > 0 ? Math.round((meetingsAttended / term.meetingAttendance.length) * 100) : null;
  const commitmentsFulfilled = term.commitments.filter((c) => c.status === 'FULFILLED').length;

  const donorOpts = donorOptions
    .filter((d) => d.id !== term.donorId)
    .map((d) => ({ id: d.id, name: donorDisplayName(d) }));

  return (
    <div className="max-w-4xl">
      <Link href="/board" className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-600 hover:text-gray-900">
        <ArrowLeft size={14} />
        Board
      </Link>

      <div className="mt-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">{donorDisplayName(term.donor)}</h1>
          <p className="mt-1 text-sm text-gray-600">
            {BOARD_ROLE_LABELS[term.role as keyof typeof BOARD_ROLE_LABELS]} &middot; {term.board.name}
          </p>
        </div>
        <Link
          href={`/donors/${term.donorId}`}
          className="text-[13px] font-semibold text-evergreen hover:text-[#0d685f]"
        >
          View donor record →
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Lifetime giving" value={formatCurrency(term.donor.lifetimeGiving.toString())} />
        <Stat label="Time served" value={tenure.servedLabel} />
        <Stat
          label={tenure.isPastEndDate ? 'Term ended' : 'Time remaining'}
          value={tenure.isPastEndDate ? formatDate(term.endDate!.toISOString()) : tenure.remainingLabel ?? 'Ongoing'}
        />
        <Stat label="Meeting attendance" value={attendanceRate !== null ? `${attendanceRate}%` : 'No meetings yet'} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-[16px] border border-gray-200 bg-white p-6">
          <h2 className="text-[15px] font-bold text-gray-900">Committees</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {term.committeeMemberships.length === 0 && (
              <p className="text-sm text-gray-600">Not currently on any committee.</p>
            )}
            {term.committeeMemberships.map((cm) => (
              <span
                key={cm.id}
                className="rounded-full bg-teal/10 px-3 py-1.5 text-[12.5px] font-semibold text-evergreen"
              >
                {cm.committee.name}
                {cm.isChair && ' (Chair)'}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-[16px] border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-gray-900">Commitments</h2>
            <span className="text-xs text-gray-500">
              {commitmentsFulfilled} of {term.commitments.length} fulfilled
            </span>
          </div>
          <div className="mt-3 flex flex-col divide-y divide-gray-50">
            {term.commitments.length === 0 && <p className="py-2 text-sm text-gray-600">No commitments yet.</p>}
            {term.commitments.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm text-gray-900">{c.description}</p>
                  <p className="text-xs text-gray-500">
                    {c.targetAmount ? formatCurrency(c.targetAmount.toString()) : c.targetCount ? `${c.targetCount}` : ''}
                    {c.dueDate ? ` · Due ${formatDate(c.dueDate.toISOString())}` : ''}
                    {c.isConfidential ? ' · Confidential' : ''}
                  </p>
                </div>
                <CommitmentStatusSelect id={c.id} donorId={term.donorId} status={c.status} disabled={!canEdit} />
              </div>
            ))}
          </div>
          {canManage && (
            <div className="mt-3 border-t border-gray-50 pt-3">
              <AddCommitmentForm boardTermId={term.id} donorId={term.donorId} />
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-[16px] border border-gray-200 bg-white p-6">
        <h2 className="text-[15px] font-bold text-gray-900">Meeting Attendance</h2>
        <div className="mt-3 flex flex-col divide-y divide-gray-50">
          {term.meetingAttendance.length === 0 && (
            <p className="py-2 text-sm text-gray-600">No meetings logged yet.</p>
          )}
          {term.meetingAttendance.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-3 py-2.5">
              <div>
                <p className="text-sm text-gray-900">{a.meeting.title}</p>
                <p className="text-xs text-gray-500">{formatDate(a.meeting.date.toISOString())}</p>
              </div>
              <AttendanceStatusSelect id={a.id} donorId={term.donorId} status={a.status} disabled={!canEdit} />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-[16px] border border-gray-200 bg-white p-6">
        <h2 className="text-[15px] font-bold text-gray-900">Introductions</h2>
        <div className="mt-3 flex flex-col divide-y divide-gray-50">
          {term.introductions.length === 0 && (
            <p className="py-2 text-sm text-gray-600">No introductions logged yet.</p>
          )}
          {term.introductions.map((intro) => (
            <div key={intro.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm text-gray-900">{donorDisplayName(intro.prospectDonor)}</p>
                {intro.notes && <p className="text-xs text-gray-500">{intro.notes}</p>}
              </div>
              <IntroductionStatusSelect id={intro.id} donorId={term.donorId} status={intro.status} disabled={!canEdit} />
            </div>
          ))}
        </div>
        {canEdit && (
          <div className="mt-3 border-t border-gray-50 pt-3">
            <AddIntroductionForm boardTermId={term.id} donorId={term.donorId} donorOptions={donorOpts} />
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] border border-gray-200 bg-white p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">{label}</div>
      <div className="mt-1 truncate text-lg font-extrabold text-gray-900">{value}</div>
    </div>
  );
}
