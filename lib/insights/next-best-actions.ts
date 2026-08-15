import { RetentionRisk } from '@prisma/client';

export type NextBestAction = {
  id: string;
  priority: 'high' | 'medium' | 'low';
  text: string;
};

const DAY = 86_400_000;

/**
 * Deterministic "next best action" suggestions for a donor, based on
 * their actual data — not an LLM call. See the note in the dashboard/
 * donor-page build: this is intentionally a rules engine (retention
 * risk, contact recency, overdue tasks, opportunity/milestone timing,
 * annual-giving renewal windows), which is fast, free, and honest about
 * what it is. A true LLM-generated version could sit behind this same
 * component later if wanted.
 */
export function getNextBestActions(input: {
  retentionRisk: RetentionRisk | null;
  lastGiftDate: Date | null;
  lastInteractionDate: Date | null;
  overdueTaskCount: number;
  openOpportunities: { name: string; expectedCloseDate: Date | null }[];
  activePlanMilestones: { title: string; dueDate: Date | null; status: string }[];
}): NextBestAction[] {
  const now = Date.now();
  const actions: NextBestAction[] = [];

  if (input.retentionRisk === RetentionRisk.HIGH || input.retentionRisk === RetentionRisk.CRITICAL) {
    actions.push({
      id: 'risk',
      priority: 'high',
      text: `Retention risk is ${input.retentionRisk === RetentionRisk.CRITICAL ? 'critical' : 'high'} — a personal check-in this week could make a real difference.`,
    });
  }

  if (input.overdueTaskCount > 0) {
    actions.push({
      id: 'overdue-tasks',
      priority: 'high',
      text: `${input.overdueTaskCount} overdue task${input.overdueTaskCount === 1 ? '' : 's'} on this donor — worth clearing before they slip further.`,
    });
  }

  const daysSinceContact = input.lastInteractionDate
    ? Math.floor((now - input.lastInteractionDate.getTime()) / DAY)
    : null;
  if (daysSinceContact === null) {
    actions.push({
      id: 'no-contact',
      priority: 'medium',
      text: 'No interactions logged yet — a first touchpoint would start building the relationship history.',
    });
  } else if (daysSinceContact > 60) {
    actions.push({
      id: 'stale-contact',
      priority: daysSinceContact > 120 ? 'high' : 'medium',
      text: `It's been ${daysSinceContact} days since the last logged contact — a quick check-in could help.`,
    });
  }

  for (const opp of input.openOpportunities) {
    if (!opp.expectedCloseDate) continue;
    const daysToClose = Math.floor((opp.expectedCloseDate.getTime() - now) / DAY);
    if (daysToClose < 0) {
      const overdueDays = Math.abs(daysToClose);
      actions.push({
        id: `opp-overdue-${opp.name}`,
        priority: 'high',
        text: `"${opp.name}" was expected to close ${overdueDays} day${overdueDays === 1 ? '' : 's'} ago — update the stage or push the target date.`,
      });
    } else if (daysToClose <= 14) {
      actions.push({
        id: `opp-soon-${opp.name}`,
        priority: 'high',
        text: `"${opp.name}" is expected to close in ${daysToClose} day${daysToClose === 1 ? '' : 's'} — confirm next steps.`,
      });
    }
  }

  for (const m of input.activePlanMilestones) {
    if (m.status === 'DONE' || !m.dueDate) continue;
    const daysToDue = Math.floor((m.dueDate.getTime() - now) / DAY);
    if (daysToDue < 0) {
      actions.push({
        id: `milestone-overdue-${m.title}`,
        priority: 'medium',
        text: `Success plan milestone "${m.title}" is overdue.`,
      });
    } else if (daysToDue <= 7) {
      actions.push({
        id: `milestone-soon-${m.title}`,
        priority: 'medium',
        text: `Success plan milestone "${m.title}" is due in ${daysToDue} day${daysToDue === 1 ? '' : 's'}.`,
      });
    }
  }

  if (input.lastGiftDate) {
    const daysSinceGift = Math.floor((now - input.lastGiftDate.getTime()) / DAY);
    if (daysSinceGift >= 330 && daysSinceGift <= 420) {
      actions.push({
        id: 'renewal-window',
        priority: 'medium',
        text: "It's been about a year since the last gift — this is a good window for a renewal ask.",
      });
    }
  }

  const priorityOrder = { high: 0, medium: 1, low: 2 } as const;
  return actions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]).slice(0, 4);
}
