import { Mail } from 'lucide-react';
import { auth } from '@/auth';
import { getEmailConnection } from '@/lib/integrations/email-send';
import DisconnectEmailButton from './DisconnectEmailButton';

const ERROR_MESSAGES: Record<string, string> = {
  not_configured: 'Email integration isn\u2019t configured on the server yet — ask your admin to add the OAuth credentials.',
  missing_code_or_state: 'That connection attempt was incomplete — try again.',
  invalid_state: 'That connection link was invalid or expired — try again.',
  session_mismatch: 'You need to be logged in as the same user who started this connection.',
  token_exchange_failed: 'Could not complete the connection — try again, or check that the OAuth app is configured correctly.',
  access_denied: 'You declined the permission request, so nothing was connected.',
};

export default async function EmailConnectionSection({
  connectedParam,
  errorParam,
}: {
  connectedParam?: string;
  errorParam?: string;
}) {
  const session = await auth();
  const connection = await getEmailConnection(session!.user.id);

  return (
    <div className="rounded-[16px] border border-gray-200 bg-white p-6">
      <div className="flex items-center gap-2">
        <Mail size={16} className="text-gray-900" />
        <h2 className="text-[15px] font-bold text-gray-900">Email integration</h2>
      </div>
      <p className="mt-1 text-sm text-gray-600">
        Connect your own Gmail or Outlook account so emails to donors come from your real inbox —
        replies land with you, and it&rsquo;s logged automatically as an interaction.
      </p>

      {connectedParam === '1' && (
        <p className="mt-3 rounded-lg bg-success/10 px-3.5 py-2.5 text-sm font-medium text-success">
          Connected successfully.
        </p>
      )}
      {errorParam && (
        <p className="mt-3 rounded-lg bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600">
          {ERROR_MESSAGES[errorParam] ?? 'Something went wrong connecting your email — try again.'}
        </p>
      )}

      <div className="mt-4">
        {connection ? (
          <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-gray-900">
                {connection.provider === 'GMAIL' ? 'Gmail' : 'Outlook'}
              </div>
              <div className="text-xs text-gray-600">{connection.emailAddress}</div>
            </div>
            <DisconnectEmailButton />
          </div>
        ) : (
          <div className="flex flex-wrap gap-2.5">
            <a
              href="/api/integrations/gmail/connect"
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-[13.5px] font-semibold text-gray-900 transition-colors hover:border-gray-300"
            >
              Connect Gmail
            </a>
            <a
              href="/api/integrations/outlook/connect"
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-[13.5px] font-semibold text-gray-900 transition-colors hover:border-gray-300"
            >
              Connect Outlook
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
