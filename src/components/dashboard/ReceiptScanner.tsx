import { useState, useRef } from 'react';
import { Camera, Upload, X, Check, AlertCircle, Receipt, Sparkles, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
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
import { IngredientMapper } from '@/components/receipt/IngredientMapper';

interface ExtractedData {
  merchant: string;
  total: string;
  tax: string;
  date: string;
  isFoodItem: boolean;
  taxableAmount: number;
  nonTaxableAmount: number;
  category: 'cogs' | 'supplies' | 'mixed';
  hasTaxSavings: boolean;
  rawItems?: Array<{
    name: string;
    price: number;
    taxCode: string;
    isTaxable: boolean;
  }>;
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

// Base64 decode helper
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

interface ReceiptScannerProps {
  variant?: 'default' | 'large';
  onScanStart?: () => void;
}

const ReceiptScanner = ({ variant = 'default', onScanStart }: ReceiptScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [savedReceiptId, setSavedReceiptId] = useState<string | null>(null);
  const [showMapper, setShowMapper] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData>({
    merchant: '',
    total: '',
    tax: '',
    date: new Date().toISOString().split('T')[0],
    isFoodItem: false,
    taxableAmount: 0,
    nonTaxableAmount: 0,
    category: 'cogs',
    hasTaxSavings: false,
  });
  const [category, setCategory] = useState('cogs');
  const [isFoodItem, setIsFoodItem] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasTaxSavings, setHasTaxSavings] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  const { currentStore } = useStore();
  const { user } = useAuth();
  const { toast } = useToast();

  const performOCR = async (imageData: string): Promise<ExtractedData> => {
    try {
      const response = await supabase.functions.invoke('scan-receipt', {
        body: {
          imageBase64: imageData,
          stateTaxRate: currentStore?.state_tax_rate || 9.5,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'OCR failed');
      }

      const data = response.data;
      
      if (data.fallback) {
        throw new Error(data.error || 'OCR processing failed');
      }

      return {
        merchant: data.merchant || '',
        total: String(data.total || ''),
        tax: String(data.tax || ''),
        date: data.date || new Date().toISOString().split('T')[0],
        isFoodItem: data.isFoodItem || false,
        taxableAmount: data.taxableAmount || 0,
        nonTaxableAmount: data.nonTaxableAmount || 0,
        category: data.category || 'cogs',
        hasTaxSavings: data.hasTaxSavings || false,
        rawItems: data.rawItems || [],
      };
    } catch (error) {
      console.error('OCR Error:', error);
      return {
        merchant: '',
        total: '',
        tax: '',
        date: new Date().toISOString().split('T')[0],
        isFoodItem: false,
        taxableAmount: 0,
        nonTaxableAmount: 0,
        category: 'cogs',
        hasTaxSavings: false,
      };
    }
  };

  const calculateTax = (total: string, taxRate: number, isFood: boolean): string => {
    if (isFood) return '0.00';
    const totalAmount = parseFloat(total) || 0;
    const taxAmount = totalAmount - (totalAmount / (1 + taxRate / 100));
    return taxAmount.toFixed(2);
  };

  const handleCapture = async (file: File) => {
    setIsScanning(true);
    onScanStart?.();
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageData = e.target?.result as string;
      setCapturedImage(imageData);
      
      try {
        const data = await performOCR(imageData);
        setExtractedData(data);
        setCategory(data.category);
        setIsFoodItem(data.isFoodItem);
        setHasTaxSavings(data.hasTaxSavings);
        
        if (!data.merchant) {
          toast({
            title: 'Manual Entry Required',
            description: 'Could not read receipt automatically. Please enter details manually.',
            variant: 'default',
          });
        } else {
          toast({
            title: 'Receipt Scanned',
            description: `Found ${data.merchant} receipt for $${data.total}`,
          });
        }
        
        setIsScanning(false);
        setIsConfirmOpen(true);
      } catch (error) {
        console.error('OCR Error:', error);
        toast({
          title: 'Scan Issue',
          description: 'AI processing had an issue. Please enter details manually.',
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

      let finalCategory = category;
      const isCostco = extractedData.merchant.toLowerCase().includes('costco');
      const taxAmount = parseFloat(extractedData.tax) || 0;
      
      if (isCostco) {
        if (taxAmount === 0 && isFoodItem) {
          finalCategory = 'cogs';
        } else if (taxAmount > 0 && !isFoodItem) {
          finalCategory = 'supplies';
        }
      }

      const { data: receiptData, error } = await supabase.from('receipts').insert({
        user_id: user.id,
        store_id: currentStore.id,
        vendor_name: extractedData.merchant,
        amount: parseFloat(extractedData.total) || 0,
        tax_amount: parseFloat(extractedData.tax) || 0,
        category: finalCategory,
        receipt_date: extractedData.date,
        is_food_item: isFoodItem,
        image_url: imageUrl,
        status: 'pending',
        notes: hasTaxSavings ? 'Tax savings identified - food items exempt' : null,
      }).select().single();

      if (error) throw error;

      setSavedReceiptId(receiptData.id);

      toast({
        title: 'Receipt Saved',
        description: `$${extractedData.total} from ${extractedData.merchant} added successfully.`,
      });

      // Show ingredient mapper if we have scanned items
      if (extractedData.rawItems && extractedData.rawItems.length > 0) {
        setShowMapper(true);
      } else {
        handleClose();
      }
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

  const handleClose = () => {
    setIsConfirmOpen(false);
    setCapturedImage(null);
    setSavedReceiptId(null);
    setShowMapper(false);
    setExtractedData({
      merchant: '',
      total: '',
      tax: '',
      date: new Date().toISOString().split('T')[0],
      isFoodItem: false,
      taxableAmount: 0,
      nonTaxableAmount: 0,
      category: 'cogs',
      hasTaxSavings: false,
    });
    setCategory('cogs');
    setIsFoodItem(false);
    setHasTaxSavings(false);
  };

  const handleFoodToggle = (checked: boolean) => {
    setIsFoodItem(checked);
    if (extractedData.total) {
      const calculatedTax = calculateTax(extractedData.total, currentStore?.state_tax_rate || 9.5, checked);
      setExtractedData(prev => ({ ...prev, tax: calculatedTax }));
      setHasTaxSavings(checked && parseFloat(extractedData.total) > 0);
    }
    if (checked) {
      setCategory('cogs');
    }
  };

  const isLarge = variant === 'large';

  return (
    <>
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

      {isLarge ? (
        <Button
          onClick={() => cameraInputRef.current?.click()}
          className="h-32 flex-1 flex flex-col items-center justify-center gap-3 text-lg font-semibold bg-primary hover:bg-primary/90 shadow-lg"
          disabled={isScanning}
        >
          {isScanning ? (
            <>
              <Sparkles className="w-10 h-10 animate-pulse" />
              <span>AI Scanning...</span>
            </>
          ) : (
            <>
              <Camera className="w-10 h-10" />
              <span>Scan Receipt</span>
            </>
          )}
        </Button>
      ) : (
        <>
          <Button
            onClick={() => cameraInputRef.current?.click()}
            className="gap-2 bg-primary hover:bg-primary/90"
            disabled={isScanning}
          >
            {isScanning ? (
              <>
                <Sparkles className="w-4 h-4 animate-pulse" />
                AI Scanning...
              </>
            ) : (
              <>
                <Camera className="w-4 h-4" />
                Scan Receipt
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="gap-2"
            disabled={isScanning}
          >
            <Upload className="w-4 h-4" />
            Upload
          </Button>
        </>
      )}

      <Dialog open={isConfirmOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              {showMapper ? 'Map to Inventory' : 'Confirm Receipt Data'}
              {hasTaxSavings && !showMapper && (
                <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700 border-green-200">
                  <Leaf className="w-3 h-3 mr-1" />
                  COGS
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {showMapper && savedReceiptId && extractedData.rawItems ? (
            <IngredientMapper
              scannedItems={extractedData.rawItems}
              receiptId={savedReceiptId}
              onComplete={handleClose}
            />
          ) : (
            <>
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
                        const calculatedTax = calculateTax(e.target.value, currentStore?.state_tax_rate || 9.5, isFoodItem);
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
                      Food/Grocery Item (COGS)
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Check if this is for food ingredients (adds to Cost of Goods Sold)
                    </p>
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={handleClose}>
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
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ReceiptScanner;
