export type NavItem = {
  href: string;
  label: string;
  icon?: string;
  description?: string;
};

export type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};
