import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';

export default function ApplicationSubmittedPage({ params }: { params: { roundId: string } }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f8f7] px-6 py-12">
      <div className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 size={30} /></div>
        <p className="mt-6 text-sm font-extrabold uppercase tracking-[.18em] text-[#0f6f66]">Donor Success Community Portal</p>
        <h1 className="mt-2 text-3xl font-extrabold text-gray-950">Application submitted</h1>
        <p className="mt-4 text-[15px] leading-7 text-gray-600">Thank you. Your organization and funding request have been delivered to the funding organization for review. Please keep a copy of the information you submitted for your records.</p>
        <Link href={`/apply/${params.roundId}`} className="mt-7 inline-flex rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">Return to funding opportunity</Link>
      </div>
    </main>
  );
}
