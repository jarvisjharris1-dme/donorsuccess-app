'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { DonorType, DonorSegment } from '@prisma/client';
import SubmitButton from '@/components/SubmitButton';
import { saveDonorAction, type ActionState } from '@/lib/actions/donors';
import { DONOR_SEGMENTS, SEGMENT_LABELS } from '@/lib/segments';
import { DONOR_TYPE_LABELS, ORG_TYPES } from '@/lib/donor-types';

type DonorFormValues = {
  id?: string;
  donorType: DonorType;
  firstName?: string | null;
  lastName?: string | null;
  organizationName?: string | null;
  email?: string | null;
  phone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  assignedToId?: string | null;
  segment?: DonorSegment | null;
  tags?: string[];
};

export default function DonorForm({
  donor,
  users,
}: {
  donor?: DonorFormValues;
  users: { id: string; name: string | null; email: string }[];
}) {
  const router = useRouter();
  const [donorType, setDonorType] = useState<DonorType>(donor?.donorType ?? DonorType.INDIVIDUAL);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isOrgType = ORG_TYPES.has(donorType);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result: ActionState = await saveDonorAction(undefined, formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {donor?.id && <input type="hidden" name="id" value={donor.id} />}

      <Section title="Donor type">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
          {Object.values(DonorType).map((type) => (
            <label
              key={type}
              className={`flex cursor-pointer items-center justify-center rounded-[10px] border px-3 py-2.5 text-[13px] font-semibold transition-colors ${
                donorType === type
                  ? 'border-evergreen bg-evergreen/5 text-evergreen'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="donorType"
                value={type}
                checked={donorType === type}
                onChange={() => setDonorType(type)}
                className="sr-only"
              />
              {DONOR_TYPE_LABELS[type]}
            </label>
          ))}
        </div>
      </Section>

      <Section title={isOrgType ? 'Organization' : 'Name'}>
        {isOrgType ? (
          <Field
            label="Organization name"
            name="organizationName"
            defaultValue={donor?.organizationName ?? ''}
          />
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <Field label="First name" name="firstName" defaultValue={donor?.firstName ?? ''} />
            <Field label="Last name" name="lastName" defaultValue={donor?.lastName ?? ''} />
          </div>
        )}
      </Section>

      <Section title="Contact">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Email" name="email" type="email" defaultValue={donor?.email ?? ''} />
          <Field label="Phone" name="phone" type="tel" defaultValue={donor?.phone ?? ''} />
        </div>
      </Section>

      <Section title="Address">
        <div className="grid grid-cols-1 gap-4">
          <Field
            label="Address line 1"
            name="addressLine1"
            defaultValue={donor?.addressLine1 ?? ''}
          />
          <Field
            label="Address line 2"
            name="addressLine2"
            defaultValue={donor?.addressLine2 ?? ''}
          />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label="City" name="city" defaultValue={donor?.city ?? ''} />
            <Field label="State" name="state" defaultValue={donor?.state ?? ''} />
            <Field label="Postal code" name="postalCode" defaultValue={donor?.postalCode ?? ''} />
            <Field
              label="Country"
              name="country"
              defaultValue={donor?.country ?? 'US'}
            />
          </div>
        </div>
      </Section>

      <Section title="Organization details">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="assignedToId"
              className="mb-1.5 block text-[13px] font-semibold text-gray-900"
            >
              Assigned to
            </label>
            <select
              id="assignedToId"
              name="assignedToId"
              defaultValue={donor?.assignedToId ?? ''}
              className="w-full rounded-[10px] border border-gray-200 px-3.5 py-3 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
            >
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name ?? u.email}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="segment"
              className="mb-1.5 block text-[13px] font-semibold text-gray-900"
            >
              Segment
            </label>
            <select
              id="segment"
              name="segment"
              defaultValue={donor?.segment ?? ''}
              className="w-full rounded-[10px] border border-gray-200 px-3.5 py-3 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
            >
              <option value="">No segment</option>
              {DONOR_SEGMENTS.map((s) => (
                <option key={s} value={s}>
                  {SEGMENT_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4">
          <Field
            label="Tags (comma separated)"
            name="tags"
            defaultValue={donor?.tags?.join(', ') ?? ''}
            placeholder="board-member, monthly-giver"
          />
        </div>
      </Section>

      {error && (
        <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <SubmitButton pending={isPending}>
          {donor?.id ? 'Save changes' : 'Create donor'}
        </SubmitButton>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-xl border border-gray-200 px-6 py-3.5 text-[15px] font-semibold text-gray-600 transition-colors hover:border-gray-300"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[16px] border border-gray-200 p-5">
      <h3 className="mb-4 text-[13px] font-bold uppercase tracking-wide text-gray-600">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Field({
  label,
  name,
  type = 'text',
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
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
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full rounded-[10px] border border-gray-200 px-3.5 py-3 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
      />
    </div>
  );
}
