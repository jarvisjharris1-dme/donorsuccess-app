'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requestPasswordResetAction } from '../actions';
import SubmitButton from '@/components/SubmitButton';
import BrandPanel from '@/components/auth/BrandPanel';

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setMessage(null);
    startTransition(async () => {
      const result = await requestPasswordResetAction(undefined, formData);
      if (result?.error) setMessage({ type: 'error', text: result.error });
      else if (result?.success) setMessage({ type: 'success', text: result.success });
    });
  }

  return (
    <div className="flex min-h-screen">
      <BrandPanel />

      <div className="flex flex-1 items-center justify-center bg-gray-50 px-5 py-12 lg:bg-white">
        <div className="w-full max-w-[400px] fade-up">
          <Link
            href="/login"
            className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={14} />
            Back to login
          </Link>

          <h1 className="mt-5 text-[28px] font-extrabold text-gray-900">Forgot your password?</h1>
          <p className="mt-1.5 text-[15px] text-gray-600">
            Enter your email and we&rsquo;ll start a password reset. Since email delivery isn&rsquo;t
            connected yet, your organization&rsquo;s Admin will need to send you the link — they&rsquo;ll
            see your request waiting in Settings.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-[13px] font-semibold text-gray-900">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full rounded-[10px] border border-gray-200 px-3.5 py-3 text-sm transition-colors focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
              />
            </div>

            {message && (
              <p
                className={`rounded-lg px-3.5 py-2.5 text-sm font-medium ${
                  message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-success/10 text-success'
                }`}
              >
                {message.text}
              </p>
            )}

            <SubmitButton pending={isPending}>Request reset</SubmitButton>
          </form>
        </div>
      </div>
    </div>
  );
}
