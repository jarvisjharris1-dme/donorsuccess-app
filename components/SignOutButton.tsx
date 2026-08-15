import { LogOut } from 'lucide-react';
import { signOut } from '@/auth';

export default function SignOutButton() {
  return (
    <form
      action={async () => {
        'use server';
        await signOut({ redirectTo: '/login' });
      }}
    >
      <button
        type="submit"
        className="flex items-center gap-1.5 text-[13.5px] font-semibold text-gray-600 transition-colors hover:text-gray-900"
      >
        <LogOut size={14} />
        <span className="hidden sm:inline">Sign out</span>
      </button>
    </form>
  );
}
