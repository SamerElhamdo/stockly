import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  CubeIcon,
  UsersIcon,
  DocumentTextIcon,
  ArrowUturnLeftIcon,
  CreditCardIcon,
  TagIcon,
  ArchiveBoxIcon,
  UserGroupIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  CubeIcon as CubeIconSolid,
  UsersIcon as UsersIconSolid,
  DocumentTextIcon as DocumentTextIconSolid,
  ArrowUturnLeftIcon as ArrowUturnLeftIconSolid,
  CreditCardIcon as CreditCardIconSolid,
  TagIcon as TagIconSolid,
  ArchiveBoxIcon as ArchiveBoxIconSolid,
  UserGroupIcon as UserGroupIconSolid,
  Cog6ToothIcon as Cog6ToothIconSolid,
} from '@heroicons/react/24/solid';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<React.ComponentProps<'svg'>>;
  activeIcon: React.ComponentType<React.ComponentProps<'svg'>>;
}

const navItems: NavItem[] = [
  {
    name: 'لوحة التحكم',
    path: '/dashboard',
    icon: HomeIcon,
    activeIcon: HomeIconSolid,
  },
  {
    name: 'المنتجات',
    path: '/products',
    icon: CubeIcon,
    activeIcon: CubeIconSolid,
  },
  {
    name: 'العملاء',
    path: '/customers',
    icon: UsersIcon,
    activeIcon: UsersIconSolid,
  },
  {
    name: 'الفئات',
    path: '/categories',
    icon: TagIcon,
    activeIcon: TagIconSolid,
  },
  {
    name: 'الفواتير',
    path: '/invoices',
    icon: DocumentTextIcon,
    activeIcon: DocumentTextIconSolid,
  },
  {
    name: 'المرتجعات',
    path: '/returns',
    icon: ArrowUturnLeftIcon,
    activeIcon: ArrowUturnLeftIconSolid,
  },
  {
    name: 'المدفوعات',
    path: '/payments',
    icon: CreditCardIcon,
    activeIcon: CreditCardIconSolid,
  },
  {
    name: 'الأرشيف',
    path: '/archive',
    icon: ArchiveBoxIcon,
    activeIcon: ArchiveBoxIconSolid,
  },
  {
    name: 'المستخدمون',
    path: '/users',
    icon: UserGroupIcon,
    activeIcon: UserGroupIconSolid,
  },
  {
    name: 'الإعدادات',
    path: '/settings',
    icon: Cog6ToothIcon,
    activeIcon: Cog6ToothIconSolid,
  },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();

  return (
    <aside className="w-64 bg-sidebar border-l border-sidebar-border">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <h2 className="text-2xl font-bold text-sidebar-primary">Stockly</h2>
        <p className="text-sm text-sidebar-foreground/70 mt-1">نظام إدارة المخزون</p>
      </div>

      {/* Navigation */}
      <nav className="p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = isActive ? item.activeIcon : item.icon;
            
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-primary font-medium'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  }`}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className="text-sm">{item.name}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};