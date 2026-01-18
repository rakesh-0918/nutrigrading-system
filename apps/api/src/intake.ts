import { prisma } from './db.js';
import { startOfIstDay } from './time.js';

export type IntakeDelta = {
  freeSugarG?: number;
  naturalSugarG?: number;
  fatG?: number;
  satFatG?: number;
  saltG?: number;
  redFat?: boolean;
  redSalt?: boolean;
};

export async function applyConsumption(userId: string, when: Date, delta: IntakeDelta) {
  const day = startOfIstDay(when);

  await prisma.$transaction(async (tx) => {
    await tx.dailyIntake.upsert({
      where: { userId_date: { userId, date: day } },
      update: {
        freeSugarG: { increment: delta.freeSugarG ?? 0 },
        naturalSugarG: { increment: delta.naturalSugarG ?? 0 },
        fatG: { increment: delta.fatG ?? 0 },
        satFatG: { increment: delta.satFatG ?? 0 },
        saltG: { increment: delta.saltG ?? 0 }
      },
      create: {
        userId,
        date: day,
        freeSugarG: delta.freeSugarG ?? 0,
        naturalSugarG: delta.naturalSugarG ?? 0,
        fatG: delta.fatG ?? 0,
        satFatG: delta.satFatG ?? 0,
        saltG: delta.saltG ?? 0
      }
    });

    await tx.redFlags.upsert({
      where: { userId_date: { userId, date: day } },
      update: {
        redFatItems: delta.redFat ? { increment: 1 } : undefined,
        redSaltItems: delta.redSalt ? { increment: 1 } : undefined
      },
      create: {
        userId,
        date: day,
        redFatItems: delta.redFat ? 1 : 0,
        redSaltItems: delta.redSalt ? 1 : 0
      }
    });
  });
}


