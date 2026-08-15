import Link from 'next/link';
import { UserPlus, ListPlus, GitBranch } from 'lucide-react';

const ACTIONS = [
  { href: '/donors/new', label: 'New donor', icon: UserPlus },
  { href: '/tasks/new', label: 'New task', icon: ListPlus },
  { href: '/pipeline/new', label: 'New opportunity', icon: GitBranch },
];

export default function QuickActions() {
  return (
    <div className="flex flex-wrap gap-2.5">
      {ACTIONS.map((a) => (
        <Link
          key={a.href}
          href={a.href}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[13.5px] font-semibold text-gray-900 transition-all hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-card"
        >
          <a.icon size={15} className="text-evergreen" />
          {a.label}
        </Link>
      ))}
    </div>
  );
}
