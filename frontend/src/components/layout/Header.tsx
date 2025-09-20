import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/custom-button';
import { 
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
  BellIcon
} from '@heroicons/react/24/outline';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-foreground">
            مرحباً، {user?.username || 'المستخدم'}
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon">
            <BellIcon className="h-5 w-5" />
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