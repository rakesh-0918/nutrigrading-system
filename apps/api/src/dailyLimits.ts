import { prisma } from './db.js';
import { startOfIstDay } from './time.js';
import { dailyLimitsForPreference, type HealthPreference } from '@srujuna/shared';

export async function upsertDailyLimitsForDate(date: Date) {
  const day = startOfIstDay(date);

  const users = await prisma.user.findMany({
    select: { id: true }
  });

  for (const u of users) {
    const pref = await preferenceEffectiveForUserOn(u.id, day);
    const limits = dailyLimitsForPreference(pref as any);

    await prisma.dailyLimits.upsert({
      where: { userId_date: { userId: u.id, date: day } },
      update: {}, // never rewrite past health data; idempotent insert
      create: {
        userId: u.id,
        date: day,
        sugarLimit: limits.sugar_g,
        fatLimit: limits.fat_g,
        satFatLimit: limits.sat_fat_g,
        saltLimit: limits.salt_g,
        prefAtTime: pref
      }
    });

    await prisma.dailyIntake.upsert({
      where: { userId_date: { userId: u.id, date: day } },
      update: {},
      create: { userId: u.id, date: day }
    });

    await prisma.redFlags.upsert({
      where: { userId_date: { userId: u.id, date: day } },
      update: {},
      create: { userId: u.id, date: day }
    });

    await prisma.streakHistory.upsert({
      where: { userId_date: { userId: u.id, date: day } },
      update: {},
      create: { userId: u.id, date: day, earned: false, streakCount: 0 }
    });
  }
}

async function preferenceEffectiveForUserOn(userId: string, day: Date): Promise<HealthPreference> {
  // Latest preferenceHistory entry where effectiveFrom <= day
  const pref = await prisma.healthPreferenceHistory.findFirst({
    where: { userId, effectiveFrom: { lte: day } },
    orderBy: { effectiveFrom: 'desc' }
  });

  return (pref?.preference ?? 'NORMAL') as HealthPreference;
}


