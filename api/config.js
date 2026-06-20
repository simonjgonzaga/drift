// Drift — runtime config for the browser client.
//
// Returns the Supabase URL and anon key from Vercel env vars so they aren't
// hardcoded in index.html. Both values are public by design (the anon key
// is meant to ship in client bundles; per-user data is protected by Row
// Level Security in the Supabase database). The point of routing through
// an endpoint is rotation: change the env var, redeploy, and every client
// picks up the new value within the cache TTL — no code change needed.

export default function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({
      error: "Supabase env vars not configured",
      missing: [
        !supabaseUrl && "SUPABASE_URL",
        !supabaseAnonKey && "SUPABASE_ANON_KEY",
      ].filter(Boolean),
    });
  }

  // 5-minute browser cache. Keeps the boot path fast on repeat visits while
  // still picking up rotated keys within a reasonable window.
  res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300");
  return res.status(200).json({ supabaseUrl, supabaseAnonKey });
}
