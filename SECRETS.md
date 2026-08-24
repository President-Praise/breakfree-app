# Secrets & keys for `breakfree-app`

Where to re-provision each environment variable if you've lost the original values.
Generated automatically from a scan of the codebase — verify against the actual code before trusting.

| Variable | Service | Where to get it |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | supabase.com → Project → Settings → API |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL | supabase.com → Project → Settings → API |

## Recovery workflow

1. Copy `.env.example` to `.env`
2. For each row above, visit the linked dashboard and either find the existing key or create a new one
3. Paste values into `.env` (never commit)
4. `npm install` / `pip install -r requirements.txt` then run
