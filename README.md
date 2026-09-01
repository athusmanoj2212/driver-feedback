# Trip Feedback Hub — VS Code + React + Supabase

This is a real database-backed starter for the Trip Feedback Hub UI.

## Stack

- React + Vite
- Supabase Auth
- Supabase PostgreSQL
- Supabase Row Level Security
- React Router
- Lucide icons
- Responsive CSS

## 1. Install

```bash
npm install
```

## 2. Create Supabase project

Create a project at https://supabase.com/

Open **SQL Editor** and run:

`supabase/schema.sql`

## 3. Configure environment

Copy `.env.example` to `.env`:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Use the project's public/anon key. Never put a Supabase service-role key in Vite frontend code.

## 4. Run

```bash
npm run dev
```

Open the local URL shown by Vite.

## Features

- Driver signup/login/logout
- Password reset request
- Protected driver dashboard
- Real trip creation
- Real dashboard statistics
- Passenger feedback link per trip
- Public passenger feedback form
- Driver feedback history
- Driver profile
- Supabase RLS policies

## Important production notes

1. The public feedback URL is a capability link. Treat it like a secret.
2. Configure Supabase Auth email settings and your production redirect URLs before deployment.
3. Add rate limiting / CAPTCHA or an Edge Function if the public feedback endpoint is exposed at scale.
4. For a production app, consider adding audit logs, trip edit rules, feedback moderation and backups.
