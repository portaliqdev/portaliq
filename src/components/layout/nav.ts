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
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, section: "War Room" },
  { label: "Transfer Portal", href: "/portal", icon: Radar, section: "Scouting" },
  { label: "Recruiting Board", href: "/board", icon: Columns3, section: "Scouting" },
  { label: "Team Needs", href: "/needs", icon: Target, section: "Roster" },
  { label: "Reports", href: "/reports", icon: FileText, section: "Output" },
  { label: "AI Assistant", href: "/assistant", icon: Sparkles, section: "Intelligence" },
  { label: "Settings", href: "/settings", icon: Settings, section: "Admin" },
];
