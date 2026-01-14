import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Receipt, ChevronRight, Filter, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ReceiptItem {
  id: string;
  vendor_name: string;
  amount: number;
  tax_amount: number;
  category: string | null;
  receipt_date: string;
  status: string;
  is_food_item: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  cogs: 'COGS',
  supplies: 'Supplies',
  utilities: 'Utilities',
  rent: 'Rent',
  labor: 'Labor',
  marketing: 'Marketing',
  other: 'Other',
};

const ReceiptHistory = () => {
  const [receipts, setReceipts] = useState<ReceiptItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  const { currentStore } = useStore();
  const { user } = useAuth();

  const fetchReceipts = async () => {
    if (!user || !currentStore) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    
    let query = supabase
      .from('receipts')
      .select('id, vendor_name, amount, tax_amount, category, receipt_date, status, is_food_item')
      .eq('user_id', user.id)
      .eq('store_id', currentStore.id)
      .order('receipt_date', { ascending: false });

    if (categoryFilter !== 'all') {
      query = query.eq('category', categoryFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching receipts:', error);
    } else {
      setReceipts((data || []) as ReceiptItem[]);
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    fetchReceipts();
  }, [currentStore?.id, user?.id, categoryFilter]);

  const filteredReceipts = receipts.filter(r =>
    r.vendor_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalAmount = filteredReceipts.reduce((sum, r) => sum + r.amount, 0);
  const totalTax = filteredReceipts.reduce((sum, r) => sum + r.tax_amount, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search receipts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
          <p className="text-sm text-muted-foreground">Total Spent</p>
          <p className="text-xl font-bold text-foreground">${totalAmount.toFixed(2)}</p>
        </div>
        <div className="p-4 rounded-xl bg-warning/5 border border-warning/10">
          <p className="text-sm text-muted-foreground">Total Tax</p>
          <p className="text-xl font-bold text-foreground">${totalTax.toFixed(2)}</p>
        </div>
      </div>

      {/* Receipt List */}
      <div className="space-y-2">
        {filteredReceipts.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">No receipts found</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Scan or upload a receipt to get started
            </p>
          </div>
        ) : (
          filteredReceipts.map((receipt) => (
            <button
              key={receipt.id}
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/20 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Receipt className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-foreground truncate">{receipt.vendor_name}</p>
                  <p className="font-semibold text-foreground shrink-0">
                    ${receipt.amount.toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(receipt.receipt_date), 'MMM d, yyyy')}
                    </span>
                    {receipt.category && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {CATEGORY_LABELS[receipt.category] || receipt.category}
                      </span>
                    )}
                    {receipt.is_food_item && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success">
                        Tax Exempt
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Tax: ${receipt.tax_amount.toFixed(2)}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default ReceiptHistory;
