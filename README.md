# My Goodlife Club — Loyalty CRM

Internal CRM platform for the **My Goodlife Club** loyalty programme at Goodlife Pharmacy. Built to replace Excel-based workflows with a structured, data-driven system for the marketing and CRM team.

**Live site:** https://crxtich.github.io/myGoodlife-Club-Loyalty-CRM/

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Features](#features)
5. [Member Segmentation Logic](#member-segmentation-logic)
6. [RFM Segmentation vs Lifecycle Segmentation](#rfm-segmentation-vs-lifecycle-segmentation)
7. [Role-Based Access Control](#role-based-access-control)
8. [Database Schema](#database-schema)
9. [Local Development](#local-development)
10. [Deployment](#deployment)
11. [Supabase Setup](#supabase-setup)
12. [Known Limitations & Roadmap](#known-limitations--roadmap)

---

## Overview

The My Goodlife Club Loyalty CRM allows the marketing team to:

- Import member data from Excel or CSV files
- Automatically segment members by purchase behaviour
- Build targeted campaigns per segment and channel
- Export filtered contact lists as CSV for outbound campaigns (WhatsApp, in-store, online)
- Track campaign export history and audit trails

The system is designed for internal use only. All data is stored in Supabase (PostgreSQL) with row-level security enforced per authenticated user role.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + shadcn/ui component library |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email + password) |
| Charts | Recharts |
| CSV parsing | PapaParse |
| Excel parsing | SheetJS (xlsx) |
| Form validation | Zod + React Hook Form |
| Hosting | GitHub Pages (via GitHub Actions) |

---

## Project Structure

```
src/
├── assets/               # Logo and static images
├── components/
│   ├── ui/               # shadcn/ui base components (Button, Input, Table, etc.)
│   ├── AppShell.tsx      # Main layout — sticky sidebar + scrollable content area
│   ├── KpiCard.tsx       # Dashboard metric cards
│   ├── NavLink.tsx       # Sidebar navigation link
│   ├── ProtectedRoute.tsx # Auth + role-based route guard
│   ├── SegmentBadge.tsx  # Colour-coded lifecycle segment label with tooltip
│   └── RfmSegmentBadge.tsx # Colour-coded RFM segment label with tooltip
├── contexts/
│   └── AuthContext.tsx   # Auth state + role fetched from user_roles table
├── hooks/
│   ├── use-mobile.tsx    # Responsive breakpoint hook
│   └── use-toast.ts      # Toast notification hook
├── integrations/
│   └── supabase/
│       ├── client.ts     # Supabase client initialisation
│       └── types.ts      # Auto-generated + extended TypeScript types
├── lib/
│   ├── segments.ts       # Lifecycle segmentation logic, labels, colours, formatKES
│   ├── rfmSegments.ts    # RFM (Recency/Frequency/Monetary) scoring + segment copy
│   └── utils.ts          # Tailwind cn() utility
└── pages/
    ├── Auth.tsx          # Sign in / sign up page
    ├── Campaigns.tsx     # Campaign builder (RFM targeting) + campaign list
    ├── Dashboard.tsx     # KPI overview + lifecycle segment charts
    ├── Exports.tsx       # CSV export history log
    ├── Reports.tsx       # Curated PDF/Excel report generator
    ├── RfmSegments.tsx   # RFM segment framework + live member counts
    ├── Members.tsx       # Paginated member table with search + filters
    ├── NotFound.tsx      # 404 page
    └── Upload.tsx        # File upload + data ingestion

.github/
└── workflows/
    └── deploy-pages.yml  # CI/CD — builds and deploys to GitHub Pages on push to main

supabase/
└── migrations/           # SQL migration files
```

---

## Features

### Dashboard
- Live KPI cards: Total Members, Active (30d), At Risk, Churned, Lifetime Value (KES), Campaigns Run, CSV Exports, Health Score
- Bar chart — member distribution across all 6 segments
- Pie chart — segment share of total member base
- All segment counts are computed in real-time from member purchase dates

### RFM Segments
- Behavioural segmentation page (Recency / Frequency / Monetary) — Champions, Loyals, At Risk (RFM), Lapsed, New
- Live member counts per segment, computed from `rfm_segment`
- Each segment card shows its RFM signal, what it means, recommended actions, and example tactics
- This is the model used for Campaign targeting — see [RFM Segmentation vs Lifecycle Segmentation](#rfm-segmentation-vs-lifecycle-segmentation)

### Members
- Server-side paginated table (default 20 rows/page — configurable to 50, 100, 200)
- Search by name, phone, email, or member ID (debounced, hits Supabase server-side)
- Filter by segment (server-side query)
- Export current page as CSV — logs to `campaign_exports` table
- Columns: Member, Contact, Segment, Channel, Country, Purchases, Spend, Last Purchase, Priority Score

### Data Upload
- Drag-and-drop or file picker — accepts `.xlsx`, `.xls`, `.csv`
- Flexible column name matching (case-insensitive, spaces/underscores normalised)
- Upserts members by `member_id` — re-uploading updates existing records
- Auto-segments and scores every member on import
- Upload history log with per-batch record counts and error counts
- Danger Zone: clear all member data (admin only in production intent)

**Supported columns in upload files:**

| Column | Required | Notes |
|--------|----------|-------|
| `member_id` | Yes | Unique identifier — used as upsert key |
| `name` | Yes | Full name |
| `phone` | Yes | Normalised to digits + `+` |
| `email` | No | |
| `join_date` | No | YYYY-MM-DD or Excel date serial |
| `store_location` | No | Branch name |
| `preferred_channel` | No | `sms` / `email` |
| `last_purchase_date` | No | Drives segmentation |
| `total_purchases` | No | Integer |
| `total_spend` | No | KES amount |
| `country` | No | `Kenya` or `Uganda` |

### Campaigns
- Create campaigns with: name, objective, target **RFM segments** (multi-select, 5 options), channel, notes
- Channel is locked to two options: **SMS** and **Email** (in-store and WhatsApp have been removed — see [RFM Segmentation vs Lifecycle Segmentation](#rfm-segmentation-vs-lifecycle-segmentation) and the Database Schema section for the underlying enum change)
  - **SMS** campaigns: target RFM segment(s) + message template. Routed implicitly by member country at send time. No live SMS provider is connected — the UI shows an honest "SMS provider integration pending" placeholder.
  - **Email** campaigns: target RFM segment(s) + subject + body. No live email provider is connected — the UI shows an honest "Email provider integration pending" placeholder. The builder shows a live count of "X of Y targeted members have an email on file" when Email + segments are selected.
- Campaign list table showing all saved campaigns, channel (SMS/Email badge with icon), export count, and created date
- **Export contacts** button — fetches all members matching target RFM segments, downloads as CSV, logs to `campaign_exports`, increments `export_count` on the campaign

### Exports
- History of all CSV exports across members and campaigns

### Reports
- Curated PDF/Excel exports for stakeholders: RFM Segment Summary, Lifecycle Segment Summary, Campaign Performance, Member List (filtered)
- Optional date range filter (where relevant to the report type)
- PDF reports include the My Goodlife Club logo, report title, generated-on date, and a clean table layout (via `jspdf` + `jspdf-autotable`)
- Excel reports generated via SheetJS (`xlsx`), same library used for Data Upload parsing
- Every generated report is logged to the `report_exports` table (type, format, row count, generated by, timestamp)
- Same access as Exports — no role restriction

---

## Member Segmentation Logic

Segmentation runs on every member at upload time and is stored in the `segment` column. The live segment badge in the Members table is computed dynamically from `last_purchase_date` and `join_date` at render time.

| Segment | Condition | Priority Score |
|---------|-----------|---------------|
| **Active** | Purchased within 30 days | 10 |
| **Never Activated** (new) | Joined ≤ 30 days ago, no purchase | 25–30 |
| **At Risk** | 31–59 days since last purchase | 50 |
| **Churned (Early)** | 60–89 days since last purchase | 70 |
| **Churned (Deep)** | 90–364 days since last purchase | 85 |
| **Lapsed 1 Year+** | 365+ days since last purchase | 100 |

Higher priority score = more urgent to re-engage. The Members table is sorted by priority score descending by default.

### Recommended actions per segment

| Segment | Action |
|---------|--------|
| Active | Engagement campaign — reward and upsell |
| Never Activated | Activation campaign — first purchase incentive |
| At Risk | Retention campaign — personalised reminder |
| Churned (Early) | Reactivation — moderate incentive offer |
| Churned (Deep) | Reactivation — high priority, strong offer |
| Lapsed 1 Year+ | Win-back or remove from active list |

---

## RFM Segmentation vs Lifecycle Segmentation

The CRM runs **two independent, parallel segmentation models**. Neither replaces the other — they answer different questions and drive different parts of the product.

| | Lifecycle segmentation (`member_segment`) | RFM segmentation (`rfm_segment`) |
|---|---|---|
| **Question answered** | "How urgently does this member need re-engagement?" | "How valuable and engaged is this member, behaviourally?" |
| **Drives** | Dashboard KPIs/charts, Members table segment column + filter, priority score | Campaign builder targeting, RFM Segments page |
| **Computed from** | `last_purchase_date`, `join_date` | Recency (`last_purchase_date`), Frequency (`total_purchases`), Monetary (`total_spend`) |
| **Logic location** | `src/lib/segments.ts` | `src/lib/rfmSegments.ts` |
| **Values** | `active`, `new`, `at_risk`, `churned_60_90`, `churned_90_180`, `churned_180_plus` | `champions`, `loyals`, `at_risk_rfm`, `lapsed`, `new_rfm` |

> **Note:** RFM's "At Risk" segment is labelled **"At Risk (RFM)"** everywhere in the UI and stored as the distinct value `at_risk_rfm`, specifically to avoid confusion with the lifecycle segmentation's own `at_risk` value. They are not the same thing and a member can be in different "risk" states under each model simultaneously.

### RFM segment reference

| Segment | RFM Signal | What it means | Actions |
|---------|-----------|----------------|---------|
| **Champions** | High recency, frequency, monetary | Most valuable, most engaged members | Reward, recognise, ask for referrals/reviews |
| **Loyals** | Good frequency and monetary, not always most recent | Consistent, dependable members | Upsell, loyalty perks, keep them engaged |
| **At Risk (RFM)** | Low recency, but historically frequent/high spend | Was valuable, has gone quiet | Personalised win-back outreach before they lapse fully |
| **Lapsed** | Very low recency, regardless of past frequency/monetary | Inactive for an extended period | Strong reactivation incentive or win-back campaign |
| **New** | Just joined, minimal purchase history yet | Too early to score on frequency/monetary | Onboarding and first-purchase activation |

Members.tsx, its segment filter, and the Dashboard charts are unaffected by RFM segmentation — they continue to use the lifecycle model exclusively.

---

## Role-Based Access Control

Roles are stored in the `user_roles` table and fetched after sign-in via `AuthContext`.

| Role | Dashboard | Members | Upload | Campaigns | Exports | Clear Data |
|------|-----------|---------|--------|-----------|---------|------------|
| **analyst** | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| **manager** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

Restricted pages show an **"Access restricted"** message — they do not silently redirect.

### Assigning a role (via Supabase SQL Editor)

```sql
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'   -- or 'manager' or 'analyst'
FROM auth.users
WHERE email = 'user@example.com'
ON CONFLICT DO NOTHING;
```

---

## Database Schema

### `members`
Core member records. Upserted by `member_id`.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `member_id` | text | Unique business ID |
| `name` | text | |
| `phone` | text | |
| `email` | text | |
| `join_date` | date | |
| `last_purchase_date` | date | |
| `store_location` | text | |
| `preferred_channel` | channel_type | `sms \| email` |
| `total_purchases` | int | |
| `total_spend` | numeric | KES |
| `segment` | member_segment | Lifecycle segment — set at upload time |
| `priority_score` | int | 0–100, higher = more urgent |
| `rfm_segment` | rfm_segment | RFM segment — set at upload time, drives Campaign targeting |
| `recency_score` | int | 1–5, RFM recency component |
| `frequency_score` | int | 1–5, RFM frequency component |
| `monetary_score` | int | 1–5, RFM monetary component |
| `country` | text | `Kenya \| Uganda` — requires migration* |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

> *Run this migration in Supabase SQL Editor to enable the country column:
> ```sql
> ALTER TABLE members ADD COLUMN IF NOT EXISTS country TEXT CHECK (country IN ('Kenya', 'Uganda'));
> ```

### `campaigns`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `name` | text | |
| `objective` | text | |
| `target_segments` | member_segment[] | **Legacy/deprecated.** Lifecycle segments, no longer used by the Campaign builder UI. Left in place for any historical rows. |
| `target_rfm_segments` | rfm_segment[] | Array of RFM segments — used by the Campaign builder UI |
| `channel` | channel_type | `sms \| email` |
| `notes` | text | |
| `message_template` | text | SMS message template |
| `email_subject` | text | Email subject line |
| `email_body` | text | Email body |
| `export_count` | int | Auto-incremented on export |
| `created_by` | uuid | FK → auth.users |
| `created_at` | timestamptz | |

### `report_exports`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `report_type` | text | `rfm_summary \| lifecycle_summary \| campaign_performance \| member_list` |
| `format` | text | `pdf \| excel` |
| `generated_by` | uuid | FK → auth.users |
| `row_count` | int | |
| `file_reference` | text | Downloaded filename |
| `generated_at` | timestamptz | |

### `campaign_exports`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `campaign_id` | uuid | FK → campaigns (nullable for member-page exports) |
| `exported_by` | uuid | FK → auth.users |
| `member_count` | int | |
| `file_reference` | text | Downloaded filename |
| `exported_at` | timestamptz | |

### `upload_batches`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `file_name` | text | |
| `records_processed` | int | |
| `new_members` | int | |
| `updated_members` | int | |
| `errors` | int | |
| `uploaded_by` | uuid | FK → auth.users |
| `created_at` | timestamptz | |

### `user_roles`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK → auth.users |
| `role` | app_role | `admin \| manager \| analyst` |

### Enums
```sql
member_segment: active | new | at_risk | churned_60_90 | churned_90_180 | churned_180_plus
rfm_segment:    champions | loyals | at_risk_rfm | lapsed | new_rfm
channel_type:   sms | email
app_role:       admin | manager | analyst
```

---

## Local Development

### Prerequisites
- Node.js 18+
- npm

### Setup

```bash
# Clone the repository
git clone https://github.com/crxtich/myGoodlife-Club-Loyalty-CRM.git
cd myGoodlife-Club-Loyalty-CRM

# Install dependencies
npm install

# Create a local environment file
cp .env.example .env
# Edit .env and add your Supabase URL and anon key

# Start the dev server
npm run dev
# App runs at http://localhost:8080
```

### Environment variables

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

### Available scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start local dev server on port 8080 |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Vitest unit tests |

---

## Deployment

The app deploys automatically to **GitHub Pages** on every push to `main`.

**Workflow:** `.github/workflows/deploy-pages.yml`

1. Installs dependencies
2. Builds with Vite (injects Supabase env vars)
3. Copies `index.html` → `dist/404.html` (enables SPA deep-link routing on GitHub Pages)
4. Deploys `dist/` to the `github-pages` environment

**To trigger a manual redeploy:** Go to GitHub → Actions → Deploy to GitHub Pages → Run workflow.

---

## Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the SQL migrations in `supabase/migrations/` in order via the SQL Editor
3. Run the country column migration:
   ```sql
   ALTER TABLE members ADD COLUMN IF NOT EXISTS country TEXT CHECK (country IN ('Kenya', 'Uganda'));
   ```
4. Run the three latest migrations, in order, if not already applied:
   - `20260630000000_channel_type_sms_email.sql` — removes in-store/WhatsApp, narrows `channel_type` to `sms | email`
   - `20260630000100_rfm_segmentation.sql` — adds the `rfm_segment` enum/column, RFM score columns, and Campaign `target_rfm_segments`/SMS/Email content columns
   - `20260630000200_report_exports.sql` — adds the `report_exports` table for the Reports page
5. Enable Row Level Security on all tables (already in migrations)
6. Copy your **Project URL** and **anon (publishable) key** from Project Settings → API

---

## Known Limitations & Roadmap

### Current limitations

| Issue | Impact |
|-------|--------|
| Dashboard fetches all member rows client-side | Slow/broken above ~50,000 members |
| Segment column set at upload, not updated live | Stale segments between uploads |
| No database indexes on segment, priority_score, last_purchase_date | Full table scans at scale |
| Campaign exports load all matching members at once | Memory risk above 100K results |
| Supabase free tier: 500 MB storage, pauses on inactivity | Not suitable for production at scale |

### Recommended next steps

- [ ] Move Dashboard KPI aggregations to a Supabase RPC (PostgreSQL function) — removes client-side loop
- [ ] Add a `pg_cron` scheduled job to re-segment all members nightly
- [ ] Add database indexes: `CREATE INDEX ON members (segment, priority_score, last_purchase_date)`
- [ ] Stream campaign exports in batches instead of a single query
- [ ] Upgrade Supabase to Pro plan for production workloads
- [ ] Add Profile and Settings pages (currently shown as disabled in the user menu)
- [ ] Add email notification on campaign export completion

---

## Confidential

This system is for **internal use only** by the Goodlife Pharmacy marketing team. Do not share access credentials or export data externally.
