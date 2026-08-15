'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Copy, Check } from 'lucide-react';
import SubmitButton from '@/components/SubmitButton';
import { createOrganizationAction, type CreateOrgState } from '@/lib/actions/admin';

const COMMON_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default function CreateOrganizationForm() {
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateOrgState>(undefined);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const inputClasses =
    'w-full rounded-[10px] border border-gray-700 bg-gray-800 px-3.5 py-3 text-sm text-white placeholder:text-gray-500 focus:border-evergreen focus:outline-none focus:ring-2 focus:ring-evergreen/30';
  const labelClasses = 'mb-1.5 block text-[13px] font-semibold text-gray-300';

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const res = await createOrganizationAction(undefined, formData);
      if (res?.error) setError(res.error);
      else setResult(res);
    });
  }

  async function handleCopy() {
    if (!result?.inviteToken) return;
    const link = `${window.location.origin}/accept-invite/${result.inviteToken}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (result?.inviteToken) {
    return (
      <div className="rounded-[16px] border border-gray-800 bg-gray-800/40 p-6">
        <h2 className="text-[15px] font-bold text-white">Organization created</h2>
        <p className="mt-2 text-sm text-gray-400">
          An invitation email was just sent automatically to the owner&rsquo;s address. This link
          does the same thing — useful as a backup, or if you&rsquo;d rather share it yourself.
        </p>
        <button
          type="button"
          onClick={handleCopy}
          className="mt-4 flex items-center gap-2 rounded-xl bg-evergreen px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-[#0d685f]"
        >
          {copied ? <Check size={15} /> : <Copy size={15} />}
          {copied ? 'Copied' : 'Copy invite link'}
        </button>
        <div className="mt-5">
          <Link
            href={`/admin/organizations/${result.organizationId}`}
            className="text-[13px] font-semibold text-evergreen hover:text-teal"
          >
            View organization →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-[16px] border border-gray-800 bg-gray-800/40 p-6">
      <div>
        <label htmlFor="organizationName" className={labelClasses}>
          Organization name
        </label>
        <input
          id="organizationName"
          name="organizationName"
          type="text"
          required
          placeholder="Riverside Community Foundation"
          onChange={(e) => {
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
          className={inputClasses}
        />
      </div>

      <div>
        <label htmlFor="slug" className={labelClasses}>
          Slug
        </label>
        <input
          id="slug"
          name="slug"
          type="text"
          required
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(slugify(e.target.value));
          }}
          placeholder="riverside-community-foundation"
          className={inputClasses}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="timezone" className={labelClasses}>
            Timezone
          </label>
          <select id="timezone" name="timezone" defaultValue="America/New_York" className={inputClasses}>
            {COMMON_TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="subscriptionTier" className={labelClasses}>
            Subscription tier
          </label>
          <select id="subscriptionTier" name="subscriptionTier" defaultValue="TRIAL" className={inputClasses}>
            <option value="TRIAL">Trial</option>
            <option value="STARTER">Starter</option>
            <option value="GROWTH">Growth</option>
            <option value="ENTERPRISE">Enterprise</option>
          </select>
        </div>
      </div>

      <div className="mt-2 border-t border-gray-800 pt-4">
        <p className="mb-3 text-[13px] font-semibold text-gray-300">First Owner</p>
        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="ownerName" className={labelClasses}>
              Name
            </label>
            <input id="ownerName" name="ownerName" type="text" required className={inputClasses} />
          </div>
          <div>
            <label htmlFor="ownerEmail" className={labelClasses}>
              Email
            </label>
            <input id="ownerEmail" name="ownerEmail" type="email" required className={inputClasses} />
          </div>
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-red-500/10 px-3.5 py-2.5 text-sm font-medium text-red-400">
          {error}
        </p>
      )}

      <div className="mt-2">
        <SubmitButton pending={isPending}>Create organization</SubmitButton>
      </div>
    </form>
  );
}
