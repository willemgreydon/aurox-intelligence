export type NavItem = {
  href: string;
  label: string;
  icon?: string;
};

export type NavGroup = {
  id: 'markets' | 'analytics' | 'invest' | 'ops';
  label: string;
  items: NavItem[];
};
