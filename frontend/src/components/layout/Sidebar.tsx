import React, { useState } from 'react';
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
  ChevronLeftIcon,
  ChevronRightIcon,
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

// Tooltip component for collapsed sidebar
const Tooltip: React.FC<{ children: React.ReactNode; content: string }> = ({ children, content }) => {
  if (!content || content.trim() === '') {
    return <>{children}</>;
  }
  
  return (
    <div className="relative group">
      {children}
      <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
        {content}
      </div>
    </div>
  );
};

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
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <aside className={`bg-sidebar transition-all duration-300 h-full flex flex-col ${
      isCollapsed ? 'w-16 sidebar-collapsed' : 'w-64'
    }`}>
      {/* Logo */}
      <div className="px-6 py-4 border-b border-border h-16 flex items-center">
        <div className={`flex items-center w-full ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isCollapsed && (
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-sidebar-primary leading-tight">Stockly</h2>
              <p className="text-xs text-sidebar-foreground/70 leading-tight">نظام إدارة المخزون</p>
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-xl bg-card transition-all shadow-neo hover:shadow-neo-hover active:shadow-neo-inset"
            title={isCollapsed ? 'توسيع الشريط الجانبي' : 'طي الشريط الجانبي'}
          >
            {isCollapsed ? (
              <ChevronLeftIcon className="h-5 w-5 text-sidebar-foreground" />
            ) : (
              <ChevronRightIcon className="h-5 w-5 text-sidebar-foreground" />
            )}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = isActive ? item.activeIcon : item.icon;
            
            return (
              <li key={item.path}>
                {isCollapsed ? (
                  <Tooltip content={item.name}>
                    <NavLink
                      to={item.path}
                      className={`sidebar-link flex items-center justify-center px-3 py-2.5 rounded-xl transition-all ${
                        isActive
                          ? 'bg-card text-sidebar-primary font-medium shadow-neo hover:shadow-neo-hover active:shadow-neo-inset'
                          : 'text-sidebar-foreground hover:bg-card hover:shadow-neo'
                      }`}
                    >
                      <Icon className="sidebar-icon h-5 w-5" />
                    </NavLink>
                  </Tooltip>
                ) : (
                  <NavLink
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                      isActive
                        ? 'bg-card text-sidebar-primary font-medium shadow-neo hover:shadow-neo-hover active:shadow-neo-inset'
                        : 'text-sidebar-foreground hover:bg-card hover:shadow-neo'
                    }`}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className="text-sm">{item.name}</span>
                  </NavLink>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};