# Fertilizer ERP

Web ERP foundation for a fertilizer/agri-input business.

## Run locally
1. Install Node.js LTS.
2. In this folder run `npm install`.
3. Run `npm run dev`.

## Deploy to Netlify
- Push this folder to GitHub and import the repository in Netlify.
- Build command: `npm run build`
- Publish directory: `dist`

Supabase configuration will be added in the next development stage.

## Phase 2 — Supabase
1. Create a Supabase project.
2. Open SQL Editor.
3. Run `supabase/schema.sql`.
4. Copy `.env.example` to `.env.local`.
5. Put your Supabase URL and anon key in `.env.local`.


## Phase 8
Added GST-ready billing presentation, professional browser print invoice, Sales Return, Purchase Return, return stock movements, and business settings table. Run the updated `supabase/schema.sql` in Supabase SQL Editor before using returns.


## Phase 9
Added business profile/settings, manual stock adjustment with movement tracking, and system status controls. Run the updated `supabase/schema.sql` before using stock adjustment/settings.


## Phase 10 — Production Baseline
Added Supabase email/password authentication, authenticated workspace gate, sign-out, JSON data backup export, audit-log infrastructure, database indexes, and production-oriented setup. Before first use, run the final `supabase/schema.sql` in Supabase SQL Editor and configure the two Vite environment variables in Netlify.
