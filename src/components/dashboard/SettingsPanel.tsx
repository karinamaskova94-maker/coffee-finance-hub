import { useState } from 'react';
import { Save, Store, Percent, MapPin } from 'lucide-react';
import { useStore } from '@/contexts/StoreContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const SettingsPanel = () => {
  const { currentStore, updateStore, stores } = useStore();
  const { toast } = useToast();
  
  const [storeName, setStoreName] = useState(currentStore?.name || '');
  const [storeAddress, setStoreAddress] = useState(currentStore?.address || '');
  const [taxRate, setTaxRate] = useState(currentStore?.state_tax_rate?.toString() || '8.87');
  const [isSaving, setIsSaving] = useState(false);

  // Update form when store changes
  useState(() => {
    if (currentStore) {
      setStoreName(currentStore.name);
      setStoreAddress(currentStore.address || '');
      setTaxRate(currentStore.state_tax_rate?.toString() || '8.87');
    }
  });

  const handleSave = async () => {
    if (!currentStore) return;
    
    setIsSaving(true);
    const success = await updateStore(currentStore.id, {
      name: storeName.trim(),
      address: storeAddress.trim() || null,
      state_tax_rate: parseFloat(taxRate) || 8.87,
    });

    if (success) {
      toast({
        title: 'Settings Saved',
        description: 'Your store settings have been updated.',
      });
    } else {
      toast({
        title: 'Save Failed',
        description: 'Could not save settings. Please try again.',
        variant: 'destructive',
      });
    }
    setIsSaving(false);
  };

  if (!currentStore) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No store selected</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Store Settings</h2>
        <p className="text-sm text-muted-foreground">
          Manage your store information and tax configuration
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="storeName" className="flex items-center gap-2">
            <Store className="w-4 h-4" />
            Store Name
          </Label>
          <Input
            id="storeName"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            placeholder="My Coffee Shop"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="storeAddress" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Address
          </Label>
          <Input
            id="storeAddress"
            value={storeAddress}
            onChange={(e) => setStoreAddress(e.target.value)}
            placeholder="123 Main St, City, State"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="taxRate" className="flex items-center gap-2">
            <Percent className="w-4 h-4" />
            State Tax Rate (%)
          </Label>
          <Input
            id="taxRate"
            type="number"
            step="0.01"
            min="0"
            max="20"
            value={taxRate}
            onChange={(e) => setTaxRate(e.target.value)}
            placeholder="8.87"
          />
          <p className="text-xs text-muted-foreground">
            This rate is used to auto-calculate tax on non-food purchases
          </p>
        </div>
      </div>

      <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
        {isSaving ? (
          <>
            <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
            Saving...
          </>
        ) : (
          <>
            <Save className="w-4 h-4 mr-2" />
            Save Settings
          </>
        )}
      </Button>

      {stores.length > 1 && (
        <div className="pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground">
            You have {stores.length} locations. Use the store switcher to manage other locations.
          </p>
        </div>
      )}
    </div>
  );
};

export default SettingsPanel;
