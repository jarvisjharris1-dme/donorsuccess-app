import Link from 'next/link';
import { Network, User, Landmark, ArrowRightLeft } from 'lucide-react';
import { BOARD_ROLE_LABELS } from '@/lib/board-engagement';

export type RelationshipGraphData = {
  assignedToName: string | null;
  boardTerms: { id: string; boardName: string; role: string; isActive: boolean }[];
  introducedBy: { boardTermId: string; introducerName: string; status: string }[];
  introductionsMade: { id: string; prospectName: string; prospectId: string; status: string }[];
};

function Row({
  icon: Icon,
  label,
  detail,
  href,
}: {
  icon: typeof User;
  label: string;
  detail: string;
  href?: string;
}) {
  const content = (
    <div className="flex items-start gap-3 py-2.5">
      <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
        <Icon size={14} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500">{detail}</p>
      </div>
    </div>
  );
  return href ? (
    <Link href={href} className="block hover:bg-gray-50">
      {content}
    </Link>
  ) : (
    content
  );
}

export default function RelationshipGraphPanel({ data }: { data: RelationshipGraphData }) {
  const hasAnything =
    data.assignedToName || data.boardTerms.length > 0 || data.introducedBy.length > 0 || data.introductionsMade.length > 0;

  return (
    <div className="rounded-[16px] border border-gray-200 bg-white p-6">
      <div className="flex items-center gap-2">
        <Network size={16} className="text-gray-900" />
        <h2 className="text-[15px] font-bold text-gray-900">Relationships</h2>
      </div>

      <div className="mt-2 flex flex-col divide-y divide-gray-50">
        {!hasAnything && (
          <p className="py-3 text-sm text-gray-600">
            No staff, board, or introduction connections on record for this donor yet.
          </p>
        )}

        {data.assignedToName && <Row icon={User} label={data.assignedToName} detail="Assigned staff member" />}

        {data.boardTerms.map((t) => (
          <Row
            key={t.id}
            icon={Landmark}
            label={`${BOARD_ROLE_LABELS[t.role as keyof typeof BOARD_ROLE_LABELS] ?? t.role} — ${t.boardName}`}
            detail={t.isActive ? 'Active board member' : 'Former board member'}
            href={`/board/members/${t.id}`}
          />
        ))}

        {data.introducedBy.map((intro) => (
          <Row
            key={intro.boardTermId}
            icon={ArrowRightLeft}
            label={`Introduced by ${intro.introducerName}`}
            detail={`Board introduction · ${intro.status.replace('_', ' ').toLowerCase()}`}
            href={`/board/members/${intro.boardTermId}`}
          />
        ))}

        {data.introductionsMade.map((intro) => (
          <Row
            key={intro.id}
            icon={ArrowRightLeft}
            label={`Introduced ${intro.prospectName}`}
            detail={`Board introduction made · ${intro.status.replace('_', ' ').toLowerCase()}`}
            href={`/donors/${intro.prospectId}`}
          />
        ))}
      </div>
    </div>
  );
}
