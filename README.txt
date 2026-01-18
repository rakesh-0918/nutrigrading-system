Setup (Windows)
1) Install Node.js LTS from https://nodejs.org
2) From this folder:
   npm install
3) Create env files:
   - apps/api/.env (see apps/api/.env.example)
   - apps/web/.env.local (see apps/web/.env.example)
4) Run:
   npm run db:generate
   npm run db:migrate
   npm run dev


