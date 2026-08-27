import Logo from '@/components/layout/Logo';
import { requestCommunityAccessAction } from '@/lib/actions/community-auth';

export default function CommunityLoginPage({ searchParams }: { searchParams: { sent?: string; error?: string } }) {
  return (
    <main className="min-h-screen bg-[#f6f8f7] px-6 py-12">
      <div className="mx-auto max-w-lg">
        <div className="text-center">
          <div className="flex justify-center"><Logo height={44} /></div>
          <p className="mt-3 text-xs font-bold uppercase tracking-[.2em] text-gray-400">Community Portal</p>
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-gray-950">Your funding applications, all in one place.</h1>
          <p className="mt-3 text-sm leading-6 text-gray-600">Enter the email you used on your application and we&rsquo;ll send you a secure sign-in link.</p>
        </div>

        <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          {searchParams.sent === '1' && (
            <p className="mb-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              If that email is connected to an application, a secure access link is on the way.
            </p>
          )}
          {searchParams.error === 'expired' && (
            <p className="mb-5 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
              That access link has expired or was already used. Request a new one below.
            </p>
          )}
          <form action={requestCommunityAccessAction} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-900">Email address</label>
              <input name="email" type="email" required className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#16877c] focus:ring-2 focus:ring-[#16877c]/15" placeholder="you@organization.org" />
            </div>
            <button type="submit" className="w-full rounded-xl bg-[#0f6f66] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#0b5d56]">Email me a secure link</button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">Secure applicant access powered by Donor Success.</p>
      </div>
    </main>
  );
}
