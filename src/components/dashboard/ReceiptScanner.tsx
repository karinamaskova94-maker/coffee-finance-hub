import { useState, useRef } from 'react';
import { Camera, Upload, X, Check, AlertCircle, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useStore } from '@/contexts/StoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ExtractedData {
  merchant: string;
  total: string;
  tax: string;
  date: string;
}

const CATEGORIES = [
  { value: 'cogs', label: 'COGS (Cost of Goods Sold)' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'rent', label: 'Rent & Occupancy' },
  { value: 'labor', label: 'Labor' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'other', label: 'Other' },
];

const ReceiptScanner = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData>({
    merchant: '',
    total: '',
    tax: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [category, setCategory] = useState('cogs');
  const [isFoodItem, setIsFoodItem] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  const { currentStore } = useStore();
  const { user } = useAuth();
  const { toast } = useToast();

  // Placeholder OCR function - will be replaced with Gemini API
  const performOCR = async (imageData: string): Promise<ExtractedData> => {
    // Simulate OCR processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Placeholder: Return mock data for demo
    // This will be replaced with actual Gemini API call
    return {
      merchant: 'Costco',
      total: '125.47',
      tax: '10.23',
      date: new Date().toISOString().split('T')[0],
    };
  };

  const calculateTax = (total: string, taxRate: number, isFood: boolean): string => {
    if (isFood) return '0.00'; // Food items are typically tax-exempt
    
    const totalAmount = parseFloat(total) || 0;
    // Calculate tax from pre-tax amount: tax = total - (total / (1 + rate))
    const taxAmount = totalAmount - (totalAmount / (1 + taxRate / 100));
    return taxAmount.toFixed(2);
  };

  const handleCapture = async (file: File) => {
    setIsScanning(true);
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageData = e.target?.result as string;
      setCapturedImage(imageData);
      
      try {
        const data = await performOCR(imageData);
        setExtractedData(data);
        
        // Auto-calculate tax if merchant is Costco and not food
        if (data.merchant.toLowerCase().includes('costco') && !isFoodItem) {
          const calculatedTax = calculateTax(data.total, currentStore?.state_tax_rate || 8.87, false);
          setExtractedData(prev => ({ ...prev, tax: calculatedTax }));
        }
        
        setIsScanning(false);
        setIsConfirmOpen(true);
      } catch (error) {
        console.error('OCR Error:', error);
        toast({
          title: 'Scan Failed',
          description: 'Could not extract data from receipt. Please enter manually.',
          variant: 'destructive',
        });
        setIsScanning(false);
        setIsConfirmOpen(true);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleCapture(file);
    }
  };

  const handleSaveReceipt = async () => {
    if (!user || !currentStore) {
      toast({
        title: 'Error',
        description: 'Please ensure you are logged in and have a store selected.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      // Upload image if available
      let imageUrl = null;
      if (capturedImage) {
        const fileName = `${user.id}/${Date.now()}.jpg`;
        const base64Data = capturedImage.split(',')[1];
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(fileName, decode(base64Data), {
            contentType: 'image/jpeg',
          });

        if (!uploadError && uploadData) {
          const { data: urlData } = supabase.storage
            .from('receipts')
            .getPublicUrl(fileName);
          imageUrl = urlData.publicUrl;
        }
      }

      // Save receipt to database
      const { error } = await supabase.from('receipts').insert({
        user_id: user.id,
        store_id: currentStore.id,
        vendor_name: extractedData.merchant,
        amount: parseFloat(extractedData.total) || 0,
        tax_amount: parseFloat(extractedData.tax) || 0,
        category,
        receipt_date: extractedData.date,
        is_food_item: isFoodItem,
        image_url: imageUrl,
        status: 'pending',
      });

      if (error) throw error;

      toast({
        title: 'Receipt Saved',
        description: `$${extractedData.total} from ${extractedData.merchant} added successfully.`,
      });

      // Reset state
      setIsConfirmOpen(false);
      setCapturedImage(null);
      setExtractedData({ merchant: '', total: '', tax: '', date: new Date().toISOString().split('T')[0] });
      setCategory('cogs');
      setIsFoodItem(false);
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: 'Save Failed',
        description: 'Could not save receipt. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle food item toggle - recalculate tax
  const handleFoodToggle = (checked: boolean) => {
    setIsFoodItem(checked);
    if (extractedData.total) {
      const calculatedTax = calculateTax(extractedData.total, currentStore?.state_tax_rate || 8.87, checked);
      setExtractedData(prev => ({ ...prev, tax: calculatedTax }));
    }
  };

  return (
    <>
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Scan Button */}
      <Button
        onClick={() => cameraInputRef.current?.click()}
        className="gap-2 bg-primary hover:bg-primary/90"
        disabled={isScanning}
      >
        {isScanning ? (
          <>
            <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            Scanning...
          </>
        ) : (
          <>
            <Camera className="w-4 h-4" />
            Scan Receipt
          </>
        )}
      </Button>

      {/* Upload alternative */}
      <Button
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        className="gap-2"
        disabled={isScanning}
      >
        <Upload className="w-4 h-4" />
        Upload
      </Button>

      {/* Confirmation Modal */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              Confirm Receipt Data
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {capturedImage && (
              <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                <img
                  src={capturedImage}
                  alt="Captured receipt"
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="merchant">Merchant</Label>
                <Input
                  id="merchant"
                  value={extractedData.merchant}
                  onChange={(e) => setExtractedData(prev => ({ ...prev, merchant: e.target.value }))}
                  placeholder="e.g., Costco"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={extractedData.date}
                  onChange={(e) => setExtractedData(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="total">Total Amount ($)</Label>
                <Input
                  id="total"
                  type="number"
                  step="0.01"
                  value={extractedData.total}
                  onChange={(e) => {
                    setExtractedData(prev => ({ ...prev, total: e.target.value }));
                    // Recalculate tax when total changes
                    const calculatedTax = calculateTax(e.target.value, currentStore?.state_tax_rate || 8.87, isFoodItem);
                    setExtractedData(prev => ({ ...prev, tax: calculatedTax }));
                  }}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax">Tax Amount ($)</Label>
                <Input
                  id="tax"
                  type="number"
                  step="0.01"
                  value={extractedData.tax}
                  onChange={(e) => setExtractedData(prev => ({ ...prev, tax: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
              <Checkbox
                id="foodItem"
                checked={isFoodItem}
                onCheckedChange={handleFoodToggle}
              />
              <div className="flex-1">
                <Label htmlFor="foodItem" className="cursor-pointer font-medium">
                  Food/Grocery Item (Tax Exempt)
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Check if this receipt is for tax-exempt food items
                </p>
              </div>
            </div>

            {extractedData.merchant.toLowerCase().includes('costco') && !isFoodItem && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
                <AlertCircle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-warning">Tax Auto-Calculated</p>
                  <p className="text-muted-foreground mt-0.5">
                    Based on {currentStore?.state_tax_rate || 8.87}% state tax rate. 
                    Check your resale certificate for Costco purchases.
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSaveReceipt} disabled={isSaving || !extractedData.merchant || !extractedData.total}>
              {isSaving ? (
                <>
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Save Receipt
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Helper function to decode base64
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export default ReceiptScanner;
