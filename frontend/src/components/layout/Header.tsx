import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/custom-button';
import { 
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
  BellIcon,
  SunIcon,
  MoonIcon
} from '@heroicons/react/24/outline';
import { useTheme } from 'next-themes';
import { useCompany } from '../../contexts/CompanyContext';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { profile } = useCompany();

  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {profile?.logo_url && (
            <div className="h-8 w-8 rounded-lg bg-muted border border-border overflow-hidden">
              <img src={profile.logo_url} alt="شعار" className="h-full w-full object-contain" />
            </div>
          )}
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-foreground">مرحباً، {user?.username || 'المستخدم'}</h1>
              {profile?.company_name && (
                <span className="text-sm text-muted-foreground">{profile.company_name}</span>
              )}
            </div>
            {profile?.navbar_message && (
              <span className="text-xs text-muted-foreground">{profile.navbar_message}</span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon">
            <BellIcon className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? (
              <SunIcon className="h-5 w-5" />
            ) : (
              <MoonIcon className="h-5 w-5" />
            )}
          </Button>
          
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted">
            <UserCircleIcon className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium">{user?.username}</span>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            className="gap-2"
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4" />
            خروج
          </Button>
        </div>
      </div>
    </header>
  );
};