import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Radar,
  Columns3,
  Target,
  FileText,
  Sparkles,
  Settings,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Short eyebrow shown in the page header */
  section: string;
  /** Optional count chip shown at the right of the nav row */
  count?: number;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/app", icon: LayoutDashboard, section: "War Room" },
  { label: "Transfer Portal", href: "/app/portal", icon: Radar, section: "Scouting", count: 312 },
  { label: "Recruiting Board", href: "/app/board", icon: Columns3, section: "Scouting" },
  { label: "Team Needs", href: "/app/needs", icon: Target, section: "Roster" },
  { label: "Reports", href: "/app/reports", icon: FileText, section: "Output" },
  { label: "AI Assistant", href: "/app/assistant", icon: Sparkles, section: "Intelligence", count: 2 },
  { label: "Settings", href: "/app/settings", icon: Settings, section: "Admin" },
];
