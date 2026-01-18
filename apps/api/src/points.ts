import { prisma } from './db.js';
import { pointsDeltaForEvent, type PointsEventType } from '@srujuna/shared';

export async function recordPoints(userId: string, type: PointsEventType, meta?: any) {
  const delta = pointsDeltaForEvent(type);

  await prisma.$transaction(async (tx) => {
    await tx.pointsHistory.create({
      data: { userId, type: type as any, delta, meta }
    });

    const lb = await tx.leaderboard.findUnique({ where: { userId } });
    const nextPoints = (lb?.points ?? 0) + delta;

    if (!lb) {
      await tx.leaderboard.create({ data: { userId, points: nextPoints, reachedAt: new Date() } });
      return;
    }

    // FIFO rule: only update reachedAt when the score increases above previous total.
    await tx.leaderboard.update({
      where: { userId },
      data: {
        points: nextPoints,
        reachedAt: delta > 0 ? new Date() : lb.reachedAt
      }
    });
  });
}


