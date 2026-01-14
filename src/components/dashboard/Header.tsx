import { RefreshCw, Bell, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StoreSwitcher from './StoreSwitcher';
import UserMenu from './UserMenu';

interface HeaderProps {
  onMenuClick: () => void;
  onNavigate?: (tab: string) => void;
}

const Header = ({ onMenuClick, onNavigate }: HeaderProps) => {
  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="w-5 h-5" />
        </Button>
        
        {/* Store Switcher */}
        <StoreSwitcher />
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* Sync Status - Hidden on small screens */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/20">
          <div className="relative">
            <div className="status-dot success" />
            <div className="absolute inset-0 status-dot success animate-ping opacity-50" />
          </div>
          <span className="text-sm text-success font-medium">Real-time Sync</span>
          <span className="text-xs text-muted-foreground hidden lg:inline">Clover • Chase</span>
        </div>

        {/* Mobile sync indicator */}
        <div className="md:hidden flex items-center gap-1.5 px-2 py-1 rounded-full bg-success/10">
          <div className="status-dot success" />
          <span className="text-xs text-success font-medium">Synced</span>
        </div>

        {/* Refresh */}
        <Button variant="ghost" size="icon" className="hidden sm:flex">
          <RefreshCw className="w-5 h-5 text-muted-foreground" />
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive" />
        </Button>

        {/* User Profile Dropdown */}
        <UserMenu onNavigate={onNavigate} />
      </div>
    </header>
  );
};

export default Header;
