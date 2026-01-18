export type OffProduct = {
  code: string;
  product_name?: string;
  categories_tags?: string[];
  nutriments?: Record<string, any>;
  serving_size?: string;
};

export async function fetchOffByBarcode(barcode: string): Promise<OffProduct | null> {
  try {
    // Validate barcode input
    if (!barcode || typeof barcode !== 'string') {
      console.error('Invalid barcode provided:', barcode);
      return null;
    }

    // Clean the barcode (remove spaces, ensure it's numeric)
    const cleanBarcode = barcode.trim().replace(/\s+/g, '');

    // Basic validation - barcodes should be numeric and reasonable length
    if (!/^\d+$/.test(cleanBarcode) || cleanBarcode.length < 8 || cleanBarcode.length > 18) {
      console.error('Invalid barcode format:', cleanBarcode);
      return null;
    }

    const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(cleanBarcode)}.json`;

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Srujuna-App/1.0 (https://srujuna.com)'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.error(`OpenFoodFacts API error: ${res.status} ${res.statusText}`);
      return null;
    }

    const data: any = await res.json().catch((error) => {
      console.error('Failed to parse OpenFoodFacts response:', error);
      return null;
    });

    // Check for API-level errors
    if (!data) {
      console.error('No data received from OpenFoodFacts');
      return null;
    }

    // Check product status - status 1 means product found
    if (data.status !== 1) {
      console.log(`Product not found for barcode ${cleanBarcode}: status ${data.status}`);
      return null;
    }

    // Validate the product data
    const product = data.product;
    if (!product) {
      console.error('No product data in response');
      return null;
    }

    // Ensure product has basic required fields
    if (!product.code) {
      console.error('Product missing code field');
      return null;
    }

    // Log successful fetch for debugging
    console.log(`Successfully fetched product: ${product.product_name || 'Unknown'} (${product.code})`);

    return product as OffProduct;

  } catch (error) {
    console.error('Error fetching product by barcode:', error);
    return null;
  }
}

export async function searchOffByText(query: string): Promise<OffProduct | null> {
  try {
    // Clean and prepare the query
    const cleanQuery = query.trim().toLowerCase();

    // Try multiple search strategies
    const searchStrategies = [
      // Strategy 1: Direct product name search
      `https://world.openfoodfacts.org/api/v2/search?q=${encodeURIComponent(cleanQuery)}&fields=code,product_name,categories_tags,nutriments,serving_size&sort_by=popularity&page_size=5`,
      // Strategy 2: Category-based search
      `https://world.openfoodfacts.org/api/v2/search?categories_tags_en=${encodeURIComponent(cleanQuery)}&fields=code,product_name,categories_tags,nutriments,serving_size&sort_by=popularity&page_size=5`,
      // Strategy 3: Tag-based search
      `https://world.openfoodfacts.org/api/v2/search?tag=${encodeURIComponent(cleanQuery)}&fields=code,product_name,categories_tags,nutriments,serving_size&sort_by=popularity&page_size=5`
    ];

    for (const url of searchStrategies) {
      const res = await fetch(url);
      if (!res.ok) continue;

      const data: any = await res.json().catch(() => null);
      if (!data?.products?.length) continue;

      // Find the best match - prefer products with complete nutrition data
      const products = data.products.filter((p: any) =>
        p.product_name &&
        p.nutriments &&
        (p.nutriments.energy_100g || p.nutriments['energy-kcal_100g'])
      );

      if (products.length > 0) {
        return products[0] as OffProduct;
      }

      // If no products with nutrition data, return the first one
      return data.products[0] as OffProduct;
    }

    return null;
  } catch (error) {
    console.error('OpenFoodFacts search error:', error);
    return null;
  }
}


