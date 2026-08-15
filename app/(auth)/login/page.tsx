'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { loginAction } from '../actions';
import SubmitButton from '@/components/SubmitButton';
import BrandPanel from '@/components/auth/BrandPanel';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await loginAction(undefined, formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex min-h-screen">
      <BrandPanel />

      <div className="flex flex-1 items-center justify-center bg-gray-50 px-5 py-12 lg:bg-white">
        <div className="w-full max-w-[400px] fade-up">
          <MobileLogo />

          <h1 className="mt-8 text-[28px] font-extrabold text-gray-900 lg:mt-0">
            Welcome back
          </h1>
          <p className="mt-1.5 text-[15px] text-gray-600">
            Log in to pick up where you left off.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            <Field label="Email" name="email" type="email" autoComplete="email" />
            <Field
              label="Password"
              name="password"
              type="password"
              autoComplete="current-password"
            />
            <Link
              href="/forgot-password"
              className="-mt-2 self-end text-[13px] font-semibold text-gray-600 hover:text-evergreen"
            >
              Forgot password?
            </Link>

            {error && (
              <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600">
                {error}
              </p>
            )}

            <SubmitButton pending={isPending}>
              <span className="flex items-center justify-center gap-2">
                Log in
                <ArrowRight size={16} />
              </span>
            </SubmitButton>
          </form>

          <p className="mt-7 text-center text-sm text-gray-600">
            Don&rsquo;t have an account?{' '}
            <Link href="/signup" className="font-semibold text-evergreen hover:text-[#0d685f]">
              Start a subscription
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type,
  autoComplete,
}: {
  label: string;
  name: string;
  type: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-[13px] font-semibold text-gray-900">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required
        autoComplete={autoComplete}
        className="w-full rounded-[10px] border border-gray-200 px-3.5 py-3 text-sm transition-colors focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
      />
    </div>
  );
}

function MobileLogo() {
  return (
    <div className="flex items-center gap-2.5 lg:hidden">
      <svg width="34" height="34" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="14" cy="14" r="5" fill="#0F766E" />
        <circle cx="30" cy="10" r="4" fill="#14B8A6" />
        <circle cx="36" cy="24" r="3.2" fill="#14B8A6" />
        <circle cx="16" cy="30" r="6" fill="#0F766E" />
        <path
          d="M14 14 L16 30 M14 14 L30 10 M30 10 L36 24 M16 30 L36 24"
          stroke="#14B8A6"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <span className="text-[17px] font-extrabold leading-[1.05] text-gray-900">
        DONOR<span className="block font-black text-evergreen">SUCCESS</span>
      </span>
    </div>
  );
}
