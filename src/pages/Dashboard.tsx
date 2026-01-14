import { useState, useEffect } from 'react';
import { DollarSign, BarChart3, Percent, Camera, ClipboardList, TrendingUp } from 'lucide-react';
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';
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
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { COFFEE_SHOP_TEMPLATES } from '@/lib/recipeTemplates';
import { toast } from 'sonner';

const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const { user } = useAuth();

  // Auto-create starter recipes on first login
  useEffect(() => {
    const createStarterRecipes = async () => {
      if (!user) return;
      
      // Check if user already has menu items
      const { data: existingItems, error } = await supabase
        .from('menu_items')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);
      
      if (error || (existingItems && existingItems.length > 0)) return;
      
      // Create 3 starter recipes
      const starterRecipes = COFFEE_SHOP_TEMPLATES.slice(0, 3); // Latte, Cappuccino, Americano
      
      for (const recipe of starterRecipes) {
        const { error: insertError } = await supabase
          .from('menu_items')
          .insert({
            user_id: user.id,
            name: recipe.name,
            category: recipe.category,
            retail_price: recipe.retailPrice
          });
        
        if (insertError) {
          console.error('Error creating starter recipe:', insertError);
        }
      }
      
      toast.success('Created 3 starter recipes for you!', {
        description: 'Latte, Cappuccino, and Americano are ready to customize.'
      });
    };
    
    createStarterRecipes();
  }, [user]);

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
      case 'recipes':
        return (
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4">Menu Recipes</h2>
            <Inventory defaultTab="recipes" />
          </section>
        );
      case 'stocktake':
        return (
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4">Sunday Count</h2>
            <SundayCount />
          </section>
        );
      case 'history':
        return (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Receipt History</h2>
              <ReceiptScanner />
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
      case 'reports':
        return (
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4">Profitability Reports</h2>
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
      default:
        // Home - Hero Dashboard
        return (
          <section className="flex flex-col gap-6">
            {/* Hero Net Profit Card */}
            <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-xl overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-primary-foreground/80 text-sm font-medium mb-1">This Week's Net Profit</p>
                    <p className="text-4xl md:text-5xl font-bold tracking-tight">$12,450</p>
                    <div className="flex items-center gap-2 mt-2">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-sm font-medium">+8.2% vs last week</span>
                    </div>
                    <p className="text-primary-foreground/70 text-xs mt-1">Clean of Sales Tax & Tips</p>
                  </div>
                  <div className="hidden sm:block">
                    <div className="w-20 h-20 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                      <DollarSign className="w-10 h-10" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Two Big Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ReceiptScanner variant="large" />
              
              <Button
                onClick={() => setActiveTab('stocktake')}
                className="h-28 sm:h-32 flex flex-col items-center justify-center gap-3 text-lg font-semibold bg-secondary hover:bg-secondary/90 text-secondary-foreground border-2 border-border shadow-lg"
                variant="outline"
                size="lg"
              >
                <ClipboardList className="w-10 h-10" />
                <span>📋 Sunday Count</span>
              </Button>
            </div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-2 gap-4">
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
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Recent Receipts</h3>
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
      
      {/* Restored Header with User Avatar */}
      <Header onMenuClick={() => setSidebarOpen(true)} onNavigate={handleNavigate} />
      
      {/* Main content with proper spacing for header and bottom nav */}
      <main className="pt-20 pb-24 lg:pb-6">
        <div className="p-4 sm:p-6 max-w-6xl mx-auto">
          {renderContent()}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default Dashboard;
