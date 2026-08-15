'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export default function CopyInviteLink({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const link = `${window.location.origin}/accept-invite/${token}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-[12.5px] font-semibold text-evergreen"
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? 'Copied' : 'Copy link'}
    </button>
  );
}
