import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InventoryList } from '@/components/inventory/InventoryList';
import { MenuItemBuilder } from '@/components/inventory/MenuItemBuilder';
import { CloverSync } from '@/components/dashboard/CloverSync';
import { Package, ChefHat, Link2 } from 'lucide-react';

interface InventoryProps {
  defaultTab?: 'inventory' | 'recipes';
}

export default function Inventory({ defaultTab = 'inventory' }: InventoryProps) {
  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  
  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="inventory" className="gap-2">
            <Package className="h-4 w-4" />
            Inventory
          </TabsTrigger>
          <TabsTrigger value="recipes" className="gap-2">
            <ChefHat className="h-4 w-4" />
            Recipes
          </TabsTrigger>
          <TabsTrigger value="clover" className="gap-2">
            <Link2 className="h-4 w-4" />
            Clover
          </TabsTrigger>
        </TabsList>
        <TabsContent value="inventory" className="mt-4">
          <InventoryList />
        </TabsContent>
        <TabsContent value="recipes" className="mt-4">
          <MenuItemBuilder />
        </TabsContent>
        <TabsContent value="clover" className="mt-4">
          <CloverSync />
        </TabsContent>
      </Tabs>
    </div>
  );
}
