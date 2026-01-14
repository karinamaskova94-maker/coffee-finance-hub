import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

export interface Store {
  id: string;
  user_id: string;
  name: string;
  address: string | null;
  state_tax_rate: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface StoreContextType {
  stores: Store[];
  currentStore: Store | null;
  isLoading: boolean;
  setCurrentStore: (store: Store) => void;
  createStore: (name: string, address?: string, stateTaxRate?: number) => Promise<Store | null>;
  updateStore: (id: string, updates: Partial<Store>) => Promise<boolean>;
  refreshStores: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [stores, setStores] = useState<Store[]>([]);
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAuthenticated } = useAuth();

  const refreshStores = async () => {
    if (!user) {
      setStores([]);
      setCurrentStore(null);
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching stores:', error);
      setIsLoading(false);
      return;
    }

    const storeData = (data || []) as Store[];
    setStores(storeData);

    // Set current store to default or first store
    if (storeData.length > 0 && !currentStore) {
      const defaultStore = storeData.find(s => s.is_default) || storeData[0];
      setCurrentStore(defaultStore);
    }

    // If no stores, create a default one
    if (storeData.length === 0) {
      const newStore = await createStore('My Coffee Shop', '', 8.87);
      if (newStore) {
        setStores([newStore]);
        setCurrentStore(newStore);
      }
    }

    setIsLoading(false);
  };

  const createStore = async (name: string, address?: string, stateTaxRate: number = 8.87): Promise<Store | null> => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('stores')
      .insert({
        user_id: user.id,
        name,
        address: address || null,
        state_tax_rate: stateTaxRate,
        is_default: stores.length === 0
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating store:', error);
      return null;
    }

    return data as Store;
  };

  const updateStore = async (id: string, updates: Partial<Store>): Promise<boolean> => {
    const { error } = await supabase
      .from('stores')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating store:', error);
      return false;
    }

    await refreshStores();
    return true;
  };

  useEffect(() => {
    if (isAuthenticated) {
      refreshStores();
    } else {
      setStores([]);
      setCurrentStore(null);
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.id]);

  return (
    <StoreContext.Provider value={{
      stores,
      currentStore,
      isLoading,
      setCurrentStore,
      createStore,
      updateStore,
      refreshStores
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
