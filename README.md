# CHS CHAOS

Website for **CHS CHAOS** — the booster club supporting the theatre and choral
programs at Cuthbertson High School in Waxhaw, NC.

Built with [Next.js](https://nextjs.org) (App Router, TypeScript) and
[Supabase](https://supabase.com) for season data, ticket reservations, and
volunteer signups.

## Getting started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Connect Supabase**

   Copy the example env file and fill in values from your Supabase project
   (Dashboard → Project Settings → API):

   ```bash
   cp .env.local.example .env.local
   ```

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (optional, server-only)

3. **Create the database schema**

   Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL Editor
   (Dashboard → SQL Editor → New query), or via the Supabase CLI
   (`supabase db push`).

4. **Run the dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). The homepage renders a
   setup notice until Supabase is connected, then lists rows from the
   `productions` table.

## Project structure

```
app/                 Next.js App Router pages
lib/
  supabase/
    client.ts        Browser Supabase client (Client Components)
    server.ts        Server Supabase client (Server Components / Actions)
  queries.ts         Data-access helpers
  types.ts           Row types mirroring the schema
supabase/
  schema.sql         Tables + row-level security policies
```

## Data model

| Table                  | Purpose                                   | Access             |
| ---------------------- | ----------------------------------------- | ------------------ |
| `productions`          | Season shows / camps                      | public read        |
| `showtimes`            | Performance dates per production          | public read        |
| `cast_members`         | Cast & crew per production                | public read        |
| `people`               | Booster board + student (ITS) officers    | public read        |
| `ticket_reservations`  | Ticket / RSVP submissions                 | public insert only |
| `volunteers`           | Volunteer signups                         | public insert only |

Intake tables accept public inserts but are not publicly readable — reads
require the service role.

## Notes

- The original static prototype lives in `reference/` and is **gitignored**
  (never committed).
