type Activity = { when: Date | null; type: 'SUCCESS' | 'INFO' | 'ERROR'; message: string };

type Props = {
  notes: string | null;
  signedAt: Date | null;
  provisionedAt: Date | null;
  invitationSentAt: Date | null;
  activatedAt: Date | null;
  onboardingStartedAt: Date | null;
  fulfilledAt: Date | null;
};

function parseStoredNotes(notes: string | null): Activity[] {
  if (!notes?.trim()) return [];
  return notes.split(/\n+/).map((raw) => raw.trim()).filter(Boolean).map((line) => {
    const match = line.match(/^\[([^\]]+)\]\s+(INFO|SUCCESS|ERROR):\s*(.+)$/);
    if (match) return { when: new Date(match[1]), type: match[2] as Activity['type'], message: match[3] };
    const lower = line.toLowerCase();
    const type: Activity['type'] = lower.includes('failed') || lower.includes('error') || lower.includes('blocked') || lower.includes('paused') ? 'ERROR' : 'INFO';
    return { when: null, type, message: line };
  });
}

export default function OrderActivityTimeline(props: Props) {
  const events: Activity[] = [
    props.signedAt && { when: props.signedAt, type: 'SUCCESS' as const, message: 'Agreement signed.' },
    props.provisionedAt && { when: props.provisionedAt, type: 'SUCCESS' as const, message: 'Customer workspace provisioned and ready for kickoff.' },
    props.invitationSentAt && { when: props.invitationSentAt, type: 'SUCCESS' as const, message: 'Owner invitation successfully delivered.' },
    props.activatedAt && { when: props.activatedAt, type: 'SUCCESS' as const, message: 'Customer activated their Donor Success account.' },
    props.onboardingStartedAt && { when: props.onboardingStartedAt, type: 'INFO' as const, message: '30-day onboarding implementation started.' },
    props.fulfilledAt && { when: props.fulfilledAt, type: 'SUCCESS' as const, message: 'Fulfillment completed and customer marked live.' },
    ...parseStoredNotes(props.notes),
  ].filter(Boolean) as Activity[];

  events.sort((a, b) => {
    if (!a.when && !b.when) return 0;
    if (!a.when) return 1;
    if (!b.when) return -1;
    return b.when.getTime() - a.when.getTime();
  });

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-800/40 p-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-bold text-white">Fulfillment Activity</h2>
          <p className="mt-1 text-xs text-gray-500">Operational history is preserved; resolved failures remain visible as history rather than current blockers.</p>
        </div>
        <span className="text-xs font-bold text-gray-500">{events.length} events</span>
      </div>
      <div className="mt-5 space-y-3">
        {events.length === 0 && <div className="rounded-xl border border-gray-700 p-4 text-sm text-gray-500">No fulfillment activity recorded yet.</div>}
        {events.map((event, index) => {
          const classes = event.type === 'ERROR' ? 'border-red-500/20 bg-red-500/5 text-red-300' : event.type === 'SUCCESS' ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300' : 'border-gray-700 bg-gray-900/30 text-gray-300';
          const dot = event.type === 'ERROR' ? '!' : event.type === 'SUCCESS' ? '✓' : '·';
          return <div key={`${event.message}-${index}`} className={`flex gap-3 rounded-xl border p-4 ${classes}`}><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/20 text-xs font-black">{dot}</span><div className="min-w-0"><div className="text-sm font-semibold">{event.message}</div><div className="mt-1 text-[11px] opacity-60">{event.when ? event.when.toLocaleString() : 'Historical note · timestamp unavailable'}</div></div></div>;
        })}
      </div>
    </section>
  );
}
