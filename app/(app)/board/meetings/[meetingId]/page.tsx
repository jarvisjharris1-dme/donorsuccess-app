import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { permissions } from '@/lib/permissions';
import { Role } from '@prisma/client';
import { donorDisplayName, formatDate } from '@/lib/format';
import BoardMeetingDocumentsPanel, { type BoardMeetingDocumentRow } from '@/components/board/BoardMeetingDocumentsPanel';
import AttendanceStatusSelect from '@/components/board/AttendanceStatusSelect';

export default async function BoardMeetingPage({ params }: { params: { meetingId: string } }) {
  const session = await auth();
  const db = forOrg(session!.user.organizationId);
  const canEdit = permissions.canEditDonors(session!.user.role as Role);
  const canManage = permissions.canManageOrgSettings(session!.user.role as Role);

  const meeting = await db.boardMeeting.findUnique({
    where: { id: params.meetingId },
    include: {
      board: { select: { name: true } },
      committee: { select: { name: true } },
      documents: {
        orderBy: { createdAt: 'desc' },
        include: { uploadedBy: { select: { name: true, email: true } } },
      },
      attendance: {
        orderBy: { boardTerm: { donor: { lastName: 'asc' } } },
        include: { boardTerm: { include: { donor: true } } },
      },
    },
  });

  if (!meeting) notFound();

  const attendedCount = meeting.attendance.filter((a) => a.status === 'ATTENDED').length;
  const attendanceRate =
    meeting.attendance.length > 0 ? Math.round((attendedCount / meeting.attendance.length) * 100) : null;

  const documentRows: BoardMeetingDocumentRow[] = meeting.documents.map((d) => ({
    id: d.id,
    fileName: d.fileName,
    fileSize: d.fileSize,
    uploadedByName: d.uploadedBy.name ?? d.uploadedBy.email,
  }));

  return (
    <div className="max-w-3xl">
      <Link href="/board" className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-600 hover:text-gray-900">
        <ArrowLeft size={14} />
        Board
      </Link>

      <div className="mt-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">{meeting.title}</h1>
          <p className="mt-1 text-sm text-gray-600">
            {formatDate(meeting.date.toISOString())} &middot; {meeting.board.name}
            {meeting.committee ? ` · ${meeting.committee.name} Committee` : ''}
          </p>
        </div>
        {attendanceRate !== null && (
          <div className="text-right">
            <p className="text-2xl font-extrabold text-gray-900">{attendanceRate}%</p>
            <p className="text-xs text-gray-500">
              {attendedCount} of {meeting.attendance.length} attended
            </p>
          </div>
        )}
      </div>

      {meeting.notes && (
        <div className="mt-6 rounded-[16px] border border-gray-200 bg-white p-6">
          <h2 className="text-[15px] font-bold text-gray-900">Notes</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-gray-900">{meeting.notes}</p>
        </div>
      )}

      <div className="mt-6">
        <BoardMeetingDocumentsPanel meetingId={meeting.id} documents={documentRows} canEdit={canManage} />
      </div>

      <div className="mt-6 rounded-[16px] border border-gray-200 bg-white p-6">
        <h2 className="text-[15px] font-bold text-gray-900">Attendance</h2>
        <div className="mt-3 flex flex-col divide-y divide-gray-50">
          {meeting.attendance.length === 0 && (
            <p className="py-2 text-sm text-gray-600">No attendance records for this meeting.</p>
          )}
          {meeting.attendance.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-3 py-2.5">
              <Link
                href={`/board/members/${a.boardTermId}`}
                className="text-sm font-medium text-evergreen hover:text-[#0d685f]"
              >
                {donorDisplayName(a.boardTerm.donor)}
              </Link>
              <AttendanceStatusSelect id={a.id} donorId={a.boardTerm.donorId} status={a.status} disabled={!canEdit} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
