import { useState } from 'react';
import { DollarSign, BarChart3, Landmark } from 'lucide-react';
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

const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
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
                  title="Tax Liability"
                  value="$3,840"
                  subtitle="Sales Tax Collected — Not Your Money"
                  icon={<Landmark className="w-5 h-5 text-warning" />}
                  variant="warning"
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
    <div className="min-h-screen flex bg-background">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="flex-1 p-4 sm:p-6 overflow-auto pb-20 lg:pb-6">
          {renderContent()}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default Dashboard;
