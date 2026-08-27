import {
  LayoutDashboard,
  Users,
  GitBranch,
  Megaphone,
  CheckSquare,
  Target,
  BarChart3,
  Settings,
  HelpCircle,
  HandCoins,
  LifeBuoy,
  Landmark,
  Sparkles,
  Building2,
  type LucideIcon,
} from 'lucide-react';

export type NavItem = { label: string; href: string; icon: LucideIcon };

export const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Donors', href: '/donors', icon: Users },
  { label: 'Pipeline', href: '/pipeline', icon: GitBranch },
  { label: 'Grants', href: '/grants', icon: HandCoins },
  { label: 'Allocations', href: '/funding-rounds', icon: Building2 },
  { label: 'Grantees', href: '/grantees', icon: Users },
  { label: 'Success Plans', href: '/plans', icon: Target },
  { label: 'Campaigns', href: '/campaigns', icon: Megaphone },
  { label: 'Board', href: '/board', icon: Landmark },
  { label: 'Tasks', href: '/tasks', icon: CheckSquare },
  { label: 'Reports', href: '/reports', icon: BarChart3 },
  { label: 'Jarvis', href: '/insights', icon: Sparkles },
  { label: 'Success Hub', href: '/help', icon: HelpCircle },
  { label: 'Support', href: '/support', icon: LifeBuoy },
  { label: 'Settings', href: '/settings', icon: Settings },
];

/** Matches nested routes too — e.g. /donors/abc123/edit still highlights "Donors". */
export function isNavItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function currentNavLabel(pathname: string): string {
  return navItems.find((item) => isNavItemActive(pathname, item.href))?.label ?? 'Dashboard';
}
