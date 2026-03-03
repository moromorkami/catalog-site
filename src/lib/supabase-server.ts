import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL_MISSING_ERROR =
  "SUPABASE_URL is missing. Add it to .env/.env.local.";
const SUPABASE_SERVICE_ROLE_KEY_MISSING_ERROR =
  "SUPABASE_SERVICE_ROLE_KEY is missing. Add it to .env/.env.local.";
const SUPABASE_STORAGE_BUCKET_MISSING_ERROR =
  "SUPABASE_STORAGE_BUCKET is missing. Add it to .env/.env.local.";

type SupabaseEnv = {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  storageBucket: string;
};

let cachedEnv: SupabaseEnv | null = null;

function readSupabaseEnv(): SupabaseEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const storageBucket = process.env.SUPABASE_STORAGE_BUCKET?.trim();

  if (!supabaseUrl) {
    throw new Error(SUPABASE_URL_MISSING_ERROR);
  }

  if (!supabaseServiceRoleKey) {
    throw new Error(SUPABASE_SERVICE_ROLE_KEY_MISSING_ERROR);
  }

  if (!storageBucket) {
    throw new Error(SUPABASE_STORAGE_BUCKET_MISSING_ERROR);
  }

  cachedEnv = { supabaseUrl, supabaseServiceRoleKey, storageBucket };
  return cachedEnv;
}

export function getSupabaseStorageClient() {
  const { supabaseUrl, supabaseServiceRoleKey } = readSupabaseEnv();

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function getSupabaseStorageBucket() {
  return readSupabaseEnv().storageBucket;
}

export function getSupabaseSetupErrorMessage(error: unknown): string | null {
  if (!(error instanceof Error)) {
    return null;
  }

  const message = error.message;
  if (
    message.includes("SUPABASE_URL is missing") ||
    message.includes("SUPABASE_SERVICE_ROLE_KEY is missing") ||
    message.includes("SUPABASE_STORAGE_BUCKET is missing")
  ) {
    return message;
  }

  return null;
}
