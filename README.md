# Srujuna - Voice-First Food Health App for India

Production-ready web application for understanding food health impact and reducing diabetes, BP, heart disease, and obesity risk.

## Prerequisites

1. **Node.js** (LTS version 18 or higher)
   - Download from: https://nodejs.org
   - Verify installation: `node -v` and `npm -v`

2. **PostgreSQL** (version 14 or higher)
   - Download from: https://www.postgresql.org/download/windows/
   - Or use Supabase (cloud PostgreSQL): https://supabase.com
   - Note down your database connection details

3. **AWS Account** (optional, for Amazon Rekognition)
   - Only needed if you want image-based food detection
   - Get AWS Access Key ID and Secret Access Key

## Installation Steps

### 1. Install Dependencies

Open PowerShell or Command Prompt in the project folder (`C:\Users\DELL\OneDrive\Desktop\srujuna`) and run:

```powershell
npm install
```

This will install all dependencies for the monorepo (web app, API, and shared packages).

### 2. Set Up Environment Variables

#### API Environment (`apps/api/.env`)

Create a file named `.env` in `apps/api/` folder (copy from `env.example`):

```powershell
# In PowerShell:
Copy-Item apps\api\env.example apps\api\.env
```

Then edit `apps/api/.env` and fill in:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/srujuna?schema=public
JWT_SECRET=your_random_secret_key_here_min_32_chars
CORS_ORIGIN=http://localhost:3000

# AWS Rekognition (optional)
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret

# USDA FoodData Central (optional)
USDA_API_KEY=your_usda_key
```

**Important:**
- Replace `YOUR_PASSWORD` with your PostgreSQL password
- Replace `your_random_secret_key_here_min_32_chars` with a secure random string (at least 32 characters)
- If using Supabase, use the connection string from your Supabase dashboard
- AWS and USDA keys are optional but recommended for full functionality

#### Web Environment (`apps/web/.env.local`)

Create a file named `.env.local` in `apps/web/` folder:

```powershell
Copy-Item apps\web\env.local.example apps\web\.env.local
```

Edit `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_BASE=http://localhost:4000
```

### 3. Set Up Database

#### Option A: Local PostgreSQL

1. Create a database named `srujuna`:
   ```sql
   CREATE DATABASE srujuna;
   ```

2. Run Prisma migrations:
   ```powershell
   npm run db:generate
   npm run db:migrate
   ```

#### Option B: Supabase (Cloud PostgreSQL)

1. Create a new project at https://supabase.com
2. Copy the connection string from Settings → Database
3. Update `apps/api/.env` with the Supabase connection string
4. Run migrations:
   ```powershell
   npm run db:generate
   npm run db:migrate
   ```

### 4. Seed Database (Optional)

Create a demo user:

```powershell
npm run db:seed
```

This creates a user with:
- Phone: `+910000000000`
- Password: `demo1234`

## Running the Application

### Development Mode

Open **two terminal windows**:

**Terminal 1 - API Server:**
```powershell
npm run dev:api
```
API will run on: http://localhost:4000

**Terminal 2 - Web App:**
```powershell
npm run dev:web
```
Web app will run on: http://localhost:3000

### Access the Application

1. Open browser: http://localhost:3000
2. Login with demo credentials:
   - Phone: `+910000000000`
   - Password: `demo1234`
3. Or create a new account via Sign Up

## Project Structure

```
srujuna/
├── apps/
│   ├── api/          # Express backend (port 4000)
│   └── web/           # Next.js frontend (port 3000)
├── packages/
│   ├── shared/        # Shared health logic (non-negotiable rules)
│   └── config/        # TypeScript configs
└── package.json       # Root workspace config
```

## Key Features

✅ **Voice-first UI** - All input via voice or tap (no keyboard typing)  
✅ **Multi-language** - English, Hindi, Telugu, Tamil, Kannada, Malayalam, Bengali, Marathi  
✅ **Barcode scanning** - ZXing for multiple barcode detection  
✅ **Trusted nutrition APIs** - Open Food Facts, USDA, Amazon Rekognition  
✅ **Singapore Nutri-Grade** - For beverages (sugar-based)  
✅ **UK Traffic Lights** - For solid foods (sugar, fat, salt)  
✅ **Daily limits** - WHO + UK guidance, personalized by health preference  
✅ **Streak system** - Balanced nutrition tracking  
✅ **Points & leaderboard** - Top 50 users, masked identity  
✅ **Profile management** - Future-only changes (never rewrites past data)  
✅ **70% confidence gate** - Stops if image quality is low  

## Troubleshooting

### Node.js not found
- Install Node.js LTS from https://nodejs.org
- Restart terminal after installation

### Database connection error
- Verify PostgreSQL is running
- Check `DATABASE_URL` in `apps/api/.env`
- Ensure database `srujuna` exists

### Port already in use
- Change ports in:
  - `apps/api/src/index.ts` (line 215: `const port = ...`)
  - `apps/web/package.json` (scripts: `dev: -p 3000`)

### AWS Rekognition errors
- Optional feature - app works without it
- Only needed for image-based food detection when no barcode found

### Voice recognition not working
- Use Chrome or Edge browser (best Web Speech API support)
- Grant microphone permissions
- Check browser console for errors

## Production Build

```powershell
npm run build
npm run start  # (requires separate start scripts)
```

## API Endpoints

- `POST /auth/signup` - Create account
- `POST /auth/login` - Login
- `GET /me` - Current user
- `GET /day/today` - Today's limits & intake
- `POST /scan/analyze` - Analyze food image
- `POST /scan/consume` - Record consumption
- `GET /leaderboard/top` - Top 50 users
- `GET /scans/recent` - Scan history
- `POST /profile/name` - Update name
- `POST /profile/preference` - Update health preference
- `POST /language` - Update language preference

## Safety Rules (Non-Negotiable)

- ❌ **NEVER guess nutrition values**
- ❌ **NEVER calculate when confidence < 70%**
- ✅ **ONLY calculate from trusted APIs** (Open Food Facts, USDA)
- ✅ **Natural sugars (fruits/veg) DO NOT affect limits**
- ✅ **Profile changes affect ONLY future days**
- ✅ **Past health data NEVER changes**

## License

Private project - All rights reserved.
