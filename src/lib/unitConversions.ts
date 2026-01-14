// Unit conversion engine for inventory management
// Allows buying in large units (gallons, lbs) and using in small units (oz, ml, g)

export type PurchaseUnit = 'gallon' | 'lb' | 'oz' | 'each' | 'case' | 'bag' | 'box' | 'pack';
export type UsageUnit = 'oz' | 'ml' | 'g' | 'each';

// Conversion constants
const CONVERSIONS = {
  // Volume: 1 Gallon = 128 oz = 3785 ml
  gallon_to_oz: 128,
  gallon_to_ml: 3785,
  oz_to_ml: 29.5735, // ~30ml per oz
  
  // Weight: 1 lb = 16 oz = 453 g
  lb_to_oz: 16,
  lb_to_g: 453,
  oz_to_g: 28.35,
} as const;

// Get compatible usage units for a purchase unit
export function getCompatibleUnits(purchaseUnit: PurchaseUnit): UsageUnit[] {
  switch (purchaseUnit) {
    case 'gallon':
      return ['oz', 'ml'];
    case 'lb':
      return ['oz', 'g'];
    case 'oz':
      return ['oz', 'ml', 'g']; // oz can be volume or weight
    case 'each':
    case 'case':
    case 'bag':
    case 'box':
    case 'pack':
      return ['each'];
    default:
      return ['each'];
  }
}

// Convert quantity from purchase unit to usage unit
export function convertQuantity(
  quantity: number,
  fromUnit: PurchaseUnit,
  toUnit: UsageUnit
): number {
  // Same unit, no conversion needed
  if (fromUnit === toUnit) return quantity;
  
  // Volume conversions (Gallon)
  if (fromUnit === 'gallon') {
    if (toUnit === 'oz') return quantity * CONVERSIONS.gallon_to_oz;
    if (toUnit === 'ml') return quantity * CONVERSIONS.gallon_to_ml;
  }
  
  // Weight conversions (LB)
  if (fromUnit === 'lb') {
    if (toUnit === 'oz') return quantity * CONVERSIONS.lb_to_oz;
    if (toUnit === 'g') return quantity * CONVERSIONS.lb_to_g;
  }
  
  // OZ conversions (can be volume or weight context)
  if (fromUnit === 'oz') {
    if (toUnit === 'ml') return quantity * CONVERSIONS.oz_to_ml;
    if (toUnit === 'g') return quantity * CONVERSIONS.oz_to_g;
    if (toUnit === 'oz') return quantity;
  }
  
  // For 'each' type units, no conversion possible
  return quantity;
}

// Calculate price per usage unit from purchase unit price
export function calculatePricePerUnit(
  purchasePrice: number,
  purchaseUnit: PurchaseUnit,
  targetUnit: UsageUnit
): number {
  if (purchaseUnit === targetUnit) return purchasePrice;
  
  // Get how many target units are in 1 purchase unit
  const unitsPerPurchase = convertQuantity(1, purchaseUnit, targetUnit);
  
  if (unitsPerPurchase === 0) return 0;
  
  return purchasePrice / unitsPerPurchase;
}

// Calculate cost of using a specific quantity in usage units
export function calculateIngredientCost(
  quantity: number,
  usageUnit: UsageUnit,
  purchasePrice: number,
  purchaseUnit: PurchaseUnit
): number {
  const pricePerUsageUnit = calculatePricePerUnit(purchasePrice, purchaseUnit, usageUnit);
  return quantity * pricePerUsageUnit;
}

// Format price per unit for display
export function formatPricePerUnit(
  price: number,
  purchaseUnit: PurchaseUnit,
  displayUnit: UsageUnit
): string {
  const pricePerDisplayUnit = calculatePricePerUnit(price, purchaseUnit, displayUnit);
  return `$${pricePerDisplayUnit.toFixed(4)}/${displayUnit}`;
}

// Get all price breakdowns for an inventory item
export function getPriceBreakdown(
  purchasePrice: number,
  purchaseUnit: PurchaseUnit
): { unit: UsageUnit; price: number }[] {
  const compatibleUnits = getCompatibleUnits(purchaseUnit);
  return compatibleUnits.map(unit => ({
    unit,
    price: calculatePricePerUnit(purchasePrice, purchaseUnit, unit),
  }));
}

// Unit labels for display
export const PURCHASE_UNIT_LABELS: Record<PurchaseUnit, string> = {
  gallon: 'Gallon',
  lb: 'LB',
  oz: 'OZ',
  each: 'Each',
  case: 'Case',
  bag: 'Bag',
  box: 'Box',
  pack: 'Pack',
};

export const USAGE_UNIT_LABELS: Record<UsageUnit, string> = {
  oz: 'oz',
  ml: 'ml',
  g: 'g',
  each: 'each',
};
