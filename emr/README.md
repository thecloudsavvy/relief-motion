# Relief Motion EMR

Staff app for physiotherapists and admins. Patients do not log in. The public website stays on GitHub Pages; this app talks to **Supabase**.

## 1. Database

In the Supabase dashboard:

1. Open **SQL Editor**
2. Paste and run `emr/supabase/schema.sql` (safe to re-run; it adds later columns and tables)
3. **Authentication → Users → Add user** (create the first admin account)
4. In SQL Editor run:

```sql
update public.profiles
set role = 'admin',
    full_name = 'Relief Motion Admin'
where id = (select id from auth.users order by created_at limit 1);
```

5. Keep **public sign-ups off**. Add more physiotherapists with **Authentication → Invite** (or Add user). They get the `physiotherapist` role automatically.

If the app was already running on the first schema, run `schema.sql` again so assignment, SOAP notes, audit, documents, and physiotherapist row-level security exist.

Physiotherapists only see patients assigned to them. Admins see the full network, including Providers and the Audit log. Unassigned patients are admin-only until someone is assigned.

## 2. App keys

Copy **Project Settings → API**:

- Project URL
- `anon` `public` key

```bash
cd emr
cp .env.local.example .env.local
```

Fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

Never commit `.env.local`. Never put the `service_role` key in this app.

## 3. Run

```bash
cd emr
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in.

## What it does

- Login (invite-only staff; role comes from the staff profile)
- Admin: network dashboard, all patients, providers, audit log
- Physiotherapist: own sessions, assigned patients, own drafts
- Create a patient — ID like `RM-2026-00001` (PTs are assigned the record they create)
- Search by RM ID, name or phone (scoped to assigned patients for PTs)
- SOAP session notes (draft or signed) for handover
- Document uploads into a private Storage bucket

## Later

Host at `app.reliefmotionphysio.com` (Vercel or similar) with the same Supabase project.
