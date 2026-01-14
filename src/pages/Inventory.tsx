import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InventoryList } from '@/components/inventory/InventoryList';
import { MenuItemBuilder } from '@/components/inventory/MenuItemBuilder';
import { CloverSync } from '@/components/dashboard/CloverSync';
import { QuickTableView } from '@/components/inventory/QuickTableView';
import { Package, ChefHat, Link2, TableIcon } from 'lucide-react';

interface InventoryProps {
  defaultTab?: 'inventory' | 'recipes' | 'table';
}

export default function Inventory({ defaultTab = 'inventory' }: InventoryProps) {
  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  
  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="inventory" className="gap-1 text-xs sm:text-sm">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Inventory</span>
          </TabsTrigger>
          <TabsTrigger value="recipes" className="gap-1 text-xs sm:text-sm">
            <ChefHat className="h-4 w-4" />
            <span className="hidden sm:inline">Recipes</span>
          </TabsTrigger>
          <TabsTrigger value="table" className="gap-1 text-xs sm:text-sm">
            <TableIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Quick Edit</span>
          </TabsTrigger>
          <TabsTrigger value="clover" className="gap-1 text-xs sm:text-sm">
            <Link2 className="h-4 w-4" />
            <span className="hidden sm:inline">Clover</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="inventory" className="mt-4">
          <InventoryList />
        </TabsContent>
        <TabsContent value="recipes" className="mt-4">
          <MenuItemBuilder />
        </TabsContent>
        <TabsContent value="table" className="mt-4">
          <QuickTableView />
        </TabsContent>
        <TabsContent value="clover" className="mt-4">
          <CloverSync />
        </TabsContent>
      </Tabs>
    </div>
  );
}
