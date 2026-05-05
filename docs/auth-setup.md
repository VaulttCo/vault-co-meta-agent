# Vault Co Auth Setup

The Vault Co Internal Portal uses **Supabase Auth** for production and a **Mock Demo Mode** for local development.

## 1. Local Development (Demo Mode)

By default, the app runs in demo mode locally. This allows you to test role-based access control without setting up a database.

In your `.env.local`:
```env
NEXT_PUBLIC_AUTH_MODE=demo
```

When `demo` mode is active:
- The `/login` page shows a role-picker with mock users (Admin, Media Buyer, Setter).
- The Next.js middleware skips all server-side auth checks.
- Auth state is stored in `localStorage`.

## 2. Production (Supabase Auth)

In production (Vercel), the app must use real Supabase Auth.

In your Vercel environment variables:
```env
NEXT_PUBLIC_AUTH_MODE=supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

When `supabase` mode is active:
- The `/login` page shows a real Email/Password and Magic Link form.
- The Next.js middleware protects all routes at the edge. Unauthenticated users are redirected to `/login`.
- Auth state is managed via secure cookies using `@supabase/ssr`.

## 3. Database Setup

To use Supabase Auth, you must create the `user_profiles` table. This table stores the user's role and display name, linking back to the `auth.users` table.

1. Go to your Supabase Dashboard → SQL Editor
2. Copy the contents of `docs/migrations/001_user_profiles.sql`
3. Run the query

### Creating Users

Because this is an internal portal, public sign-ups should be disabled in Supabase:
1. Go to **Authentication → Providers → Email**
2. Turn OFF "Confirm email" (optional, but easier for internal tools)
3. Turn OFF "Enable Signups" (prevents random people from creating accounts)

To add a team member:
1. Go to **Authentication → Users** in the Supabase Dashboard
2. Click **Add User → Create New User**
3. Enter their email and a temporary password
4. The database trigger (`on_auth_user_created`) will automatically create a row in `user_profiles` with the default role `setter`.
5. Go to the **Table Editor → user_profiles** and change their role to `admin` or `media_buyer` as needed.

## 4. Role-Based Access Control (RBAC)

Roles are defined in `src/lib/auth/types.ts`:
- `admin`: Full access
- `media_buyer`: Can generate and submit campaigns, view analytics
- `setter`: Can view clients and notes
- `client_viewer`: Read-only access to approved reports

Permissions are mapped in `src/lib/auth/permissions.ts`.

To check permissions in a component:
```tsx
import { useAuth } from "@/components/AuthProvider";

export function MyComponent() {
  const { can } = useAuth();

  if (!can("canApproveCampaigns")) {
    return <div>Access Denied</div>;
  }

  return <button>Approve</button>;
}
```
