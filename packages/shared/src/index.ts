export type HealthPreference =
  | 'NORMAL'
  | 'DIABETES_T1'
  | 'DIABETES_T2'
  | 'HIGH_BP'
  | 'FAT_RELATED_OBESITY'
  | 'DIABETES_OBESITY';

export type DailyLimits = {
  sugar_g: number;
  fat_g: number;
  sat_fat_g: number;
  salt_g: number;
};

export const MIN_CONFIDENCE = 70;

export function assertConfidenceOrThrow(confidence0to100: number): void {
  if (!Number.isFinite(confidence0to100) || confidence0to100 < MIN_CONFIDENCE) {
    throw new Error('LOW_CONFIDENCE');
  }
}

export function dailyLimitsForPreference(pref: HealthPreference): DailyLimits {
  // WHO + UK public-health guidance (as specified)
  switch (pref) {
    case 'NORMAL':
      return { sugar_g: 25, fat_g: 70, sat_fat_g: 20, salt_g: 5 };
    case 'DIABETES_T1':
    case 'DIABETES_T2':
      return { sugar_g: 15, fat_g: 65, sat_fat_g: 15, salt_g: 5 };
    case 'HIGH_BP':
      return { sugar_g: 20, fat_g: 65, sat_fat_g: 15, salt_g: 4 };
    case 'FAT_RELATED_OBESITY':
      // Choose stricter end within allowed range.
      return { sugar_g: 20, fat_g: 55, sat_fat_g: 12, salt_g: 5 };
    case 'DIABETES_OBESITY':
      // Choose stricter end within allowed range.
      return { sugar_g: 10, fat_g: 55, sat_fat_g: 10, salt_g: 4 };
    default: {
      const _exhaustive: never = pref;
      return _exhaustive;
    }
  }
}

export type NutriGrade = 'A' | 'B' | 'C' | 'D';

export function singaporeNutriGradeFromSugarPer100ml(sugar_g_per_100ml: number): NutriGrade {
  if (!Number.isFinite(sugar_g_per_100ml) || sugar_g_per_100ml < 0) throw new Error('INVALID_SUGAR');
  if (sugar_g_per_100ml <= 1) return 'A';
  if (sugar_g_per_100ml <= 5) return 'B';
  if (sugar_g_per_100ml <= 10) return 'C';
  return 'D';
}

export type TrafficLight = 'GREEN' | 'AMBER' | 'RED';

export function ukTrafficLightSugarPer100g(sugar_g_per_100g: number): TrafficLight {
  if (!Number.isFinite(sugar_g_per_100g) || sugar_g_per_100g < 0) throw new Error('INVALID_SUGAR');
  if (sugar_g_per_100g <= 5) return 'GREEN';
  if (sugar_g_per_100g <= 22.5) return 'AMBER';
  return 'RED';
}

export function ukTrafficLightFatPer100g(fat_g_per_100g: number): TrafficLight {
  if (!Number.isFinite(fat_g_per_100g) || fat_g_per_100g < 0) throw new Error('INVALID_FAT');
  if (fat_g_per_100g <= 3) return 'GREEN';
  if (fat_g_per_100g <= 17.5) return 'AMBER';
  return 'RED';
}

export function ukTrafficLightSaltPer100g(salt_g_per_100g: number): TrafficLight {
  if (!Number.isFinite(salt_g_per_100g) || salt_g_per_100g < 0) throw new Error('INVALID_SALT');
  if (salt_g_per_100g <= 0.3) return 'GREEN';
  if (salt_g_per_100g <= 1.5) return 'AMBER';
  return 'RED';
}

export type RiskAssociationKey =
  | 'DIABETES'
  | 'HIGH_BP'
  | 'HEART_DISEASE'
  | 'OBESITY'
  | 'FATTY_LIVER'
  | 'DENTAL_PROBLEMS';

export const RISK_ASSOCIATIONS_COPY: Record<RiskAssociationKey, string> = {
  DIABETES: 'High intake may increase risk of diabetes.',
  HIGH_BP: 'High intake may increase risk of high blood pressure.',
  HEART_DISEASE: 'High intake may increase risk of heart disease.',
  OBESITY: 'High intake may increase risk of obesity.',
  FATTY_LIVER: 'High intake may increase risk of fatty liver.',
  DENTAL_PROBLEMS: 'High intake may increase risk of dental problems.'
};

export type StreakEligibilityInput = {
  total_free_sugar_g: number; // excludes natural sugar from fruits/veg
  daily_sugar_limit_g: number;
  red_fat_items: number;
  red_salt_items: number;
  high_risk_user: boolean;
};

export function isBalancedDayForStreak(i: StreakEligibilityInput): boolean {
  // Non-negotiable: streak only if sugar within limit AND <=1 red fat AND <=1 red salt.
  // High-risk users: stricter enforcement.
  const sugarOk = i.total_free_sugar_g <= i.daily_sugar_limit_g;
  const fatOk = i.high_risk_user ? i.red_fat_items === 0 : i.red_fat_items <= 1;
  const saltOk = i.high_risk_user ? i.red_salt_items === 0 : i.red_salt_items <= 1;
  return sugarOk && fatOk && saltOk;
}

export type PointsEventType =
  | 'SCAN_FOOD'
  | 'BALANCED_DAY'
  | 'AVOID_RISKY_FOOD'
  | 'CHOOSE_HEALTHIER_OPTION'
  | 'REPEATED_EXCESS_SUGAR'
  | 'REPEATED_RED_FAT_SALT';

export function pointsDeltaForEvent(event: PointsEventType): number {
  switch (event) {
    case 'BALANCED_DAY':
      return 10;
    case 'SCAN_FOOD':
      return 2;
    case 'AVOID_RISKY_FOOD':
      return 3;
    case 'CHOOSE_HEALTHIER_OPTION':
      return 5;
    case 'REPEATED_EXCESS_SUGAR':
      return -5;
    case 'REPEATED_RED_FAT_SALT':
      return -5;
    default: {
      const _exhaustive: never = event;
      return _exhaustive;
    }
  }
}


