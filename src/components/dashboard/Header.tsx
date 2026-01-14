import { RefreshCw, Bell, ChevronDown, Menu } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header = ({ onMenuClick }: HeaderProps) => {
  const { user } = useAuth();

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
        
        <div>
          <h1 className="text-base sm:text-lg font-semibold text-foreground">{user?.shopName || 'Coffee Shop'}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Financial Overview</p>
        </div>
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

        {/* Profile */}
        <button className="flex items-center gap-2 p-1.5 sm:p-2 rounded-xl hover:bg-accent transition-colors">
          <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
            <span className="text-sm font-medium text-primary">SC</span>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground hidden sm:block" />
        </button>
      </div>
    </header>
  );
};

export default Header;