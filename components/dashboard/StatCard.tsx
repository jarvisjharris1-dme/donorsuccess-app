import { type LucideIcon } from 'lucide-react';

export default function StatCard({
  icon: Icon,
  label,
  value,
  accent = 'evergreen',
  delay = 0,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  accent?: 'evergreen' | 'sky' | 'warning' | 'success';
  delay?: number;
}) {
  const accentClasses: Record<string, string> = {
    evergreen: 'bg-evergreen/10 text-evergreen',
    sky: 'bg-sky/10 text-sky',
    warning: 'bg-warning/10 text-warning',
    success: 'bg-success/10 text-success',
  };

  return (
    <div
      className="fade-up rounded-[16px] border border-gray-200 bg-white p-5 transition-shadow hover:shadow-card"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-[10px] ${accentClasses[accent]}`}>
        <Icon size={19} />
      </div>
      <div className="mt-3.5 font-display text-[26px] font-extrabold leading-none text-gray-900">
        {value}
      </div>
      <div className="mt-1.5 text-[13px] font-medium text-gray-600">{label}</div>
    </div>
  );
}
