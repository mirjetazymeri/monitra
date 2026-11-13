import { Activity, AlertTriangle, History, LayoutDashboard, Settings, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/overview", label: "Overview", description: "Health of every monitored service at a glance.", icon: LayoutDashboard },
  { href: "/endpoints", label: "Endpoints", description: "Register and manage the HTTP services you monitor.", icon: Activity },
  { href: "/history", label: "Monitoring History", description: "Every recorded health check, filterable and paginated.", icon: History },
  { href: "/incidents", label: "Incidents", description: "Outages detected from failing checks and their recovery.", icon: AlertTriangle },
  { href: "/settings", label: "Settings", description: "Account, monitoring policy and demo data.", icon: Settings },
];

export function findNavItem(pathname: string): NavItem | undefined {
  return NAV_ITEMS.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
}
