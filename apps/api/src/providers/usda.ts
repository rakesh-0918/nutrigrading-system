export type UsdaFood = {
  fdcId: number;
  description: string;
  foodNutrients?: Array<{ nutrientName: string; unitName: string; value: number }>;
};

export async function usdaSearchOne(query: string): Promise<UsdaFood | null> {
  const key = process.env.USDA_API_KEY;
  if (!key) return null;

  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, pageSize: 1 })
  });

  if (!res.ok) return null;
  const data: any = await res.json().catch(() => null);
  const food = data?.foods?.[0];
  if (!food?.fdcId) return null;
  return food as UsdaFood;
}


