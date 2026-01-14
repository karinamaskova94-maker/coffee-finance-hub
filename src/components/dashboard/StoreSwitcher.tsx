import { useState } from 'react';
import { ChevronDown, Store, Plus, Check, MapPin } from 'lucide-react';
import { useStore } from '@/contexts/StoreContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const StoreSwitcher = () => {
  const { stores, currentStore, setCurrentStore, createStore, isLoading } = useStore();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreAddress, setNewStoreAddress] = useState('');
  const [newStoreTaxRate, setNewStoreTaxRate] = useState('8.87');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateStore = async () => {
    if (!newStoreName.trim()) return;
    
    setIsCreating(true);
    const store = await createStore(
      newStoreName.trim(),
      newStoreAddress.trim() || undefined,
      parseFloat(newStoreTaxRate) || 8.87
    );
    
    if (store) {
      setCurrentStore(store);
      setIsAddDialogOpen(false);
      setNewStoreName('');
      setNewStoreAddress('');
      setNewStoreTaxRate('8.87');
    }
    setIsCreating(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border">
        <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2 h-10 px-3">
            <Store className="w-4 h-4 text-primary" />
            <span className="font-medium max-w-[150px] truncate">
              {currentStore?.name || 'Select Store'}
            </span>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {stores.map((store) => (
            <DropdownMenuItem
              key={store.id}
              onClick={() => setCurrentStore(store)}
              className="flex items-center justify-between py-2.5"
            >
              <div className="flex flex-col">
                <span className="font-medium">{store.name}</span>
                {store.address && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" />
                    {store.address}
                  </span>
                )}
              </div>
              {currentStore?.id === store.id && (
                <Check className="w-4 h-4 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setIsAddDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add New Location
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Location</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="storeName">Store Name</Label>
              <Input
                id="storeName"
                placeholder="Downtown Coffee Shop"
                value={newStoreName}
                onChange={(e) => setNewStoreName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="storeAddress">Address (optional)</Label>
              <Input
                id="storeAddress"
                placeholder="123 Main St, City, State"
                value={newStoreAddress}
                onChange={(e) => setNewStoreAddress(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxRate">State Tax Rate (%)</Label>
              <Input
                id="taxRate"
                type="number"
                step="0.01"
                min="0"
                max="20"
                placeholder="8.87"
                value={newStoreTaxRate}
                onChange={(e) => setNewStoreTaxRate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateStore} disabled={isCreating || !newStoreName.trim()}>
              {isCreating ? 'Creating...' : 'Add Location'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default StoreSwitcher;
