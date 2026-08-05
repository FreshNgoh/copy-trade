import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
}

if (!serviceRoleKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY");
}

export const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    // Next.js patches server-side fetch and may otherwise persist stale
    // Supabase REST responses in its data cache.
    fetch: (input, init) =>
      fetch(input, {
        ...init,
        cache: "no-store",
      }),
  },
});
