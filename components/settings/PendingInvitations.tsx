import CopyInviteLink from './CopyInviteLink';
import RevokeInvitationButton from './RevokeInvitationButton';
import { formatDate } from '@/lib/format';

export type InvitationRow = {
  id: string;
  email: string;
  role: string;
  token: string;
  expiresAt: string;
};

export default function PendingInvitations({ invitations }: { invitations: InvitationRow[] }) {
  if (invitations.length === 0) {
    return <p className="py-4 text-sm text-gray-600">No pending invitations.</p>;
  }

  return (
    <div className="flex flex-col divide-y divide-gray-50">
      {invitations.map((inv) => (
        <div key={inv.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
          <div>
            <div className="text-sm font-semibold text-gray-900">{inv.email}</div>
            <div className="mt-0.5 text-xs text-gray-600">
              {inv.role.charAt(0) + inv.role.slice(1).toLowerCase()} &middot; expires{' '}
              {formatDate(inv.expiresAt)}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <CopyInviteLink token={inv.token} />
            <RevokeInvitationButton invitationId={inv.id} />
          </div>
        </div>
      ))}
    </div>
  );
}
