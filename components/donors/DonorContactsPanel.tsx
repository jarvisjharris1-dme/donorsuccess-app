'use client';

import { useState, useTransition } from 'react';
import { Plus, Pencil, Trash2, Star, Users } from 'lucide-react';
import { ContactType, EngagementStyle } from '@prisma/client';
import {
  saveDonorContactAction,
  deleteDonorContactAction,
  type ActionState,
} from '@/lib/actions/donor-contacts';
import { CONTACT_TYPES, CONTACT_TYPE_LABELS } from '@/lib/contact-types';
import { ENGAGEMENT_STYLES, ENGAGEMENT_STYLE_LABELS } from '@/lib/engagement-style';
import ContactTypeBadge from './ContactTypeBadge';
import EngagementStyleBadge from './EngagementStyleBadge';
import SubmitButton from '@/components/SubmitButton';

export type DonorContactData = {
  id: string;
  firstName: string;
  lastName: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  contactType: ContactType | null;
  engagementStyle: EngagementStyle | null;
  isPrimary: boolean;
  notes: string | null;
};

export default function DonorContactsPanel({
  donorId,
  contacts,
  canEdit,
}: {
  donorId: string;
  contacts: DonorContactData[];
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState<DonorContactData | 'new' | null>(null);

  return (
    <div className="rounded-[16px] border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-gray-900" />
          <h2 className="text-[15px] font-bold text-gray-900">Contacts</h2>
        </div>
        {canEdit && editing === null && (
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="flex items-center gap-1.5 text-[13px] font-semibold text-evergreen hover:text-[#0d685f]"
          >
            <Plus size={14} />
            Add contact
          </button>
        )}
      </div>

      {editing !== null ? (
        <ContactForm
          donorId={donorId}
          contact={editing === 'new' ? undefined : editing}
          onDone={() => setEditing(null)}
        />
      ) : (
        <div className="mt-4 flex flex-col divide-y divide-gray-50">
          {contacts.length === 0 && (
            <p className="py-4 text-sm text-gray-600">
              No contacts added yet — add the people at this organization who matter to the
              relationship (an executive, a board member, whoever champions your cause there).
            </p>
          )}
          {contacts.map((c) => (
            <div key={c.id} className="flex items-start justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">
                    {c.firstName} {c.lastName}
                  </span>
                  {c.isPrimary && <Star size={13} className="fill-warning text-warning" />}
                </div>
                {c.title && <div className="text-xs text-gray-600">{c.title}</div>}
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {c.contactType && <ContactTypeBadge type={c.contactType} />}
                  {c.engagementStyle && <EngagementStyleBadge style={c.engagementStyle} />}
                  {c.email && <span className="text-xs text-gray-600">{c.email}</span>}
                  {c.phone && <span className="text-xs text-gray-600">{c.phone}</span>}
                </div>
                {c.notes && <p className="mt-1.5 text-xs text-gray-500">{c.notes}</p>}
              </div>
              {canEdit && (
                <div className="flex flex-shrink-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setEditing(c)}
                    className="text-gray-400 hover:text-evergreen"
                    aria-label="Edit contact"
                  >
                    <Pencil size={14} />
                  </button>
                  <DeleteContactButton donorId={donorId} contactId={c.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ContactForm({
  donorId,
  contact,
  onDone,
}: {
  donorId: string;
  contact?: DonorContactData;
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result: ActionState = await saveDonorContactAction(undefined, formData);
      if (result?.error) setError(result.error);
      else onDone();
    });
  }

  const inputClasses =
    'w-full rounded-[10px] border border-gray-200 px-3.5 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20';
  const labelClasses = 'mb-1 block text-[12px] font-semibold text-gray-900';

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
      <input type="hidden" name="donorId" value={donorId} />
      {contact?.id && <input type="hidden" name="id" value={contact.id} />}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClasses}>First name</label>
          <input name="firstName" required defaultValue={contact?.firstName} className={inputClasses} />
        </div>
        <div>
          <label className={labelClasses}>Last name</label>
          <input name="lastName" required defaultValue={contact?.lastName} className={inputClasses} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClasses}>Title</label>
          <input
            name="title"
            defaultValue={contact?.title ?? ''}
            placeholder="Chief Executive Officer"
            className={inputClasses}
          />
        </div>
        <div>
          <label className={labelClasses}>Contact type</label>
          <select name="contactType" defaultValue={contact?.contactType ?? ''} className={inputClasses}>
            <option value="">No type set</option>
            {CONTACT_TYPES.map((t) => (
              <option key={t} value={t}>
                {CONTACT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelClasses}>Engagement style</label>
        <select name="engagementStyle" defaultValue={contact?.engagementStyle ?? ''} className={inputClasses}>
          <option value="">Not set</option>
          {ENGAGEMENT_STYLES.map((s) => (
            <option key={s} value={s}>
              {ENGAGEMENT_STYLE_LABELS[s]}
            </option>
          ))}
        </select>
        <p className="mt-1 text-[11px] text-gray-500">
          How this person is best cultivated — separate from their role or title.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClasses}>Email</label>
          <input
            name="email"
            type="email"
            defaultValue={contact?.email ?? ''}
            className={inputClasses}
          />
        </div>
        <div>
          <label className={labelClasses}>Phone</label>
          <input name="phone" defaultValue={contact?.phone ?? ''} className={inputClasses} />
        </div>
      </div>

      <label className="flex items-center gap-2 text-[13px] font-medium text-gray-900">
        <input
          type="checkbox"
          name="isPrimary"
          defaultChecked={contact?.isPrimary}
          className="h-4 w-4 rounded border-gray-300 text-evergreen focus:ring-teal"
        />
        Primary contact for this donor
      </label>

      <div>
        <label className={labelClasses}>Notes</label>
        <textarea
          name="notes"
          rows={2}
          defaultValue={contact?.notes ?? ''}
          placeholder="Anything worth remembering about this person"
          className={inputClasses}
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600">{error}</p>
      )}

      <div className="mt-1 flex gap-2.5">
        <SubmitButton pending={isPending}>{contact ? 'Save changes' : 'Add contact'}</SubmitButton>
        <button
          type="button"
          onClick={onDone}
          disabled={isPending}
          className="rounded-xl border border-gray-200 px-5 py-3.5 text-[15px] font-semibold text-gray-600 transition-colors hover:border-gray-300 disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function DeleteContactButton({ donorId, contactId }: { donorId: string; contactId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm('Remove this contact?')) return;
    const formData = new FormData();
    formData.set('donorId', donorId);
    formData.set('id', contactId);
    startTransition(async () => {
      const result: ActionState = await deleteDonorContactAction(undefined, formData);
      if (result?.error) alert(result.error);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="text-gray-400 hover:text-error disabled:opacity-60"
      aria-label="Delete contact"
    >
      <Trash2 size={14} />
    </button>
  );
}
