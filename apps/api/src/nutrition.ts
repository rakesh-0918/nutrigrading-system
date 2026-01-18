import {
  assertConfidenceOrThrow,
  singaporeNutriGradeFromSugarPer100ml,
  ukTrafficLightFatPer100g,
  ukTrafficLightSaltPer100g,
  ukTrafficLightSugarPer100g,
  RISK_ASSOCIATIONS_COPY
} from '@srujuna/shared';

export type FoodKind = 'BEVERAGE' | 'SOLID' | 'FRUIT_VEG' | 'NOT_FOOD' | 'UNKNOWN';

export type NutritionPer100 = {
  sugar_g?: number;
  fat_g?: number;
  sat_fat_g?: number;
  salt_g?: number;
};

export type GradeResult =
  | {
      kind: 'BEVERAGE';
      nutriGrade: 'A' | 'B' | 'C' | 'D';
      sugar_g_per_100ml: number;
      warnings: string[];
      riskAssociations: string[];
    }
  | {
      kind: 'SOLID';
      traffic: {
        sugar: 'GREEN' | 'AMBER' | 'RED';
        fat: 'GREEN' | 'AMBER' | 'RED';
        salt: 'GREEN' | 'AMBER' | 'RED';
      };
      per100g: Required<Pick<NutritionPer100, 'sugar_g' | 'fat_g' | 'salt_g'>> & Partial<Pick<NutritionPer100, 'sat_fat_g'>>;
      warnings: string[];
      riskAssociations: string[];
    }
  | {
      kind: 'FRUIT_VEG';
      naturalSugarInfo: string;
      warnings: string[];
      riskAssociations: string[];
    };

export function gradeFromTrustedNutrition(params: {
  kind: FoodKind;
  confidence0to100: number;
  per100: NutritionPer100;
  isFruitOrVeg: boolean;
}): GradeResult {
  assertConfidenceOrThrow(params.confidence0to100);

  if (params.kind === 'NOT_FOOD') {
    throw new Error('NOT_FOOD');
  }

  if (params.isFruitOrVeg) {
    return {
      kind: 'FRUIT_VEG',
      naturalSugarInfo: 'Natural sugars from fruits and vegetables do not affect your daily limits.',
      warnings: [],
      riskAssociations: []
    };
  }

  // We NEVER guess nutriments; require required fields per kind.
  if (params.kind === 'BEVERAGE') {
    const sugar = params.per100.sugar_g;
    if (sugar == null) throw new Error('MISSING_TRUSTED_SUGAR');

    const grade = singaporeNutriGradeFromSugarPer100ml(sugar);
    const warnings: string[] = [];
    if (grade === 'C' || grade === 'D') warnings.push('High sugar drink: consider a lower sugar option.');

    return {
      kind: 'BEVERAGE',
      nutriGrade: grade,
      sugar_g_per_100ml: sugar,
      warnings,
      riskAssociations: [
        RISK_ASSOCIATIONS_COPY.DIABETES,
        RISK_ASSOCIATIONS_COPY.OBESITY,
        RISK_ASSOCIATIONS_COPY.DENTAL_PROBLEMS,
        RISK_ASSOCIATIONS_COPY.FATTY_LIVER
      ]
    };
  }

  // SOLID
  const sugar = params.per100.sugar_g;
  const fat = params.per100.fat_g;
  const salt = params.per100.salt_g;
  if (sugar == null || fat == null || salt == null) {
    throw new Error('MISSING_TRUSTED_MACROS');
  }

  const traffic = {
    sugar: ukTrafficLightSugarPer100g(sugar),
    fat: ukTrafficLightFatPer100g(fat),
    salt: ukTrafficLightSaltPer100g(salt)
  };

  const warnings: string[] = [];
  if (traffic.sugar === 'RED') warnings.push('High sugar food: reduce frequency.');
  if (traffic.fat === 'RED') warnings.push('High fat food: consider a lower fat option.');
  if (traffic.salt === 'RED') warnings.push('High salt food: may raise blood pressure risk.');

  return {
    kind: 'SOLID',
    traffic,
    per100g: { sugar_g: sugar, fat_g: fat, salt_g: salt, sat_fat_g: params.per100.sat_fat_g },
    warnings,
    riskAssociations: [
      RISK_ASSOCIATIONS_COPY.DIABETES,
      RISK_ASSOCIATIONS_COPY.HIGH_BP,
      RISK_ASSOCIATIONS_COPY.HEART_DISEASE,
      RISK_ASSOCIATIONS_COPY.OBESITY,
      RISK_ASSOCIATIONS_COPY.FATTY_LIVER
    ]
  };
}

export function isLikelyBeverageFromOff(off: { categories_tags?: string[]; nutriments?: Record<string, any> }): boolean {
  const cats = off.categories_tags ?? [];
  if (cats.some((c) => c.includes('beverages') || c.includes('drinks') || c.includes('en:beverages'))) return true;
  // OFF sometimes provides 'nutrition-data-per' and serving size; keep conservative.
  return false;
}

export function isFruitVegFromOff(off: { categories_tags?: string[]; product_name?: string }): boolean {
  const cats = off.categories_tags ?? [];
  if (cats.some((c) => c.includes('fruits') || c.includes('vegetables'))) return true;
  const name = (off.product_name ?? '').toLowerCase();
  if (name.includes('apple') || name.includes('banana') || name.includes('orange') || name.includes('tomato')) return true;
  return false;
}

export function parseOffNutriments(off: any, kind?: FoodKind): NutritionPer100 {
  const n = off?.nutriments ?? {};
  // OFF uses: sugars_100g, fat_100g, saturated-fat_100g, salt_100g (and sometimes *_100ml)
  // For beverages, prefer per 100ml; for others, prefer per 100g
  const isBeverage = kind === 'BEVERAGE';
  const sugar = toNum(isBeverage ? n['sugars_100ml'] ?? n['sugars_100g'] : n['sugars_100g'] ?? n['sugars_100ml']);
  const fat = toNum(isBeverage ? n['fat_100ml'] ?? n['fat_100g'] : n['fat_100g'] ?? n['fat_100ml']);
  const sat = toNum(isBeverage ? n['saturated-fat_100ml'] ?? n['saturated-fat_100g'] : n['saturated-fat_100g'] ?? n['saturated-fat_100ml']);
  const salt = toNum(isBeverage ? n['salt_100ml'] ?? n['salt_100g'] : n['salt_100g'] ?? n['salt_100ml']);
  return {
    sugar_g: sugar ?? undefined,
    fat_g: fat ?? undefined,
    sat_fat_g: sat ?? undefined,
    salt_g: salt ?? undefined
  };
}

function toNum(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}


