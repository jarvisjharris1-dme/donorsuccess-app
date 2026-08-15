import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ShieldAlert, LogOut } from 'lucide-react';
import { auth, signOut } from '@/auth';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  // Redundant with the middleware check in auth.config.ts, on purpose —
  // same double-check pattern as (app)/layout.tsx. Nothing about this
  // area should ever rely on a single gate.
  if (!session?.user.isPlatformAdmin) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/admin" className="flex items-center gap-2.5 text-white">
            <ShieldAlert size={20} className="text-warning" />
            <span className="text-[15px] font-extrabold">
              Master Admin Console
              <span className="ml-2 rounded-full bg-warning/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-warning">
                Internal
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-5 text-gray-300">
            <span className="text-[13px]">{session.user.email}</span>
            <Link href="/dashboard" className="text-[13px] font-semibold hover:text-white">
              Exit to app
            </Link>
            <form
              action={async () => {
                'use server';
                await signOut({ redirectTo: '/login' });
              }}
            >
              <button
                type="submit"
                className="flex items-center gap-1.5 text-[13px] font-semibold hover:text-white"
              >
                <LogOut size={13} />
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
