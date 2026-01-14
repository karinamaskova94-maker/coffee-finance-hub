import { useState } from 'react';
import { DollarSign, BarChart3, Percent, Menu, Settings, History, FileText } from 'lucide-react';
import Sidebar from '@/components/dashboard/Sidebar';
import MetricCard from '@/components/dashboard/MetricCard';
import RevenueChart from '@/components/dashboard/RevenueChart';
import BenchmarkGauge from '@/components/dashboard/BenchmarkGauge';
import ReceiptScanner from '@/components/dashboard/ReceiptScanner';
import MobileNav from '@/components/dashboard/MobileNav';
import ReceiptHistory from '@/components/dashboard/ReceiptHistory';
import SettingsPanel from '@/components/dashboard/SettingsPanel';
import Inventory from '@/pages/Inventory';
import { SundayCount } from '@/components/stocktake/SundayCount';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('home');

  const handleNavigate = (tab: string) => {
    setActiveTab(tab);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'inventory':
        return (
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4">Inventory & Recipes</h2>
            <Inventory />
          </section>
        );
      case 'stocktake':
        return (
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4">Weekly Stocktake</h2>
            <SundayCount />
          </section>
        );
      case 'history':
        return (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Receipt History</h2>
              <div className="flex gap-2">
                <ReceiptScanner />
              </div>
            </div>
            <ReceiptHistory />
          </section>
        );
      case 'settings':
        return (
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4">Settings</h2>
            <SettingsPanel />
          </section>
        );
      case 'profit':
        return (
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4">Profitability</h2>
            <div className="grid gap-4">
              {/* Financial Pulse */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <MetricCard
                  title="Net Profit"
                  value="$12,450"
                  subtitle="Clean of Sales Tax & Tips"
                  trend={{ value: 8.2, label: 'vs last week' }}
                  icon={<DollarSign className="w-5 h-5 text-primary" />}
                  variant="success"
                />
                
                <MetricCard
                  title="Revenue Breakdown"
                  value=""
                  icon={<BarChart3 className="w-5 h-5 text-primary" />}
                >
                  <RevenueChart />
                </MetricCard>
                
                <MetricCard
                  title="Food Cost %"
                  value="28.5%"
                  subtitle="Target: 25-30% for healthy margins"
                  icon={<Percent className="w-5 h-5 text-success" />}
                  variant="success"
                />
              </div>

              {/* Benchmarks */}
              <h3 className="text-base font-semibold text-foreground mt-4">Industry Benchmarks</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <BenchmarkGauge
                  label="Labor Cost"
                  current={38}
                  target="30-35%"
                  hint="You are $240 over budget this week"
                  variant="warning"
                />
                
                <BenchmarkGauge
                  label="COGS (F&B)"
                  current={26}
                  target="25-30%"
                  hint="Perfect margins!"
                  variant="success"
                />
                
                <BenchmarkGauge
                  label="Rent & Occupancy"
                  current={18}
                  target="<15%"
                  hint="Rent is eating too much profit"
                  variant="danger"
                />
              </div>
            </div>
          </section>
        );
      case 'reports':
        return (
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4">Reports</h2>
            <div className="grid gap-4">
              <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="font-medium text-foreground mb-2">Profitability Report</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  View your food cost percentages and margin analysis by menu item.
                </p>
                <div className="text-2xl font-bold text-primary">Coming Soon</div>
              </div>
              <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="font-medium text-foreground mb-2">COGS vs Supplies</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Monthly breakdown of food costs versus supply purchases.
                </p>
                <div className="text-2xl font-bold text-primary">Coming Soon</div>
              </div>
            </div>
          </section>
        );
      default:
        // Home - Two big buttons
        return (
          <section className="flex flex-col h-full">
            {/* Quick Actions - Two Big Buttons */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <ReceiptScanner variant="large" />
              
              <Button
                onClick={() => setActiveTab('profit')}
                className="h-32 flex flex-col items-center justify-center gap-3 text-lg font-semibold bg-success hover:bg-success/90 text-success-foreground shadow-lg"
                size="lg"
              >
                <BarChart3 className="w-10 h-10" />
                <span>View Profit</span>
              </Button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <MetricCard
                title="Today's COGS"
                value="$245"
                subtitle="3 receipts scanned"
                icon={<DollarSign className="w-4 h-4 text-primary" />}
              />
              <MetricCard
                title="Food Cost %"
                value="28.5%"
                subtitle="On target"
                icon={<Percent className="w-4 h-4 text-success" />}
                variant="success"
              />
            </div>

            {/* Recent Activity */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-muted-foreground">Recent Receipts</h3>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('history')}>
                  View All
                </Button>
              </div>
              <ReceiptHistory limit={3} compact />
            </div>
          </section>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Header with menu */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border h-14 flex items-center px-4 gap-3">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72">
            <SheetHeader>
              <SheetTitle className="text-left">Menu</SheetTitle>
            </SheetHeader>
            <nav className="mt-6 space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3"
                onClick={() => setActiveTab('history')}
              >
                <History className="w-5 h-5" />
                Receipt History
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3"
                onClick={() => setActiveTab('reports')}
              >
                <FileText className="w-5 h-5" />
                Reports
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3"
                onClick={() => setActiveTab('settings')}
              >
                <Settings className="w-5 h-5" />
                Settings
              </Button>
            </nav>
          </SheetContent>
        </Sheet>
        
        <h1 className="font-bold text-lg flex-1">Margin Mind</h1>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setActiveTab('settings')}
        >
          <Settings className="w-5 h-5" />
        </Button>
      </header>
      
      {/* Main content */}
      <main className="pt-16 pb-28 lg:pb-6 lg:pl-0">
        <div className="p-4 sm:p-6">
          {renderContent()}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default Dashboard;
