import { LayoutDashboard, History, FileText, Settings } from 'lucide-react';

interface MobileNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'history', icon: History, label: 'History' },
  { id: 'reports', icon: FileText, label: 'Reports' },
  { id: 'settings', icon: Settings, label: 'Settings' },
];

const MobileNav = ({ activeTab, onTabChange }: MobileNavProps) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[9998] lg:hidden bg-white border-t-2 border-border shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      {/* Navigation items */}
      <div className="flex items-center justify-around h-16 px-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`
                flex flex-col items-center justify-center flex-1 h-full gap-0.5 py-2
                transition-colors duration-200 relative min-w-[60px]
                ${isActive 
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground active:text-foreground'
                }
              `}
            >
              <item.icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5px]' : ''}`} />
              <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
      {/* Safe area padding for iPhone home indicator */}
      <div className="h-[env(safe-area-inset-bottom,0px)] bg-white" />
    </nav>
  );
};

export default MobileNav;
