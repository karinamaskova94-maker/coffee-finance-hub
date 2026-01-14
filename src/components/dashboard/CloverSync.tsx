import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Check, Link2, Coffee, Milk, Cookie } from 'lucide-react';
import { toast } from 'sonner';

interface CloverMenuItem {
  id: string;
  name: string;
  price: number;
  modifiers: CloverModifier[];
}

interface CloverModifier {
  id: string;
  name: string;
  price: number;
  suggestedInventory?: string;
}

// Simulated Clover menu data
const MOCK_CLOVER_MENU: CloverMenuItem[] = [
  {
    id: 'clv_1',
    name: 'Latte',
    price: 5.50,
    modifiers: [
      { id: 'mod_1', name: 'Extra Shot', price: 0.75, suggestedInventory: 'Espresso Beans' },
      { id: 'mod_2', name: 'Oat Milk', price: 0.70, suggestedInventory: 'Oat Milk' },
      { id: 'mod_3', name: 'Almond Milk', price: 0.70, suggestedInventory: 'Almond Milk' },
      { id: 'mod_4', name: 'Vanilla Syrup', price: 0.50, suggestedInventory: 'Vanilla Syrup' },
    ],
  },
  {
    id: 'clv_2',
    name: 'Cappuccino',
    price: 5.00,
    modifiers: [
      { id: 'mod_5', name: 'Extra Shot', price: 0.75, suggestedInventory: 'Espresso Beans' },
      { id: 'mod_6', name: 'Large Size', price: 0.50 },
    ],
  },
  {
    id: 'clv_3',
    name: 'Drip Coffee',
    price: 3.00,
    modifiers: [
      { id: 'mod_7', name: 'Large', price: 0.50 },
      { id: 'mod_8', name: 'Add Cream', price: 0.00, suggestedInventory: 'Half & Half' },
    ],
  },
  {
    id: 'clv_4',
    name: 'Chocolate Chip Cookie',
    price: 3.50,
    modifiers: [],
  },
];

export function CloverSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncedItems, setSyncedItems] = useState<CloverMenuItem[]>([]);
  const [linkedModifiers, setLinkedModifiers] = useState<Record<string, boolean>>({});

  const handleSync = async () => {
    setIsSyncing(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setSyncedItems(MOCK_CLOVER_MENU);
    setIsSyncing(false);
    toast.success('Synced 4 menu items from Clover');
  };

  const linkModifier = (modifierId: string) => {
    setLinkedModifiers(prev => ({ ...prev, [modifierId]: true }));
    toast.success('Modifier linked to inventory');
  };

  const getIcon = (name: string) => {
    if (name.toLowerCase().includes('coffee') || name.toLowerCase().includes('latte') || name.toLowerCase().includes('cappuccino')) {
      return <Coffee className="h-4 w-4" />;
    }
    if (name.toLowerCase().includes('milk')) {
      return <Milk className="h-4 w-4" />;
    }
    if (name.toLowerCase().includes('cookie')) {
      return <Cookie className="h-4 w-4" />;
    }
    return <Coffee className="h-4 w-4" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Clover POS Sync</h3>
          <p className="text-sm text-muted-foreground">Import menu items and modifiers from Clover</p>
        </div>
        <Button onClick={handleSync} disabled={isSyncing} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing...' : 'Sync with Clover'}
        </Button>
      </div>

      {syncedItems.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <Link2 className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Click "Sync with Clover" to import your menu</p>
            <p className="text-xs text-muted-foreground mt-1">(This is a simulation for demo purposes)</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {syncedItems.map(item => (
            <Card key={item.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getIcon(item.name)}
                    <CardTitle className="text-base">{item.name}</CardTitle>
                  </div>
                  <Badge variant="outline">${item.price.toFixed(2)}</Badge>
                </div>
                {item.modifiers.length > 0 && (
                  <CardDescription>{item.modifiers.length} modifier(s)</CardDescription>
                )}
              </CardHeader>
              {item.modifiers.length > 0 && (
                <CardContent>
                  <div className="space-y-2">
                    {item.modifiers.map(mod => (
                      <div key={mod.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                        <div>
                          <span className="text-sm font-medium">{mod.name}</span>
                          <span className="text-sm text-muted-foreground ml-2">+${mod.price.toFixed(2)}</span>
                        </div>
                        {linkedModifiers[mod.id] ? (
                          <Badge variant="default" className="gap-1">
                            <Check className="h-3 w-3" /> Linked
                          </Badge>
                        ) : mod.suggestedInventory ? (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-7 text-xs"
                            onClick={() => linkModifier(mod.id)}
                          >
                            Match to "{mod.suggestedInventory}"
                          </Button>
                        ) : (
                          <Badge variant="secondary" className="text-xs">No match</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
