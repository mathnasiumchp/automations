import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

let client: SupabaseClient | null = null;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, "../.env.local") });

export function supabase(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase environment variables.");
  }

  client = createClient(url, key);
  return client;
}
