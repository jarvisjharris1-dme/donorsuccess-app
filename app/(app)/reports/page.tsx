import Link from 'next/link';
import { TrendingUp, DollarSign, PieChart, GitBranch, AlertTriangle, ArrowRight, FileCheck, HandCoins, LayoutGrid, HeartHandshake } from 'lucide-react';

const REPORTS = [
  {
    href: '/reports/retention',
    icon: TrendingUp,
    color: 'text-success bg-success/10',
    title: 'Donor Retention',
    body: 'Who gave again this year vs. who lapsed, with the full donor lists behind the headline rate.',
  },
  {
    href: '/reports/cohorts',
    icon: LayoutGrid,
    color: 'text-sky bg-sky/10',
    title: 'Cohort Analysis',
    body: 'Donors grouped by the year of their first gift, tracking retention and revenue for that group in every year since.',
  },
  {
    href: '/reports/volunteer-impact',
    icon: HeartHandshake,
    color: 'text-evergreen bg-evergreen/10',
    title: 'Volunteer Impact',
    body: 'Total hours and estimated value contributed, top volunteers, and the monthly trend — for grant reporting and impact storytelling.',
  },
  {
    href: '/reports/giving-summary',
    icon: DollarSign,
    color: 'text-evergreen bg-evergreen/10',
    title: 'Giving Summary',
    body: 'Revenue by month over the last year, broken down by donor segment.',
  },
  {
    href: '/reports/segmentation',
    icon: PieChart,
    color: 'text-sky bg-sky/10',
    title: 'Donor Segmentation',
    body: 'Donor count and total giving by segment and donor type.',
  },
  {
    href: '/reports/pipeline',
    icon: GitBranch,
    color: 'text-warning bg-warning/10',
    title: 'Major Gifts Pipeline',
    body: 'Open pipeline value by stage, weighted forecast, and historical win rate.',
  },
  {
    href: '/reports/at-risk',
    icon: AlertTriangle,
    color: 'text-error bg-error/10',
    title: 'Lapsed & At-Risk Donors',
    body: 'A ready-to-work outreach list of high and critical risk donors, sorted by urgency.',
  },
  {
    href: '/reports/grants-portfolio',
    icon: HandCoins,
    color: 'text-evergreen bg-evergreen/10',
    title: 'Grants Portfolio',
    body: 'Every grant across the organization — totals awarded and disbursed, by stage, and overdue compliance at a glance.',
  },
  {
    href: '/reports/grant-compliance',
    icon: FileCheck,
    color: 'text-sky bg-sky/10',
    title: 'Grant Compliance Report',
    body: 'Full requirements and compliance status for one specific grant, ready to export or share.',
  },
];

export default function ReportsPage() {
  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-extrabold text-gray-900">Reports</h1>
      <p className="mt-1 text-sm text-gray-600">
        Standard reports built from your donor and gift data. Each one exports to CSV.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {REPORTS.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            className="group flex flex-col rounded-[16px] border border-gray-200 bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-card"
          >
            <div className={`flex h-11 w-11 items-center justify-center rounded-[12px] ${r.color}`}>
              <r.icon size={20} />
            </div>
            <h2 className="mt-4 text-[16px] font-bold text-gray-900">{r.title}</h2>
            <p className="mt-1.5 text-sm text-gray-600">{r.body}</p>
            <span className="mt-4 flex items-center gap-1 text-[13px] font-semibold text-evergreen">
              View report
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
