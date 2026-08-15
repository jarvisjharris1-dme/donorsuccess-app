import Link from 'next/link';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { permissions } from '@/lib/permissions';
import { Role } from '@prisma/client';
import { donorDisplayName, formatDate } from '@/lib/format';
import { BOARD_ROLE_LABELS } from '@/lib/board-engagement';
import CreateBoardForm from '@/components/board/CreateBoardForm';
import AddCommitteeForm from '@/components/board/AddCommitteeForm';
import AddBoardMemberForm from '@/components/board/AddBoardMemberForm';
import LogMeetingForm from '@/components/board/LogMeetingForm';

export default async function BoardPage() {
  const session = await auth();
  const db = forOrg(session!.user.organizationId);
  const canManage = permissions.canManageOrgSettings(session!.user.role as Role);

  const board = await db.board.findFirst({
    where: { isActive: true },
    orderBy: { startDate: 'desc' },
    include: {
      committees: { orderBy: { name: 'asc' } },
      terms: {
        where: { isActive: true },
        orderBy: { role: 'asc' },
        include: {
          donor: { select: { id: true, firstName: true, lastName: true, organizationName: true, lifetimeGiving: true } },
          committeeMemberships: { include: { committee: { select: { name: true } } } },
          commitments: { select: { status: true } },
          meetingAttendance: { select: { status: true } },
        },
      },
      meetings: {
        orderBy: { date: 'desc' },
        take: 10,
        include: { committee: { select: { name: true } } },
      },
    },
  });

  if (!board) {
    return (
      <div className="max-w-xl">
        <h1 className="text-2xl font-extrabold text-gray-900">Board Engagement</h1>
        <p className="mt-1 text-sm text-gray-600">
          Track board membership, committees, commitments, and meeting participation.
        </p>
        <div className="mt-6">{canManage ? <CreateBoardForm /> : <p className="text-sm text-gray-600">Ask an Admin to set up your board.</p>}</div>
      </div>
    );
  }

  const donorOptions = await db.donor.findMany({
    select: { id: true, firstName: true, lastName: true, organizationName: true },
    orderBy: { lastName: 'asc' },
  });
  const committeeOptions = board.committees.map((c) => ({ id: c.id, name: c.name }));
  const existingMemberDonorIds = new Set(board.terms.map((t) => t.donorId));
  const availableDonorOptions = donorOptions
    .filter((d) => !existingMemberDonorIds.has(d.id))
    .map((d) => ({ id: d.id, name: donorDisplayName(d) }));

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">{board.name}</h1>
          <p className="mt-1 text-sm text-gray-600">
            {board.terms.length} active member{board.terms.length === 1 ? '' : 's'} &middot; {board.committees.length}{' '}
            committee{board.committees.length === 1 ? '' : 's'}
          </p>
        </div>
        {canManage && (
          <AddBoardMemberForm boardId={board.id} donorOptions={availableDonorOptions} committeeOptions={committeeOptions} />
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-[16px] border border-gray-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-600">
                  <th className="px-5 py-3.5">Member</th>
                  <th className="px-5 py-3.5">Role</th>
                  <th className="px-5 py-3.5">Committees</th>
                  <th className="px-5 py-3.5">Commitments</th>
                  <th className="px-5 py-3.5">Attendance</th>
                </tr>
              </thead>
              <tbody>
                {board.terms.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-600">
                      No board members yet.
                    </td>
                  </tr>
                )}
                {board.terms.map((t) => {
                  const fulfilled = t.commitments.filter((c) => c.status === 'FULFILLED').length;
                  const attended = t.meetingAttendance.filter((a) => a.status === 'ATTENDED').length;
                  const attendanceRate =
                    t.meetingAttendance.length > 0 ? Math.round((attended / t.meetingAttendance.length) * 100) : null;

                  return (
                    <tr key={t.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <Link
                          href={`/board/members/${t.id}`}
                          className="font-semibold text-evergreen hover:text-[#0d685f]"
                        >
                          {donorDisplayName(t.donor)}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-gray-700">{BOARD_ROLE_LABELS[t.role as keyof typeof BOARD_ROLE_LABELS]}</td>
                      <td className="px-5 py-3 text-gray-700">
                        {t.committeeMemberships.length === 0
                          ? '—'
                          : t.committeeMemberships.map((cm) => cm.committee.name).join(', ')}
                      </td>
                      <td className="px-5 py-3 text-gray-700">
                        {t.commitments.length > 0 ? `${fulfilled} of ${t.commitments.length}` : '—'}
                      </td>
                      <td className="px-5 py-3 text-gray-700">{attendanceRate !== null ? `${attendanceRate}%` : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-[16px] border border-gray-200 bg-white p-5">
            <h2 className="text-[14px] font-bold text-gray-900">Committees</h2>
            <div className="mt-3 flex flex-col gap-1.5">
              {board.committees.length === 0 && <p className="text-sm text-gray-600">No committees yet.</p>}
              {board.committees.map((c) => (
                <span key={c.id} className="text-sm text-gray-700">
                  {c.name}
                </span>
              ))}
            </div>
            {canManage && (
              <div className="mt-3 border-t border-gray-50 pt-3">
                <AddCommitteeForm boardId={board.id} />
              </div>
            )}
          </div>

          <div className="rounded-[16px] border border-gray-200 bg-white p-5">
            <h2 className="text-[14px] font-bold text-gray-900">Recent Meetings</h2>
            <div className="mt-3 flex flex-col divide-y divide-gray-50">
              {board.meetings.length === 0 && <p className="py-2 text-sm text-gray-600">No meetings logged yet.</p>}
              {board.meetings.map((m) => (
                <Link key={m.id} href={`/board/meetings/${m.id}`} className="block py-2 hover:bg-gray-50">
                  <p className="text-sm font-medium text-evergreen">{m.title}</p>
                  <p className="text-xs text-gray-500">
                    {formatDate(m.date.toISOString())}
                    {m.committee ? ` · ${m.committee.name}` : ''}
                  </p>
                </Link>
              ))}
            </div>
            {canManage && (
              <div className="mt-3 border-t border-gray-50 pt-3">
                <LogMeetingForm boardId={board.id} committeeOptions={committeeOptions} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
