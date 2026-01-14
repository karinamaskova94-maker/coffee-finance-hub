import { User, Settings, LogOut, FileText } from 'lucide-react';
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

interface UserMenuProps {
  onNavigate?: (tab: string) => void;
}

const UserMenu = ({ onNavigate }: UserMenuProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const getInitials = () => {
    if (!user?.email) return 'U';
    return user.email.substring(0, 2).toUpperCase();
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSettings = () => {
    onNavigate?.('settings');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button 
          className="flex items-center gap-2 p-1.5 sm:p-2 rounded-xl hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 relative z-[9999]"
          aria-label="User menu"
        >
          <Avatar className="w-9 h-9 sm:w-10 sm:h-10 border-2 border-foreground/20">
            <AvatarFallback className="bg-foreground text-background text-sm font-bold">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-56 z-[9999] bg-card border border-border shadow-lg"
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
        <DropdownMenuItem onClick={handleSettings} className="cursor-pointer">
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
