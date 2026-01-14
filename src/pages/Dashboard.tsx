import { useState } from 'react';
import { DollarSign, BarChart3, Percent } from 'lucide-react';
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';
import MetricCard from '@/components/dashboard/MetricCard';
import RevenueChart from '@/components/dashboard/RevenueChart';
import BenchmarkGauge from '@/components/dashboard/BenchmarkGauge';
import ReviewItem from '@/components/dashboard/ReviewItem';
import ReceiptScanner from '@/components/dashboard/ReceiptScanner';
import MobileNav from '@/components/dashboard/MobileNav';
import ReceiptHistory from '@/components/dashboard/ReceiptHistory';
import SettingsPanel from '@/components/dashboard/SettingsPanel';
import Inventory from '@/pages/Inventory';

const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

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
              <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="font-medium text-foreground mb-2">Export Data</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Download your receipts as CSV for accounting software.
                </p>
                <div className="text-2xl font-bold text-primary">Coming Soon</div>
              </div>
            </div>
          </section>
        );
      case 'profile':
        return (
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4">My Profile</h2>
            <div className="bg-card rounded-xl border border-border p-6">
              <p className="text-muted-foreground">Profile settings coming soon.</p>
            </div>
          </section>
        );
      default:
        return (
          <>
            {/* Scan Receipt Button */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <ReceiptScanner />
            </div>

            {/* Top Row - Financial Pulse */}
            <section className="mb-6 sm:mb-8">
              <h2 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">Financial Pulse</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
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
            </section>

            {/* Middle Row - Benchmarks */}
            <section className="mb-6 sm:mb-8">
              <h2 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">
                The Learning Mentor — Industry Benchmarks
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
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
            </section>

            {/* Bottom Row - Chaos Manager */}
            <section>
              <h2 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">
                The Chaos Manager — Needs Review
              </h2>
              <div className="space-y-3 sm:space-y-4">
                <ReviewItem
                  type="question"
                  title="Zelle to 'Ivan P.' ($400)"
                  description="Categorize this payment: Labor or Maintenance?"
                />
                
                <ReviewItem
                  type="alert"
                  title="Costco Receipt Audit: $5.20 tax paid on Milk"
                  description="Alert: Check your Resale Certificate — you may be overpaying on exempt items."
                />
                
                <ReviewItem
                  type="unmatched"
                  title="Unmatched Bank Expense: $85.00 at Starbucks Store"
                  description="This transaction doesn't match any known category or vendor."
                />
              </div>
            </section>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Fixed Header */}
      <Header onMenuClick={() => setSidebarOpen(true)} onNavigate={handleNavigate} />
      
      {/* Main content with top padding for fixed header and bottom for nav */}
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
