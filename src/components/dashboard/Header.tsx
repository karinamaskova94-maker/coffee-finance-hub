import { RefreshCw, Bell, ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Header = () => {
  const { user } = useAuth();

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">{user?.shopName || 'Coffee Shop'}</h1>
        <p className="text-sm text-muted-foreground">Financial Overview</p>
      </div>

      <div className="flex items-center gap-4">
        {/* Sync Status */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/20">
          <div className="relative">
            <div className="status-dot success" />
            <div className="absolute inset-0 status-dot success animate-ping opacity-50" />
          </div>
          <span className="text-sm text-success font-medium">Real-time Sync</span>
          <span className="text-xs text-muted-foreground">Clover • Chase</span>
        </div>

        {/* Refresh */}
        <button className="p-2 rounded-lg hover:bg-accent transition-colors">
          <RefreshCw className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Notifications */}
        <button className="p-2 rounded-lg hover:bg-accent transition-colors relative">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive" />
        </button>

        {/* Profile */}
        <button className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent transition-colors">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-sm font-medium text-primary">SC</span>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </header>
  );
};

export default Header;
