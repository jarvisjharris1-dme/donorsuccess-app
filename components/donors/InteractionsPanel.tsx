'use client';

import { useState } from 'react';
import { Plus, Mail, Phone, Users, CalendarDays, Send, MessageSquare, StickyNote } from 'lucide-react';
import InteractionForm from './InteractionForm';
import { formatDate } from '@/lib/format';

export type InteractionRow = {
  id: string;
  type: string;
  subject: string | null;
  notes: string | null;
  occurredAt: string;
  loggedByName: string;
};

const TYPE_ICON: Record<string, typeof Mail> = {
  EMAIL: Mail,
  CALL: Phone,
  MEETING: Users,
  EVENT: CalendarDays,
  LETTER: Send,
  TEXT: MessageSquare,
  NOTE: StickyNote,
};

export default function InteractionsPanel({
  donorId,
  interactions,
}: {
  donorId: string;
  interactions: InteractionRow[];
}) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="rounded-[16px] border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-bold text-gray-900">Interactions</h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 text-[13px] font-semibold text-evergreen"
        >
          <Plus size={15} />
          {showForm ? 'Cancel' : 'Log an interaction'}
        </button>
      </div>

      {showForm && (
        <div className="mt-4">
          <InteractionForm donorId={donorId} onDone={() => setShowForm(false)} />
        </div>
      )}

      <div className="mt-4 flex flex-col gap-4">
        {interactions.length === 0 && (
          <p className="py-4 text-sm text-gray-600">No interactions logged yet.</p>
        )}
        {interactions.map((i) => {
          const Icon = TYPE_ICON[i.type] ?? StickyNote;
          return (
            <div key={i.id} className="flex gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100">
                <Icon size={15} className="text-gray-600" />
              </div>
              <div className="flex-1 border-b border-gray-100 pb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">
                    {i.subject || i.type.charAt(0) + i.type.slice(1).toLowerCase()}
                  </span>
                  <span className="text-xs font-medium text-gray-600">
                    {formatDate(i.occurredAt)}
                  </span>
                </div>
                {i.notes && <p className="mt-1 text-sm text-gray-600">{i.notes}</p>}
                <div className="mt-1 text-xs text-gray-600">Logged by {i.loggedByName}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
