# English Quizzes

Web app for taking and managing English language quizzes. Users can take quizzes with multiple-choice questions and see explanations after checking answers. Admins (via Google sign-in) can create and edit quizzes.

## Features

- **Public:** Browse quizzes, take a quiz (one answer per question), check results with correct/incorrect highlighting and explanations, see score (X of Y).
- **Auth:** Sign in with Google (Supabase Auth). Session stored in cookies.
- **Admin panel** (`/admin`): Create quizzes (title, description) and add questions with options and explanations. Edit existing quizzes. Access only for emails listed in `admin_emails` (Supabase).
- **UI:** Light/dark theme toggle (next-themes), responsive layout, loading states and error handling.

## Tech Stack

- **Framework:** Next.js 16 (App Router), TypeScript
- **Styling:** Tailwind CSS v4, [shadcn/ui](https://ui.shadcn.com)
- **Backend / DB:** [Supabase](https://supabase.com) (PostgreSQL)
- **Auth:** Supabase Auth (Google provider)
- **Forms:** React Hook Form, Zod, `@hookform/resolvers`

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- Google OAuth credentials (for sign-in and admin)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Create `.env.local` in the project root (see `.env.example` if present):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
# or: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-publishable-key
```

Get the URL and key from [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Settings** → **API**.

### 3. Database

Apply the migrations in `supabase/migrations/` (see [supabase/README.md](supabase/README.md)):

- Create tables: `quizzes`, `questions`, `options`, `admin_emails`
- Enable RLS and policies
- Add your Google email to `admin_emails` for admin access

### 4. Auth (Google)

Enable the Google provider and set redirect URLs in Supabase. See [docs/AUTH.md](docs/AUTH.md).

### 5. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You’ll see the quiz list; use **Sign in** to log in with Google and **Admin** (in the navbar) to manage quizzes if your email is in `admin_emails`.

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run start` — run production server
- `npm run lint` — run ESLint

## Deploy (Vercel)

1. Deploy on [Vercel](https://vercel.com); set the same env vars (`NEXT_PUBLIC_SUPABASE_URL`, key).
2. **Supabase → Authentication → URL Configuration:**
   - **Site URL:** `https://your-app.vercel.app` (your Vercel URL).
   - **Redirect URLs:** add `https://your-app.vercel.app/auth/callback` (keep `http://localhost:3000/auth/callback` for local dev).
3. If after sign-in you are redirected to localhost, set in Vercel **Environment Variables**:
   - `NEXT_PUBLIC_APP_URL` = `https://your-app.vercel.app` (no trailing slash).

After that, redeploy. The auth callback uses this URL for redirects in production.
