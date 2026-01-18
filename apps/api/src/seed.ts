import 'dotenv/config';
import { prisma } from './db.js';
import bcrypt from 'bcryptjs';
import { startOfIstDay } from './time.js';

async function main() {
  const phone = '+910000000000';
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) return;

  const passwordHash = await bcrypt.hash('demo1234', 12);
  const user = await prisma.user.create({
    data: {
      phone,
      passwordHash,
      name: 'Demo User',
      profile: { create: { age: 30, gender: 'PREFER_NOT_TO_SAY' } },
      preferenceHistory: {
        create: {
          preference: 'NORMAL',
          effectiveFrom: startOfIstDay(new Date())
        }
      },
      languagePreference: { create: { language: 'en-IN' } },
      leaderboard: { create: { points: 0 } }
    }
  });

  console.log('Seeded user', user.phone);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });


