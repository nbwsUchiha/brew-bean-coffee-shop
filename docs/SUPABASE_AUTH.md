# Supabase auth — production URLs

Auth emails (confirm signup, magic link) use **redirect URLs**. If Supabase still points at `localhost`, fix this in the dashboard.

## 1. Supabase dashboard

Go to **Authentication → URL Configuration**:

| Field | Value |
|-------|--------|
| **Site URL** | `https://brew-bean-coffee.pages.dev` |
| **Redirect URLs** | Add both: |
| | `https://brew-bean-coffee.pages.dev/**` |
| | `http://localhost:5173/**` |

Save.

## 2. What the app does

Sign-up uses your **current browser origin** for `emailRedirectTo`, so:

- On **localhost** → confirms back to `http://localhost:5173/login`
- On **Pages** → confirms back to `https://brew-bean-coffee.pages.dev/login`

No code change needed when you switch environments — only the Supabase allowlist above.

## 3. Email templates (optional)

**Authentication → Email Templates** — customize confirm signup / reset password copy for Brew & Bean branding.

## 4. Test

1. On live site: sign up with a real email  
2. Click confirm link in inbox  
3. You should land on `/login` on **brew-bean-coffee.pages.dev**, not localhost  
