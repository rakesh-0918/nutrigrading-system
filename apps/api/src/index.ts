import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import cron from 'node-cron';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

import { prisma } from './db.js';
import { IST_TZ, startOfIstDay, startOfNextIstDay } from './time.js';
import { requireAuth, getAuth } from './auth.js';
import { upsertDailyLimitsForDate } from './dailyLimits.js';
import { recordPoints } from './points.js';
import { applyConsumption } from './intake.js';
import { evaluateAndRecordStreakForDay } from './streak.js';
import { fetchOffByBarcode, searchOffByText } from './providers/openFoodFacts.js';
import { usdaSearchOne } from './providers/usda.js';
import { detectFoodLabels } from './providers/rekognition.js';
import { gradeFromTrustedNutrition, isFruitVegFromOff, isLikelyBeverageFromOff, parseOffNutriments } from './nutrition.js';

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    credentials: true
  })
);

const SignupSchema = z.object({
  name: z.string().min(1),
  age: z.number().int().min(1).max(120),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']),
  phone: z.string().min(8).max(20),
  password: z.string().min(6).max(128)
});

app.post('/auth/signup', async (req, res) => {
  const parsed = SignupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT' });

  const { name, age, gender, phone, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) return res.status(409).json({ error: 'PHONE_ALREADY_EXISTS' });

  const passwordHash = await bcrypt.hash(password, 12);
  const day = startOfIstDay(new Date());

  const user = await prisma.user.create({
    data: {
      phone,
      passwordHash,
      name,
      profile: { create: { age, gender } },
      preferenceHistory: {
        create: { preference: 'NORMAL', effectiveFrom: day }
      },
      languagePreference: { create: { language: 'en-IN' } },
      leaderboard: { create: { points: 0 } }
    },
    select: { id: true, name: true, phone: true }
  });

  await upsertDailyLimitsForDate(day);

  const secret = process.env.JWT_SECRET;
  if (!secret) return res.status(500).json({ error: 'SERVER_MISCONFIGURED' });
  const token = jwt.sign({ userId: user.id }, secret, { expiresIn: '30d' });
  res.cookie('auth', token, { httpOnly: true, sameSite: 'lax', secure: false });

  return res.json({ user });
});

const LoginSchema = z.object({
  phone: z.string().min(8).max(20),
  password: z.string().min(6).max(128)
});

app.post('/auth/login', async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT' });

  const { phone, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) return res.status(401).json({ error: 'INVALID_CREDENTIALS' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'INVALID_CREDENTIALS' });

  const secret = process.env.JWT_SECRET;
  if (!secret) return res.status(500).json({ error: 'SERVER_MISCONFIGURED' });
  const token = jwt.sign({ userId: user.id }, secret, { expiresIn: '30d' });
  res.cookie('auth', token, { httpOnly: true, sameSite: 'lax', secure: false });

  return res.json({ user: { id: user.id, name: user.name, phone: user.phone } });
});

app.post('/auth/logout', (_req, res) => {
  res.clearCookie('auth');
  res.json({ ok: true });
});

app.get('/me', requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      phone: true,
      profile: true,
      languagePreference: true,
      leaderboard: true
    }
  });
  res.json({ user });
});

// Today's snapshot + totals (for home dashboard)
app.get('/day/today', requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const day = startOfIstDay(new Date());
  const [limits, intake, flags, streak, leaderboard] = await Promise.all([
    prisma.dailyLimits.findUnique({ where: { userId_date: { userId, date: day } } }),
    prisma.dailyIntake.findUnique({ where: { userId_date: { userId, date: day } } }),
    prisma.redFlags.findUnique({ where: { userId_date: { userId, date: day } } }),
    prisma.streakHistory.findUnique({ where: { userId_date: { userId, date: day } } }),
    prisma.leaderboard.findUnique({ where: { userId } })
  ]);
  res.json({ date: day, limits, intake, flags, streak, points: leaderboard?.points ?? 0 });
});

// Scan history
app.get('/scans/recent', requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const take = Math.min(50, Math.max(1, Number(req.query.take ?? 20)));
  const scans = await prisma.scanHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take,
    select: { id: true, createdAt: true, source: true, confidence: true, kind: true, title: true, barcode: true, consumed: true }
  });
  res.json({ scans });
});

// Language preference
const UpdateLanguageSchema = z.object({
  language: z.enum(['en-IN', 'hi-IN', 'te-IN', 'ta-IN', 'kn-IN', 'ml-IN', 'bn-IN', 'mr-IN'])
});
app.post('/language', requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const parsed = UpdateLanguageSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT' });

  const lp = await prisma.languagePreference.upsert({
    where: { userId },
    update: { language: parsed.data.language },
    create: { userId, language: parsed.data.language }
  });
  res.json({ ok: true, language: lp.language });
});

// Profile updates
const UpdateNameSchema = z.object({ name: z.string().min(1) });
app.post('/profile/name', requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const parsed = UpdateNameSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT' });

  const user = await prisma.user.update({
    where: { id: userId },
    data: { name: parsed.data.name },
    select: { id: true, name: true }
  });

  res.json({ user });
});

const UpdatePreferenceSchema = z.object({
  preference: z.enum([
    'NORMAL',
    'DIABETES_T1',
    'DIABETES_T2',
    'HIGH_BP',
    'FAT_RELATED_OBESITY',
    'DIABETES_OBESITY'
  ])
});

app.post('/profile/preference', requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const parsed = UpdatePreferenceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT' });

  const now = new Date();
  const effectiveFrom = startOfNextIstDay(now); // FUTURE ONLY

  await prisma.healthPreferenceHistory.create({
    data: {
      userId,
      preference: parsed.data.preference,
      effectiveFrom
    }
  });

  // End streak immediately (future days only, but streak continuity breaks now)
  const today = startOfIstDay(now);
  await prisma.streakHistory.upsert({
    where: { userId_date: { userId, date: today } },
    update: { earned: false, streakCount: 0, endedReason: 'PROFILE_CHANGED' },
    create: { userId, date: today, earned: false, streakCount: 0, endedReason: 'PROFILE_CHANGED' }
  });

  res.json({
    ok: true,
    voice: 'Your health preference is updated. New limits apply from tomorrow.'
  });
});

// Optional bonus points (user self-report via voice/tap)
const BonusPointsSchema = z.object({
  type: z.enum(['CHOOSE_HEALTHIER_OPTION'])
});
app.post('/points/bonus', requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const parsed = BonusPointsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT' });
  await recordPoints(userId, parsed.data.type as any, {});
  res.json({ ok: true });
});

// Leaderboard (Top 50) - mask identity
app.get('/leaderboard/top', async (_req, res) => {
  const top = await prisma.leaderboard.findMany({
    orderBy: [{ points: 'desc' }, { reachedAt: 'asc' }],
    take: 50,
    select: {
      points: true,
      reachedAt: true,
      user: { select: { name: true } }
    }
  });

  const masked = top.map((row, idx) => ({
    rank: idx + 1,
    points: row.points,
    reachedAt: row.reachedAt,
    displayName: maskName(row.user.name)
  }));

  res.json({ top: masked });
});

function maskName(name: string) {
  const trimmed = name.trim();
  if (trimmed.length <= 2) return trimmed[0] + '*';
  return trimmed[0] + '*'.repeat(Math.min(6, trimmed.length - 2)) + trimmed[trimmed.length - 1];
}

// =========================
// Scan + trusted nutrition
// =========================
const AnalyzeSchema = z.object({
  source: z.enum(['CAMERA', 'UPLOAD']),
  confidence: z.number().int().min(0).max(100),
  // Browser sends base64 without data URL prefix.
  imageBase64: z.string().min(10),
  barcodes: z.array(z.string().min(3)).default([]),
  // If present, a human-friendly query derived from label detection (no nutrition guess).
  hintText: z.string().optional()
});

app.post('/scan/analyze', requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const parsed = AnalyzeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT' });

  const { source, confidence, imageBase64, barcodes, hintText } = parsed.data;
  if (confidence < 70) {
    return res.status(400).json({ error: 'LOW_CONFIDENCE', voice: 'Please adjust the camera angle and scan again.' });
  }

  // Always record scan points (scan action itself).
  await recordPoints(userId, 'SCAN_FOOD', { source, confidence });

  const imageBytes = Buffer.from(imageBase64, 'base64');

  const barcodeQueue = barcodes.slice(0, 10); // safety cap
  const results: any[] = [];

  console.log(`Scan analyze: received ${barcodes.length} barcodes:`, barcodes);
  console.log(`Scan analyze: barcodeQueue:`, barcodeQueue);
  console.log(`Scan analyze: source=${source}, confidence=${confidence}, hintText=${hintText}`);
  console.log(`Scan analyze: imageBase64 length=${imageBase64.length}`);

  // If no barcode product found, attempt Rekognition to decide if it's food.
  let foodConfidence = 100;
  let topLabel: string | undefined;
  if (barcodeQueue.length === 0) {
    const rek = await detectFoodLabels(new Uint8Array(imageBytes));
    if (rek) {
      foodConfidence = Math.round(rek.confidence);
      topLabel = rek.topLabel;
      if (!rek.isFood) {
        const scan = await prisma.scanHistory.create({
          data: { userId, source, confidence, kind: 'NOT_FOOD', raw: { rekognition: rek } }
        });
        return res.json({ kind: 'NOT_FOOD', voice: 'This does not look like a food item.', scanId: scan.id });
      }
    }
  }

  const analyzeOne = async (barcodeUsed?: string) => {
    let off: any = null;
    if (barcodeUsed) off = await fetchOffByBarcode(barcodeUsed);
    if (!off && hintText) off = await searchOffByText(hintText);
    if (!off && topLabel) off = await searchOffByText(topLabel);

    if (!off) {
      const scan = await prisma.scanHistory.create({
        data: { userId, source, confidence, kind: 'UNKNOWN', raw: { rekognition: topLabel }, barcode: barcodeUsed }
      });
      return {
        kind: 'UNKNOWN',
        voice: 'I could not find a barcode or trusted nutrition match. Please try scanning the barcode side.',
        scanId: scan.id
      };
    }

    let kind: 'BEVERAGE' | 'SOLID' | 'FRUIT_VEG' | 'UNKNOWN' = 'UNKNOWN';
    let title: string | undefined = off.product_name ?? undefined;
    const isFruitVeg = isFruitVegFromOff(off);
    const likelyBeverage = isLikelyBeverageFromOff(off);
    kind = isFruitVeg ? 'FRUIT_VEG' : likelyBeverage ? 'BEVERAGE' : 'SOLID';
    let per100: any = parseOffNutriments(off, kind);
    const raw: any = { openFoodFacts: off };
    let grade: any = null;

    try {
      grade = gradeFromTrustedNutrition({ kind, confidence0to100: confidence, per100, isFruitOrVeg: isFruitVeg });
    } catch (e: any) {
      const usda = await usdaSearchOne(title ?? hintText ?? topLabel ?? '');
      if (!usda) {
        const scan = await prisma.scanHistory.create({
          data: { userId, source, confidence, kind: 'UNKNOWN', raw: { ...raw, error: e?.message ?? 'NO_TRUSTED_NUTRITION' }, barcode: barcodeUsed, title }
        });
        return {
          kind: 'UNKNOWN',
          voice: 'I could not find trusted nutrition data for this item. Please scan a packaged label with barcode.',
          scanId: scan.id
        };
      }

      raw.usda = usda;
      const n = (usda.foodNutrients ?? []).reduce<Record<string, number>>((acc, x) => {
        const name = (x.nutrientName ?? '').toLowerCase();
        const unit = (x.unitName ?? '').toLowerCase();
        const v = Number(x.value);
        if (!Number.isFinite(v)) return acc;
        if (unit !== 'g') return acc;
        if (name.includes('sugars')) acc.sugar = v;
        if (name === 'total lipid (fat)' || name.includes('total lipid')) acc.fat = v;
        if (name.includes('saturated')) acc.sat = v;
        if (name.includes('salt')) acc.salt = v;
        if (name.includes('sodium')) acc.sodium = v;
        return acc;
      }, {});

      const saltFromSodium = n.salt ?? (n.sodium != null ? n.sodium * 2.5 : undefined);
      per100 = { sugar_g: n.sugar, fat_g: n.fat, sat_fat_g: n.sat, salt_g: saltFromSodium };
      grade = gradeFromTrustedNutrition({ kind, confidence0to100: confidence, per100, isFruitOrVeg: isFruitVeg });
    }

    const scan = await prisma.scanHistory.create({
      data: { userId, source, confidence, kind, raw: { ...raw, per100, grade }, barcode: barcodeUsed, title }
    });

    return { kind, title, per100, grade, scanId: scan.id };
  };

  if (barcodeQueue.length > 0) {
    for (const bc of barcodeQueue) results.push(await analyzeOne(bc));
    return res.json({ queue: results, scanId: results[0]?.scanId });
  }

  const single = await analyzeOne(undefined);
  return res.json(single);
});

const ConsumeSchema = z.object({
  scanId: z.string().min(1),
  consumed: z.boolean(),
  quantity: z.number().positive().optional(),
  unit: z.enum(['g', 'ml']).optional()
});

app.post('/scan/consume', requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const parsed = ConsumeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT' });

  const scan = await prisma.scanHistory.findFirst({ where: { id: parsed.data.scanId, userId } });
  if (!scan) return res.status(404).json({ error: 'NOT_FOUND' });

  if (!parsed.data.consumed) {
    await prisma.scanHistory.update({ where: { id: scan.id }, data: { consumed: false } });
    // Avoid risky food: award points on explicit NO.
    await recordPoints(userId, 'AVOID_RISKY_FOOD', { scanId: scan.id });
    return res.json({ ok: true });
  }

  // Fruits/veg: no limits, no streak/points impact (except scan already recorded).
  if (scan.kind === 'FRUIT_VEG') {
    await prisma.scanHistory.update({ where: { id: scan.id }, data: { consumed: true, consumedAt: new Date() } });
    return res.json({ ok: true });
  }

  const raw: any = scan.raw ?? {};
  const per100 = raw?.per100 ?? raw?.openFoodFacts?.nutriments ? raw?.per100 : raw?.per100;
  const grade = raw?.grade;

  const qty = parsed.data.quantity;
  const unit = parsed.data.unit;
  if (!qty || !unit) return res.status(400).json({ error: 'MISSING_QUANTITY' });

  const factor = qty / 100;
  const sugar = Number(per100?.sugar_g);
  const fat = Number(per100?.fat_g);
  const sat = Number(per100?.sat_fat_g);
  const salt = Number(per100?.salt_g);

  // Only apply known trusted nutrients. Never guess.
  const delta: any = {};
  if (Number.isFinite(sugar)) delta.freeSugarG = sugar * factor;
  if (Number.isFinite(fat)) delta.fatG = fat * factor;
  if (Number.isFinite(sat)) delta.satFatG = sat * factor;
  if (Number.isFinite(salt)) delta.saltG = salt * factor;

  // RED flag counts for solids
  if (scan.kind === 'SOLID' && grade?.traffic) {
    delta.redFat = grade.traffic.fat === 'RED';
    delta.redSalt = grade.traffic.salt === 'RED';
  }

  await applyConsumption(userId, new Date(), delta);
  await prisma.scanHistory.update({ where: { id: scan.id }, data: { consumed: true, consumedAt: new Date() } });

  // Evaluate streak; if earned now and wasn't earned before, award balanced day points once.
  const today = startOfIstDay(new Date());
  const prev = await prisma.streakHistory.findUnique({ where: { userId_date: { userId, date: today } } });
  const evaluated = await evaluateAndRecordStreakForDay(userId, new Date());
  if (evaluated.earned && !prev?.earned) await recordPoints(userId, 'BALANCED_DAY', { date: today.toISOString() });

  // Deductions: repeated excess sugar / repeated red fat/salt (once per day each)
  const [limits, intakeNow, flagsNow] = await Promise.all([
    prisma.dailyLimits.findUnique({ where: { userId_date: { userId, date: today } } }),
    prisma.dailyIntake.findUnique({ where: { userId_date: { userId, date: today } } }),
    prisma.redFlags.findUnique({ where: { userId_date: { userId, date: today } } })
  ]);

  if (limits && intakeNow) {
    const alreadySugarPenalty = await prisma.pointsHistory.findFirst({
      where: { userId, type: 'REPEATED_EXCESS_SUGAR', meta: { path: ['date'], equals: today.toISOString() } }
    });
    if (!alreadySugarPenalty && intakeNow.freeSugarG > limits.sugarLimit) {
      await recordPoints(userId, 'REPEATED_EXCESS_SUGAR', { date: today.toISOString() });
    }
  }

  if (limits && flagsNow) {
    const highRisk = limits.prefAtTime !== 'NORMAL';
    const fatBad = highRisk ? flagsNow.redFatItems > 0 : flagsNow.redFatItems > 1;
    const saltBad = highRisk ? flagsNow.redSaltItems > 0 : flagsNow.redSaltItems > 1;
    const alreadyRedPenalty = await prisma.pointsHistory.findFirst({
      where: { userId, type: 'REPEATED_RED_FAT_SALT', meta: { path: ['date'], equals: today.toISOString() } }
    });
    if (!alreadyRedPenalty && (fatBad || saltBad)) {
      await recordPoints(userId, 'REPEATED_RED_FAT_SALT', { date: today.toISOString() });
    }
  }

  return res.json({ ok: true, streak: evaluated });
});

// Daily limits cron at 12:00 AM IST
cron.schedule(
  '0 0 * * *',
  async () => {
    await upsertDailyLimitsForDate(new Date());
  },
  { timezone: IST_TZ }
);

// Manual trigger (admin/dev)
app.post('/internal/daily-limits/run', async (_req, res) => {
  await upsertDailyLimitsForDate(new Date());
  res.json({ ok: true });
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});


