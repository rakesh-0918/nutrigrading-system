import { RekognitionClient, DetectLabelsCommand } from '@aws-sdk/client-rekognition';

export type RekognitionFoodResult = {
  isFood: boolean;
  confidence: number;
  topLabel?: string;
  labels: Array<{ name: string; confidence: number }>;
};

function client() {
  const region = process.env.AWS_REGION;
  if (!region) return null;
  return new RekognitionClient({ region });
}

export async function detectFoodLabels(imageBytes: Uint8Array): Promise<RekognitionFoodResult | null> {
  try {
    const c = client();
    if (!c) return null;

    const cmd = new DetectLabelsCommand({
      Image: { Bytes: imageBytes },
      MaxLabels: 10,
      MinConfidence: 70
    });

    const out = await c.send(cmd);
    const labels = (out.Labels ?? []).map((l) => ({
      name: l.Name ?? 'Unknown',
      confidence: l.Confidence ?? 0
    }));

    const foodLabels = ['Food', 'Meal', 'Drink', 'Beverage', 'Fruit', 'Vegetable', 'Produce', 'Plant', 'Cooking', 'Dish', 'Cuisine', 'Coffee', 'Tea', 'Juice', 'Dessert', 'Baked Goods', 'Pasta', 'Rice', 'Snack', 'Ingredient', 'Kitchen', 'Utensil', 'Bottle', 'Cup', 'Plate', 'Container'];
    const foodish = labels.find((l) => foodLabels.some(f => l.name.toLowerCase().includes(f.toLowerCase())));
    const confidence = foodish?.confidence ?? 0;

    // Only classify as food if we have a specific food-related label with decent confidence
    // OR if the top label is clearly food-related
    const topLabel = labels[0]?.name?.toLowerCase() || '';
    const isTopLabelFood = foodLabels.some(f => topLabel.includes(f.toLowerCase()));
    const isFood = (foodish && confidence >= 50) || (isTopLabelFood && labels[0]?.confidence >= 70);

    return {
      isFood,
      confidence: confidence || labels[0]?.confidence || 0,
      topLabel: labels[0]?.name,
      labels
    };
  } catch (e: any) {
    console.error('Rekognition error (AWS credentials may be missing):', e?.message);
    return null;
  }
}


