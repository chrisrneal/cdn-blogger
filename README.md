# cdn-blogger
A simple blogger/social media tool.

## Environment

Create a `.env.local` file in the project root for local development and add the following keys (replace with your Supabase values):

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

The app reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` at runtime to connect to Supabase.
