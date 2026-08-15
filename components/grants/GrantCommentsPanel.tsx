'use client';

import { useState, useTransition } from 'react';
import { MessagesSquare, Info, Trash2 } from 'lucide-react';
import {
  addGrantCommentAction,
  deleteGrantCommentAction,
  type ActionState,
} from '@/lib/actions/grant-comments';

export type CommentRow = {
  id: string;
  content: string;
  isSystemGenerated: boolean;
  authorName: string | null;
  createdAt: string;
  isOwn: boolean;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function GrantCommentsPanel({
  grantOpportunityId,
  comments,
  canPost,
  canDeleteAny,
}: {
  grantOpportunityId: string;
  comments: CommentRow[];
  canPost: boolean;
  canDeleteAny: boolean;
}) {
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handlePost(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!content.trim()) return;
    const formData = new FormData();
    formData.set('grantOpportunityId', grantOpportunityId);
    formData.set('content', content);
    setError(null);
    startTransition(async () => {
      const result: ActionState = await addGrantCommentAction(undefined, formData);
      if (result?.error) setError(result.error);
      else setContent('');
    });
  }

  function handleDelete(id: string) {
    if (!confirm('Remove this note?')) return;
    const formData = new FormData();
    formData.set('id', id);
    formData.set('grantOpportunityId', grantOpportunityId);
    startTransition(async () => {
      const result: ActionState = await deleteGrantCommentAction(undefined, formData);
      if (result?.error) alert(result.error);
    });
  }

  return (
    <div className="rounded-[16px] border border-gray-200 bg-white p-6">
      <div className="flex items-center gap-2">
        <MessagesSquare size={16} className="text-gray-900" />
        <h2 className="text-[15px] font-bold text-gray-900">Notes and collaboration</h2>
      </div>

      <div className="mt-4 flex flex-col gap-3.5">
        {comments.length === 0 && (
          <p className="text-sm text-gray-600">No notes yet — activity and updates will show up here.</p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="flex gap-2.5">
            {c.isSystemGenerated ? (
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gray-100">
                <Info size={14} className="text-gray-400" />
              </div>
            ) : (
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-teal/10 text-[11px] font-bold text-evergreen">
                {initials(c.authorName ?? '?')}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className={`text-[13px] ${c.isSystemGenerated ? 'text-gray-500' : 'font-semibold text-gray-900'}`}>
                  {c.isSystemGenerated ? 'System' : c.authorName}
                </span>
                <span className="text-[11px] text-gray-400">{formatDate(c.createdAt)}</span>
              </div>
              <p className={`mt-0.5 text-[13.5px] ${c.isSystemGenerated ? 'text-gray-500' : 'text-gray-700'}`}>
                {c.content}
              </p>
            </div>
            {!c.isSystemGenerated && (c.isOwn || canDeleteAny) && (
              <button
                type="button"
                onClick={() => handleDelete(c.id)}
                className="flex-shrink-0 text-gray-300 hover:text-error"
                aria-label="Remove note"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        ))}
      </div>

      {canPost && (
        <form onSubmit={handlePost} className="mt-4 flex gap-2 border-t border-gray-100 pt-4">
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add a note for the team"
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
          />
          <button
            type="submit"
            disabled={isPending || !content.trim()}
            className="rounded-lg bg-evergreen px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60"
          >
            Post
          </button>
        </form>
      )}
      {error && <p className="mt-2 text-xs font-medium text-error">{error}</p>}
    </div>
  );
}
