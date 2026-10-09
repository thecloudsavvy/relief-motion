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

5. Keep **public sign-ups off**. Invite more physiotherapists from **Settings → Add physiotherapist**.

If the app was already running on the first schema, run `schema.sql` again so assignment, SOAP notes, audit, documents, and physiotherapist row-level security exist.

Physiotherapists only see patients assigned to them. Admins see the full network, including Providers and the Audit log. Unassigned patients are admin-only until someone is assigned.

## 2. App keys

Copy **Project Settings → API**:

- Project URL
- `anon` `public` key
- `service_role` key (server only — used to invite physiotherapists)

```bash
cd emr
cp .env.local.example .env.local
```

Fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

Never commit `.env.local`. Never expose `service_role` to the browser (`NEXT_PUBLIC_...`).

In **Authentication → URL Configuration**, add `http://localhost:3000/auth/callback` and `http://localhost:3000/login` (and later the production app URLs) to Redirect URLs so invite emails can open the set-password screen.

## 3. Custom SMTP (beta: Gmail)

For this beta, Auth emails send from `Relief Motion <reliefmotion.co@gmail.com>`. Gmail will reject the normal mailbox password; use a Google **App password**.

1. Sign in to [Google Account](https://myaccount.google.com/) as `reliefmotion.co@gmail.com`
2. **Security → 2-Step Verification** (must be on)
3. **Security → App passwords** → Mail → generate. Do not put this in git or chat
4. In Supabase **Authentication → SMTP Settings**:

| Field | Value |
|---|---|
| Sender email | `reliefmotion.co@gmail.com` |
| Sender name | `Relief Motion` |
| Host | `smtp.gmail.com` |
| Port | `587` (if that 500s, try `465`) |
| Username | `reliefmotion.co@gmail.com` |
| Password | the 16-character App password |

Sender **must** be this Gmail address. Do not set From to `info@reliefmotionphysio.com` on Gmail SMTP; Google will refuse or rewrite it.

5. Keep the Invite / Reset templates (no “Supabase” wording)
6. Invite a test physiotherapist. You want **Invite sent**, not a copy link. From should be Relief Motion / `reliefmotion.co@gmail.com`

## 4. Run

```bash
cd emr
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in.

## What it does

- Login (invite-only staff; role comes from the staff profile)
- Admin: invite physiotherapists from Settings, promote roles, network dashboard, all patients, providers, audit log
- Physiotherapist: own sessions, assigned patients, own drafts
- Create a patient — ID like `RM-2026-00001` (PTs are assigned the record they create)
- Search by RM ID, name or phone (scoped to assigned patients for PTs)
- SOAP session notes (draft or signed) for handover
- Document uploads into a private Storage bucket

## Later

Host at `app.reliefmotionphysio.com` (Vercel or similar) with the same Supabase project.
