'use client';

import { useState, useTransition } from 'react';
import SubmitButton from '@/components/SubmitButton';
import { updateUserProfileAction, type ActionState } from '@/lib/actions/settings';

export default function UserProfileForm({ name, email }: { name: string; email: string }) {
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const formData = new FormData(e.currentTarget); setMessage(null);
    startTransition(async () => { const result: ActionState = await updateUserProfileAction(undefined, formData); if (result?.error) setMessage({ type: 'error', text: result.error }); else if (result?.success) setMessage({ type: 'success', text: result.success }); });
  }
  return <form onSubmit={handleSubmit} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><div><label className="mb-1.5 block text-[13px] font-semibold text-gray-900">Display name</label><input name="name" required maxLength={100} defaultValue={name} className="w-full rounded-[10px] border border-gray-200 px-3.5 py-3 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20" /></div><div><label className="mb-1.5 block text-[13px] font-semibold text-gray-900">Login email</label><input value={email} disabled className="w-full rounded-[10px] border border-gray-200 bg-gray-50 px-3.5 py-3 text-sm text-gray-500" /><p className="mt-1 text-xs text-gray-500">Contact an administrator to change your login email.</p></div></div>{message && <p className={`rounded-lg px-3.5 py-2.5 text-sm font-medium ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-success/10 text-success'}`}>{message.text}</p>}<SubmitButton pending={isPending}>Save profile</SubmitButton></form>;
}
