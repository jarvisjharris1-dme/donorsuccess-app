import {
  Rocket,
  Users,
  Target,
  Megaphone,
  Mail,
  BarChart3,
  Cloud,
  Settings,
  HandCoins,
  type LucideIcon,
} from 'lucide-react';

export type CategoryMeta = {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
};

export const CATEGORY_META: Record<string, CategoryMeta> = {
  'Getting Started': { icon: Rocket, iconBg: 'bg-teal/10', iconColor: 'text-teal' },
  Donors: { icon: Users, iconBg: 'bg-[#EEEDFE]', iconColor: 'text-[#3C3489]' },
  'Pipeline & Success Plans': { icon: Target, iconBg: 'bg-[#FAECE7]', iconColor: 'text-[#712B13]' },
  Grants: { icon: HandCoins, iconBg: 'bg-[#E6F1FB]', iconColor: 'text-[#0C447C]' },
  Campaigns: { icon: Megaphone, iconBg: 'bg-[#FBEAF0]', iconColor: 'text-[#72243E]' },
  'Email & Communication': { icon: Mail, iconBg: 'bg-sky/10', iconColor: 'text-sky' },
  Reports: { icon: BarChart3, iconBg: 'bg-[#EAF3DE]', iconColor: 'text-[#27500A]' },
  'Salesforce Integration': { icon: Cloud, iconBg: 'bg-warning/10', iconColor: 'text-warning' },
  'Team & Settings': { icon: Settings, iconBg: 'bg-gray-100', iconColor: 'text-gray-600' },
};
