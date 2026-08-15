import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { getRetentionDetail } from '@/lib/metrics/retention';
import { formatDate } from '@/lib/format';
import DownloadCsvButton from '@/components/reports/DownloadCsvButton';

export default async function RetentionReportPage() {
  const session = await auth();
  const db = forOrg(session!.user.organizationId);
  const detail = await getRetentionDetail(db);

  const csvRows: (string | number)[][] = [
    ...detail.retained.map((d) => ['Retained', d.name, d.email ?? '', formatDate(d.lastGiftDate)]),
    ...detail.lapsed.map((d) => ['Lapsed', d.name, d.email ?? '', formatDate(d.lastGiftDate)]),
  ];

  return (
    <div className="max-w-4xl">
      <Link
        href="/reports"
        className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft size={14} />
        Reports
      </Link>

      <div className="mt-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Donor Retention</h1>
          <p className="mt-1 text-sm text-gray-600">
            Donors who gave 12–24 months ago, and whether they gave again in the last 12 months.
          </p>
        </div>
        {detail.rate !== null && (
          <DownloadCsvButton
            filename="donor-retention-report.csv"
            headers={['Status', 'Donor', 'Email', 'Last Gift Date']}
            rows={csvRows}
          />
        )}
      </div>

      {detail.rate === null ? (
        <div className="mt-6 rounded-[16px] border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-600">
            Not enough giving history yet to compute this report — it needs gifts recorded from
            12–24 months ago.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="rounded-[16px] border border-gray-200 bg-white p-5">
              <div className="font-display text-[28px] font-extrabold text-gray-900">
                {detail.rate}%
              </div>
              <div className="mt-1 text-[13px] font-medium text-gray-600">Retention rate</div>
            </div>
            <div className="rounded-[16px] border border-gray-200 bg-white p-5">
              <div className="font-display text-[28px] font-extrabold text-success">
                {detail.retained.length}
              </div>
              <div className="mt-1 text-[13px] font-medium text-gray-600">Retained</div>
            </div>
            <div className="rounded-[16px] border border-gray-200 bg-white p-5">
              <div className="font-display text-[28px] font-extrabold text-error">
                {detail.lapsed.length}
              </div>
              <div className="mt-1 text-[13px] font-medium text-gray-600">Lapsed</div>
            </div>
          </div>

          <div className="mt-6 rounded-[16px] border border-gray-200 bg-white p-6">
            <h2 className="text-[15px] font-bold text-gray-900">
              Lapsed donors <span className="font-normal text-gray-500">— worth a renewal ask</span>
            </h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-600">
                    <th className="px-3 py-2">Donor</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Last gift</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.lapsed.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-3 py-6 text-center text-gray-500">
                        No lapsed donors — everyone from last year gave again.
                      </td>
                    </tr>
                  )}
                  {detail.lapsed.map((d) => (
                    <tr key={d.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-3 py-2 font-medium">
                        <Link href={`/donors/${d.id}`} className="text-evergreen hover:text-[#0d685f]">
                          {d.name}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-gray-600">{d.email ?? '—'}</td>
                      <td className="px-3 py-2 text-gray-600">{formatDate(d.lastGiftDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 rounded-[16px] border border-gray-200 bg-white p-6">
            <h2 className="text-[15px] font-bold text-gray-900">Retained donors</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-600">
                    <th className="px-3 py-2">Donor</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Last gift</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.retained.map((d) => (
                    <tr key={d.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-3 py-2 font-medium">
                        <Link href={`/donors/${d.id}`} className="text-evergreen hover:text-[#0d685f]">
                          {d.name}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-gray-600">{d.email ?? '—'}</td>
                      <td className="px-3 py-2 text-gray-600">{formatDate(d.lastGiftDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
