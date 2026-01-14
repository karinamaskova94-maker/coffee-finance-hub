import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExtractedReceipt {
  merchant: string;
  total: number;
  tax: number;
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, stateTaxRate = 9.5 } = await req.json();
    
    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Use Gemini 2.5 Flash for OCR - great balance of speed and accuracy for receipt parsing
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert receipt OCR analyzer specializing in California retail receipts, especially Costco receipts.

Your task is to extract structured data from receipt images with high accuracy.

CALIFORNIA TAX RULES:
- California sales tax applies to most retail purchases
- Food for home consumption is generally TAX EXEMPT
- Prepared food, hot food, and restaurant meals are TAXABLE

COSTCO RECEIPT CODES (look for these next to prices):
- "A" = Taxable merchandise
- "E" = Tax-exempt item (usually food/grocery)
- "F" = Food item (tax-exempt)
- Sometimes shown as "T" or "X" for taxable items

EXTRACTION RULES:
1. Look for the merchant name at the top of the receipt
2. Find the TOTAL or GRAND TOTAL amount
3. Find the TAX amount (often labeled "TAX", "SALES TAX", or "CA TAX")
4. Extract the date in any format and normalize to YYYY-MM-DD
5. For Costco: identify items marked with A (taxable) vs E/F (exempt)
6. Calculate taxable vs non-taxable portions

CATEGORIZATION LOGIC:
- If Tax = $0 AND merchant is Costco → All items are food/grocery → Category: COGS
- If Tax > $0 AND merchant is Costco → Has taxable items → Split amounts
- If mixed: taxable portion → Supplies, non-taxable portion → COGS

Return your analysis as a JSON object.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this receipt image and extract the following:
1. Merchant name
2. Total amount (as a number)
3. Tax amount shown on receipt (as a number, 0 if no tax)
4. Receipt date (in YYYY-MM-DD format)
5. Whether this is primarily a food/grocery purchase
6. Taxable amount (portion of total that was taxed)
7. Non-taxable amount (tax-exempt portion, typically food at Costco)
8. Category: "cogs" for food/grocery, "supplies" for taxable items, "mixed" if both
9. Whether there are tax savings (food items without tax)
10. If visible, list individual items with their tax codes

State tax rate for reference: ${stateTaxRate}%

Return ONLY valid JSON in this exact format:
{
  "merchant": "string",
  "total": number,
  "tax": number,
  "date": "YYYY-MM-DD",
  "isFoodItem": boolean,
  "taxableAmount": number,
  "nonTaxableAmount": number,
  "category": "cogs" | "supplies" | "mixed",
  "hasTaxSavings": boolean,
  "rawItems": [{"name": "string", "price": number, "taxCode": "string", "isTaxable": boolean}]
}`
              },
              {
                type: "image_url",
                image_url: {
                  url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 2000,
        temperature: 0.1, // Low temperature for more accurate extraction
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please check your account." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    // Parse the JSON response from AI
    let extractedData: ExtractedReceipt;
    try {
      // Extract JSON from the response (handle markdown code blocks)
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                        content.match(/```\s*([\s\S]*?)\s*```/) ||
                        [null, content];
      const jsonStr = jsonMatch[1] || content;
      extractedData = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse receipt data");
    }

    // Validate and clean the data
    const result: ExtractedReceipt = {
      merchant: extractedData.merchant || "Unknown",
      total: typeof extractedData.total === 'number' ? extractedData.total : parseFloat(String(extractedData.total)) || 0,
      tax: typeof extractedData.tax === 'number' ? extractedData.tax : parseFloat(String(extractedData.tax)) || 0,
      date: extractedData.date || new Date().toISOString().split('T')[0],
      isFoodItem: Boolean(extractedData.isFoodItem),
      taxableAmount: typeof extractedData.taxableAmount === 'number' ? extractedData.taxableAmount : 0,
      nonTaxableAmount: typeof extractedData.nonTaxableAmount === 'number' ? extractedData.nonTaxableAmount : 0,
      category: ['cogs', 'supplies', 'mixed'].includes(extractedData.category) ? extractedData.category : 'cogs',
      hasTaxSavings: Boolean(extractedData.hasTaxSavings),
      rawItems: Array.isArray(extractedData.rawItems) ? extractedData.rawItems : undefined,
    };

    // Apply Costco-specific logic
    const isCostco = result.merchant.toLowerCase().includes('costco');
    if (isCostco) {
      if (result.tax === 0) {
        // All food purchase
        result.category = 'cogs';
        result.isFoodItem = true;
        result.nonTaxableAmount = result.total;
        result.taxableAmount = 0;
        result.hasTaxSavings = true;
      } else if (result.tax > 0) {
        // Has taxable items - calculate split
        // If we don't have precise amounts, estimate from tax
        if (!result.taxableAmount || result.taxableAmount === 0) {
          // Reverse calculate taxable amount from tax: taxable = tax / rate
          result.taxableAmount = result.tax / (stateTaxRate / 100);
          result.nonTaxableAmount = result.total - result.taxableAmount - result.tax;
          
          // Ensure non-negative
          if (result.nonTaxableAmount < 0) {
            result.nonTaxableAmount = 0;
            result.taxableAmount = result.total - result.tax;
          }
        }
        
        result.category = result.nonTaxableAmount > 0 ? 'mixed' : 'supplies';
        result.hasTaxSavings = result.nonTaxableAmount > 0;
        result.isFoodItem = result.nonTaxableAmount > result.taxableAmount;
      }
    }

    console.log("Extracted receipt data:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Receipt scan error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Failed to scan receipt",
        fallback: true
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
