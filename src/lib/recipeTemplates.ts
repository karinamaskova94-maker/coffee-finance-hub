// Standard coffee shop recipe templates with industry-standard ratios

export interface RecipeTemplate {
  name: string;
  category: string;
  retailPrice: number;
  ingredients: {
    inventoryName: string;
    quantity: number;
    usageUnit: 'oz' | 'ml' | 'g' | 'each';
    // Common inventory matches for auto-linking
    matchTerms: string[];
  }[];
}

export const COFFEE_SHOP_TEMPLATES: RecipeTemplate[] = [
  {
    name: 'Latte 12oz',
    category: 'Espresso Drinks',
    retailPrice: 5.50,
    ingredients: [
      { inventoryName: 'Espresso', quantity: 2, usageUnit: 'oz', matchTerms: ['espresso', 'coffee bean', 'coffee'] },
      { inventoryName: 'Whole Milk', quantity: 10, usageUnit: 'oz', matchTerms: ['milk', 'whole milk', '2% milk', 'dairy'] },
    ],
  },
  {
    name: 'Latte 16oz',
    category: 'Espresso Drinks',
    retailPrice: 6.50,
    ingredients: [
      { inventoryName: 'Espresso', quantity: 2, usageUnit: 'oz', matchTerms: ['espresso', 'coffee bean', 'coffee'] },
      { inventoryName: 'Whole Milk', quantity: 14, usageUnit: 'oz', matchTerms: ['milk', 'whole milk', '2% milk', 'dairy'] },
    ],
  },
  {
    name: 'Cappuccino 8oz',
    category: 'Espresso Drinks',
    retailPrice: 4.75,
    ingredients: [
      { inventoryName: 'Espresso', quantity: 2, usageUnit: 'oz', matchTerms: ['espresso', 'coffee bean', 'coffee'] },
      { inventoryName: 'Whole Milk', quantity: 4, usageUnit: 'oz', matchTerms: ['milk', 'whole milk', '2% milk', 'dairy'] },
    ],
  },
  {
    name: 'Cappuccino 12oz',
    category: 'Espresso Drinks',
    retailPrice: 5.25,
    ingredients: [
      { inventoryName: 'Espresso', quantity: 2, usageUnit: 'oz', matchTerms: ['espresso', 'coffee bean', 'coffee'] },
      { inventoryName: 'Whole Milk', quantity: 6, usageUnit: 'oz', matchTerms: ['milk', 'whole milk', '2% milk', 'dairy'] },
    ],
  },
  {
    name: 'Americano 12oz',
    category: 'Espresso Drinks',
    retailPrice: 4.00,
    ingredients: [
      { inventoryName: 'Espresso', quantity: 2, usageUnit: 'oz', matchTerms: ['espresso', 'coffee bean', 'coffee'] },
    ],
  },
  {
    name: 'Americano 16oz',
    category: 'Espresso Drinks',
    retailPrice: 4.50,
    ingredients: [
      { inventoryName: 'Espresso', quantity: 3, usageUnit: 'oz', matchTerms: ['espresso', 'coffee bean', 'coffee'] },
    ],
  },
  {
    name: 'Espresso Shot',
    category: 'Espresso Drinks',
    retailPrice: 3.00,
    ingredients: [
      { inventoryName: 'Espresso', quantity: 1, usageUnit: 'oz', matchTerms: ['espresso', 'coffee bean', 'coffee'] },
    ],
  },
  {
    name: 'Double Espresso',
    category: 'Espresso Drinks',
    retailPrice: 3.75,
    ingredients: [
      { inventoryName: 'Espresso', quantity: 2, usageUnit: 'oz', matchTerms: ['espresso', 'coffee bean', 'coffee'] },
    ],
  },
  {
    name: 'Mocha 12oz',
    category: 'Espresso Drinks',
    retailPrice: 6.00,
    ingredients: [
      { inventoryName: 'Espresso', quantity: 2, usageUnit: 'oz', matchTerms: ['espresso', 'coffee bean', 'coffee'] },
      { inventoryName: 'Whole Milk', quantity: 8, usageUnit: 'oz', matchTerms: ['milk', 'whole milk', '2% milk', 'dairy'] },
      { inventoryName: 'Chocolate Syrup', quantity: 1, usageUnit: 'oz', matchTerms: ['chocolate', 'cocoa', 'mocha'] },
    ],
  },
  {
    name: 'Vanilla Latte 12oz',
    category: 'Espresso Drinks',
    retailPrice: 6.00,
    ingredients: [
      { inventoryName: 'Espresso', quantity: 2, usageUnit: 'oz', matchTerms: ['espresso', 'coffee bean', 'coffee'] },
      { inventoryName: 'Whole Milk', quantity: 9, usageUnit: 'oz', matchTerms: ['milk', 'whole milk', '2% milk', 'dairy'] },
      { inventoryName: 'Vanilla Syrup', quantity: 1, usageUnit: 'oz', matchTerms: ['vanilla', 'syrup'] },
    ],
  },
  {
    name: 'Drip Coffee 12oz',
    category: 'Brewed Coffee',
    retailPrice: 3.00,
    ingredients: [
      { inventoryName: 'Drip Coffee', quantity: 12, usageUnit: 'oz', matchTerms: ['drip', 'brew', 'coffee'] },
    ],
  },
  {
    name: 'Drip Coffee 16oz',
    category: 'Brewed Coffee',
    retailPrice: 3.50,
    ingredients: [
      { inventoryName: 'Drip Coffee', quantity: 16, usageUnit: 'oz', matchTerms: ['drip', 'brew', 'coffee'] },
    ],
  },
  {
    name: 'Hot Chocolate 12oz',
    category: 'Non-Coffee',
    retailPrice: 4.50,
    ingredients: [
      { inventoryName: 'Whole Milk', quantity: 10, usageUnit: 'oz', matchTerms: ['milk', 'whole milk', '2% milk', 'dairy'] },
      { inventoryName: 'Chocolate Syrup', quantity: 2, usageUnit: 'oz', matchTerms: ['chocolate', 'cocoa', 'mocha'] },
    ],
  },
  {
    name: 'Chai Latte 12oz',
    category: 'Non-Coffee',
    retailPrice: 5.50,
    ingredients: [
      { inventoryName: 'Chai Concentrate', quantity: 4, usageUnit: 'oz', matchTerms: ['chai', 'tea'] },
      { inventoryName: 'Whole Milk', quantity: 8, usageUnit: 'oz', matchTerms: ['milk', 'whole milk', '2% milk', 'dairy'] },
    ],
  },
];

// Helper to match inventory items to template ingredients
export function matchInventoryToTemplate(
  inventoryName: string,
  templates: RecipeTemplate[]
): string[] {
  const normalizedName = inventoryName.toLowerCase();
  const matches: string[] = [];

  for (const template of templates) {
    for (const ing of template.ingredients) {
      if (ing.matchTerms.some(term => normalizedName.includes(term.toLowerCase()))) {
        if (!matches.includes(ing.inventoryName)) {
          matches.push(ing.inventoryName);
        }
      }
    }
  }

  return matches;
}
