'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import InlineTaskForm from './InlineTaskForm';
import TaskRow, { type TaskRowData } from './TaskRow';

export default function RelatedTasksPanel({
  donorId,
  opportunityId,
  grantOpportunityId,
  tasks,
  users,
  currentUserId,
  canDelete,
}: {
  donorId?: string;
  opportunityId?: string;
  grantOpportunityId?: string;
  tasks: TaskRowData[];
  users: { id: string; name: string | null; email: string }[];
  currentUserId: string;
  canDelete: boolean;
}) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="rounded-[16px] border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-bold text-gray-900">Tasks</h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 text-[13px] font-semibold text-evergreen"
        >
          <Plus size={15} />
          {showForm ? 'Cancel' : 'Add task'}
        </button>
      </div>

      {showForm && (
        <div className="mt-4">
          <InlineTaskForm
            donorId={donorId}
            opportunityId={opportunityId}
            grantOpportunityId={grantOpportunityId}
            users={users}
            currentUserId={currentUserId}
            onDone={() => setShowForm(false)}
          />
        </div>
      )}

      <div className="mt-3 flex flex-col divide-y divide-gray-50">
        {tasks.length === 0 && <p className="py-4 text-sm text-gray-600">No tasks yet.</p>}
        {tasks.map((t) => (
          <TaskRow key={t.id} task={t} showContext={false} canDelete={canDelete} />
        ))}
      </div>
    </div>
  );
}
