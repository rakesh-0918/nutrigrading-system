# Quick Start Guide

## Step 1: Install Node.js
Download and install from: https://nodejs.org (LTS version)

## Step 2: Install PostgreSQL
- Local: https://www.postgresql.org/download/windows/
- OR Cloud: https://supabase.com (easier, free tier available)

## Step 3: Install Dependencies
```powershell
npm install
```

## Step 4: Configure Environment

### Create `apps/api/.env`:
```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/srujuna?schema=public
JWT_SECRET=change_me_to_random_32_char_string
CORS_ORIGIN=http://localhost:3000
```

### Create `apps/web/.env.local`:
```env
NEXT_PUBLIC_API_BASE=http://localhost:4000
```

## Step 5: Setup Database
```powershell
npm run db:generate
npm run db:migrate
npm run db:seed
```

## Step 6: Run Application

**Open Terminal 1:**
```powershell
npm run dev:api
```

**Open Terminal 2:**
```powershell
npm run dev:web
```

## Step 7: Open Browser
Go to: http://localhost:3000

**Demo Login:**
- Phone: `+910000000000`
- Password: `demo1234`

---

**That's it!** 🎉

For detailed instructions, see `README.md`
