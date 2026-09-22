import { BarChart3, BellRing, Briefcase, Cable, Layers, LineChart, ServerCog, ShieldCheck, TriangleAlert, CalendarClock, Cog, Database, GitBranch, LayoutDashboard, LayoutGrid, ListTree, Package, Siren, Sparkles, Tablet, TowerControl, TrendingDown, type LucideIcon } from 'lucide-react';

export interface NavItem { to: string; label: string; icon: LucideIcon }
export interface NavSection { label: string; icon: LucideIcon; items: NavItem[] }

export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Operations', icon: LayoutDashboard, items: [
      { to: '/', label: 'Control Tower', icon: TowerControl },
      { to: '/executive', label: 'Executive View', icon: Briefcase },
      { to: '/oee', label: 'OEE Explorer', icon: Layers },
      { to: '/andon', label: 'Andon Board', icon: LayoutGrid },
      { to: '/events', label: 'Andon Events', icon: BellRing },
      { to: '/machines', label: 'Machines', icon: Cog },
      { to: '/quality', label: 'Quality', icon: ShieldCheck },
    ],
  },
  {
    label: 'Intelligence', icon: TrendingDown, items: [
      { to: '/downtime', label: 'Downtime Analytics', icon: BarChart3 },
      { to: '/losses', label: 'Loss Intelligence', icon: TrendingDown },
      { to: '/trends', label: 'Trends & Reports', icon: LineChart },
      { to: '/insights', label: 'AI Insights', icon: Sparkles },
    ],
  },
  {
    label: 'Master Data', icon: Database, items: [
      { to: '/master/states', label: 'Machine States', icon: GitBranch },
      { to: '/master/reasons', label: 'Downtime Reasons', icon: ListTree },
      { to: '/master/rules', label: 'Andon Rules', icon: Siren },
      { to: '/master/alerts', label: 'Alert Rules', icon: TriangleAlert },
      { to: '/master/products', label: 'Products & Cycle Times', icon: Package },
      { to: '/master/calendar', label: 'Shifts & Calendar', icon: CalendarClock },
      { to: '/master/integration', label: 'Integration Mapping', icon: Cable },
    ],
  },
  { label: 'System', icon: ServerCog, items: [{ to: '/integration', label: 'Integration Console', icon: ServerCog }] },
];
export const OPERATOR_NAV: NavItem = { to: '/operator', label: 'Operator Terminal', icon: Tablet };

const NAV_ITEMS = NAV_SECTIONS.flatMap((s) => s.items);
export const isActive = (to: string, pathname: string) => (to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`));
export const currentNav = (pathname: string) => NAV_ITEMS.find((i) => isActive(i.to, pathname));
