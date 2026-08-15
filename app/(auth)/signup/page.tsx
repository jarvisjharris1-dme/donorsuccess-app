'use client';

import { useState, useTransition, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { createCheckoutSessionAction } from '@/lib/actions/signup';
import SubmitButton from '@/components/SubmitButton';
import BrandPanel from '@/components/auth/BrandPanel';

const PLAN_LABELS: Record<string, string> = { starter: 'Starter', growth: 'Growth' };
const PLAN_PRICES: Record<string, { monthly: number; annual: number }> = {
  starter: { monthly: 99, annual: 89 },
  growth: { monthly: 249, annual: 219 },
};

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const searchParams = useSearchParams();
  const initialPlan = searchParams.get('plan') === 'growth' ? 'growth' : 'starter';
  const initialPeriod = searchParams.get('period') === 'monthly' ? 'monthly' : 'annual';

  const [plan, setPlan] = useState(initialPlan);
  const [period, setPeriod] = useState(initialPeriod);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set('plan', plan);
    formData.set('period', period);
    setError(null);
    startTransition(async () => {
      const result = await createCheckoutSessionAction(undefined, formData);
      if (result?.error) setError(result.error);
      // On success this redirects to Stripe and never returns here.
    });
  }

  const price = PLAN_PRICES[plan][period as 'monthly' | 'annual'];

  return (
    <div className="flex min-h-screen">
      <BrandPanel />

      <div className="flex flex-1 items-center justify-center bg-gray-50 px-5 py-12 lg:bg-white">
        <div className="w-full max-w-[440px] fade-up">
          <h1 className="text-[28px] font-extrabold text-gray-900">Start your subscription</h1>
          <p className="mt-1.5 text-[15px] text-gray-600">
            You&rsquo;ll set your password after payment — we&rsquo;ll email you a link.
          </p>

          <div className="mt-6 flex gap-2">
            {(['starter', 'growth'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPlan(p)}
                className={`flex-1 rounded-xl border px-4 py-3 text-left transition-colors ${
                  plan === p ? 'border-evergreen bg-evergreen/5' : 'border-gray-200'
                }`}
              >
                <div className="text-[13.5px] font-semibold text-gray-900">{PLAN_LABELS[p]}</div>
                <div className="text-xs text-gray-600">
                  ${PLAN_PRICES[p][period as 'monthly' | 'annual']}/mo
                </div>
              </button>
            ))}
          </div>

          <div className="mt-3 inline-flex rounded-full border border-gray-200 p-1">
            {(['monthly', 'annual'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`rounded-full px-4 py-1.5 text-[12.5px] font-semibold transition-colors ${
                  period === p ? 'bg-evergreen text-white' : 'text-gray-600'
                }`}
              >
                {p === 'monthly' ? 'Monthly' : 'Annual'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <Field
              label="Organization name"
              name="organizationName"
              type="text"
              autoComplete="organization"
              placeholder="Harborlight Foundation"
            />
            <Field label="Your name" name="ownerName" type="text" autoComplete="name" />
            <Field label="Email" name="ownerEmail" type="email" autoComplete="email" />

            {error && (
              <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600">
                {error}
              </p>
            )}

            <SubmitButton pending={isPending}>
              <span className="flex items-center justify-center gap-2">
                Continue to payment — ${price}/mo
                <ArrowRight size={16} />
              </span>
            </SubmitButton>

            <p className="text-center text-xs text-gray-500">
              You&rsquo;ll enter payment details on Stripe&rsquo;s secure checkout next.
            </p>
          </form>

          <p className="mt-7 text-center text-sm text-gray-600">
            Need Enterprise, or already have an account?{' '}
            <Link href="/login" className="font-semibold text-evergreen hover:text-[#0d685f]">
              Log in
            </Link>
            {' · '}
            <a
              href="https://www.donorsuccess.com/contact?plan=enterprise"
              className="font-semibold text-evergreen hover:text-[#0d685f]"
            >
              Talk to sales
            </a>
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
  placeholder,
}: {
  label: string;
  name: string;
  type: string;
  autoComplete?: string;
  placeholder?: string;
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
        placeholder={placeholder}
        className="w-full rounded-[10px] border border-gray-200 px-3.5 py-3 text-sm transition-colors focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
      />
    </div>
  );
}
