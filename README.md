# Catalog Site (Next.js + Prisma)

## Prerequisites
- Node.js 20+
- PostgreSQL connection string in `DATABASE_URL`
- Supabase project with a Storage bucket (manual setup)

Create `.env.local` (or `.env`) with:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DB_NAME?schema=public"
SUPABASE_URL="https://YOUR-PROJECT-REF.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
SUPABASE_STORAGE_BUCKET="catalog-uploads"
TELEGRAM_BOT_TOKEN="OPTIONAL_BOT_TOKEN"
TELEGRAM_CHAT_ID="OPTIONAL_CHAT_ID"
```

`SUPABASE_SERVICE_ROLE_KEY` is server-only. Do not expose it in client-side code.
Telegram env vars are optional. If omitted, order requests are saved in DB without Telegram notification.

## Supabase Storage setup (manual, one-time)
1. Open Supabase Dashboard -> Storage.
2. Create a bucket (example: `catalog-uploads`).
3. Set `SUPABASE_STORAGE_BUCKET` to this exact bucket name.
4. Ensure the bucket allows public read access for uploaded files (or adjust API to sign URLs).

## Fixing Common Dev Startup Issues (Windows)

### 1) Port 3000 is already in use
Find the PID:

```powershell
netstat -ano | findstr :3000
```

Kill the process:

```powershell
taskkill /PID <PID> /F
```

### 2) Next dev lock exists (`.next/dev/lock`)

```powershell
if (Test-Path .next\dev\lock) { Remove-Item .next\dev\lock -Force }
```

### 3) Hard reset local Next build cache (`.next`) if lock/rebuild issues persist

```powershell
if (Test-Path .next) { Remove-Item .next -Recurse -Force }
```

## Database Setup (Local Dev)

### Option A: Prisma Dev server + migrations
Start Prisma dev database (leave this terminal running):

```powershell
npm run db:dev
```

In another terminal, run migrations:

```powershell
npm run db:migrate
```

Seed sample data:

```powershell
npm run db:seed
```

Start app:

```powershell
npm run dev
```

### Option B: push schema without migrations

```powershell
npx prisma db push
npm run db:seed
npm run dev
```

## Reliable Windows startup sequence (copy/paste)

```powershell
netstat -ano | findstr :3000
taskkill /PID <PID> /F
if (Test-Path .next\dev\lock) { Remove-Item .next\dev\lock -Force }
if (Test-Path .next) { Remove-Item .next -Recurse -Force }
npm run db:dev
# new terminal:
npm run db:migrate
npm run db:seed
npm run dev
```

## Useful Scripts
- `npm run dev` - start Next.js dev server
- `npm run lint` - run ESLint
- `npm run db:dev` - start Prisma local dev database
- `npm run db:migrate` - run migrations
- `npm run db:push` - push schema directly
- `npm run db:seed` - seed minimal catalog data
- `npm run db:studio` - open Prisma Studio

## Upload API behavior
- Endpoint: `POST /api/upload`
- Input: `multipart/form-data` with `files` field
- Storage: Supabase Storage under `uploads/YYYY-MM-DD/...`
- Response: `{ "urls": string[] }` (unchanged)

## Order request flow
- Product page has an `Order via us` button.
- Checkout endpoint/page: `/checkout?productId=<PRODUCT_ID>`
- DB writes:
  - `Order` with customer info
  - `OrderItem` linked to selected product and qty
- Admin view: `/admin/orders`
- Optional Telegram alert is sent when:
  - `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are both set

## Seeded Sample Data
`npm run db:seed` creates:
- 1 supplier
- 1 brand
- category tree: `Electronics -> Connectors`
- 1 product linked to supplier/brand/categories
- supplier + QC images (including a QC set)
