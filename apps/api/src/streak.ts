import { prisma } from './db.js';
import { startOfIstDay } from './time.js';
import { isBalancedDayForStreak } from '@srujuna/shared';

export async function evaluateAndRecordStreakForDay(userId: string, when: Date) {
  const day = startOfIstDay(when);

  const [limits, intake, flags] = await Promise.all([
    prisma.dailyLimits.findUnique({ where: { userId_date: { userId, date: day } } }),
    prisma.dailyIntake.findUnique({ where: { userId_date: { userId, date: day } } }),
    prisma.redFlags.findUnique({ where: { userId_date: { userId, date: day } } })
  ]);

  if (!limits || !intake || !flags) return { earned: false };

  const highRisk = limits.prefAtTime !== 'NORMAL';

  const earned = isBalancedDayForStreak({
    total_free_sugar_g: intake.freeSugarG,
    daily_sugar_limit_g: limits.sugarLimit,
    red_fat_items: flags.redFatItems,
    red_salt_items: flags.redSaltItems,
    high_risk_user: highRisk
  });

  // Streak count is per consecutive earned days; we only compute incrementally.
  const yesterday = new Date(day.getTime() - 24 * 60 * 60 * 1000);
  const prev = await prisma.streakHistory.findUnique({ where: { userId_date: { userId, date: yesterday } } });
  const streakCount = earned ? ((prev?.earned ? prev.streakCount : 0) + 1) : 0;

  await prisma.streakHistory.upsert({
    where: { userId_date: { userId, date: day } },
    update: { earned, streakCount, endedReason: earned ? null : 'NOT_BALANCED' },
    create: { userId, date: day, earned, streakCount, endedReason: earned ? null : 'NOT_BALANCED' }
  });

  return { earned, streakCount };
}


