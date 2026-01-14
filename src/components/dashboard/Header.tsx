import { RefreshCw, Bell, Menu, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StoreSwitcher from './StoreSwitcher';
import UserMenu from './UserMenu';

interface HeaderProps {
  onMenuClick: () => void;
  onNavigate?: (tab: string) => void;
}

const Header = ({ onMenuClick, onNavigate }: HeaderProps) => {
  return (
    <header className="h-16 border-b-2 border-border bg-white flex items-center justify-between px-3 sm:px-6 fixed top-0 left-0 right-0 z-[100]">
      {/* Left side - Logo and Menu */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden w-10 h-10"
          onClick={onMenuClick}
        >
          <Menu className="w-5 h-5" />
        </Button>
        
        {/* App Logo - Always visible */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Receipt className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-foreground hidden sm:block">TaxTrack</span>
        </div>

        {/* Store Switcher - Hidden on very small screens */}
        <div className="hidden xs:block sm:ml-2">
          <StoreSwitcher />
        </div>
      </div>

      {/* Right side - Actions and Avatar */}
      <div className="flex items-center gap-1 sm:gap-3">
        {/* Sync Status - Hidden on mobile */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/20">
          <div className="relative">
            <div className="status-dot success" />
            <div className="absolute inset-0 status-dot success animate-ping opacity-50" />
          </div>
          <span className="text-sm text-success font-medium">Real-time Sync</span>
          <span className="text-xs text-muted-foreground hidden xl:inline">Clover • Chase</span>
        </div>

        {/* Refresh - Hidden on mobile */}
        <Button variant="ghost" size="icon" className="hidden md:flex w-10 h-10">
          <RefreshCw className="w-5 h-5 text-muted-foreground" />
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative w-10 h-10">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive" />
        </Button>

        {/* User Profile - Always visible, 44x44 touch target */}
        <UserMenu onNavigate={onNavigate} />
      </div>
    </header>
  );
};

export default Header;
