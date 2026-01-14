import { useState } from 'react';
import { User, Settings, LogOut, FileText, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';

interface UserMenuProps {
  onNavigate?: (tab: string) => void;
}

const UserMenu = ({ onNavigate }: UserMenuProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getInitials = () => {
    if (!user?.email) return 'U';
    return user.email.substring(0, 2).toUpperCase();
  };

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    await logout();
    navigate('/login');
  };

  const handleNavigate = (tab: string) => {
    setMobileMenuOpen(false);
    onNavigate?.(tab);
  };

  // Mobile Action Sheet
  if (isMobile) {
    return (
      <>
        {/* Mobile Avatar Button - Always visible, 44x44 for touch */}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex items-center justify-center w-11 h-11 rounded-full bg-foreground relative z-[9999]"
          aria-label="Open user menu"
        >
          <span className="text-background text-sm font-bold">
            {getInitials()}
          </span>
        </button>

        {/* Mobile Action Sheet Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-[10000]">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            
            {/* Slide-up Action Sheet */}
            <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl safe-area-bottom animate-in slide-in-from-bottom duration-300">
              {/* Handle bar */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
              </div>
              
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <div>
                  <p className="text-lg font-semibold text-foreground">My Account</p>
                  <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                    {user?.email || 'Not signed in'}
                  </p>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-muted"
                >
                  <X className="w-5 h-5 text-foreground" />
                </button>
              </div>

              {/* Menu Items - Large touch targets */}
              <div className="p-4 space-y-2">
                <button
                  onClick={() => handleNavigate('profile')}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted active:bg-muted transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-lg font-medium text-foreground">My Profile</span>
                </button>

                <button
                  onClick={() => handleNavigate('reports')}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted active:bg-muted transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-lg font-medium text-foreground">Reports</span>
                </button>

                <button
                  onClick={() => handleNavigate('settings')}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted active:bg-muted transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Settings className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-lg font-medium text-foreground">Settings</span>
                </button>

                {/* Logout - Red and prominent */}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-red-50 hover:bg-red-100 active:bg-red-100 transition-colors mt-4"
                >
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                    <LogOut className="w-6 h-6 text-red-600" />
                  </div>
                  <span className="text-lg font-bold text-red-600">Log out</span>
                </button>
              </div>

              {/* Extra padding for home indicator */}
              <div className="h-6" />
            </div>
          </div>
        )}
      </>
    );
  }

  // Desktop Dropdown Menu
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button 
          className="flex items-center gap-2 p-1.5 sm:p-2 rounded-xl hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 relative z-[9999]"
          aria-label="User menu"
        >
          <Avatar className="w-10 h-10 border-2 border-foreground/20">
            <AvatarFallback className="bg-foreground text-background text-sm font-bold">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-56 z-[9999] bg-white border border-border shadow-lg"
        sideOffset={8}
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none text-foreground">My Account</p>
            <p className="text-xs leading-none text-muted-foreground truncate">
              {user?.email || 'Not signed in'}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onNavigate?.('profile')} className="cursor-pointer">
          <User className="mr-2 h-4 w-4" />
          <span>My Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onNavigate?.('reports')} className="cursor-pointer">
          <FileText className="mr-2 h-4 w-4" />
          <span>Reports</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onNavigate?.('settings')} className="cursor-pointer">
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={handleLogout} 
          className="cursor-pointer text-red-600 font-semibold hover:text-red-700 hover:bg-red-50 focus:text-red-700 focus:bg-red-50"
        >
          <LogOut className="mr-2 h-4 w-4 text-red-600" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;
