import { NextResponse } from "next/server";
import crypto from "crypto";
import {
  getSupabaseSetupErrorMessage,
  getSupabaseStorageBucket,
  getSupabaseStorageClient,
} from "@/src/lib/supabase-server";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES_PER_REQUEST = 20;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function extFromMime(mime: string) {
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  return "";
}

function buildStoragePath(extension: string) {
  const day = new Date().toISOString().slice(0, 10);
  const random = crypto.randomBytes(8).toString("hex");
  return `uploads/${day}/${Date.now()}_${random}${extension}`;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files");

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files uploaded. Use field name "files".' },
        { status: 400 }
      );
    }

    if (files.length > MAX_FILES_PER_REQUEST) {
      return NextResponse.json(
        { error: `Too many files. Max ${MAX_FILES_PER_REQUEST} files per request.` },
        { status: 400 }
      );
    }

    const supabase = getSupabaseStorageClient();
    const bucket = getSupabaseStorageBucket();

    const urls: string[] = [];

    for (const item of files) {
      if (!(item instanceof File)) {
        return NextResponse.json({ error: "Invalid file payload." }, { status: 400 });
      }

      if (!ALLOWED_TYPES.has(item.type)) {
        return NextResponse.json(
          { error: `Unsupported file type: ${item.type}` },
          { status: 415 }
        );
      }

      if (item.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File too large (max 10MB): ${item.name}` },
          { status: 413 }
        );
      }

      const extension = extFromMime(item.type);
      if (!extension) {
        return NextResponse.json(
          { error: `Cannot determine file extension for type: ${item.type}` },
          { status: 400 }
        );
      }

      const arrayBuffer = await item.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const storagePath = buildStoragePath(extension);

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(storagePath, bytes, {
          contentType: item.type,
          upsert: false,
        });

      if (uploadError) {
        return NextResponse.json(
          {
            error:
              `Supabase upload failed: ${uploadError.message}. ` +
              `Check SUPABASE_STORAGE_BUCKET and bucket permissions.`,
          },
          { status: 500 }
        );
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(storagePath);

      if (!publicUrl) {
        return NextResponse.json(
          { error: "Supabase upload succeeded but no public URL was returned." },
          { status: 500 }
        );
      }

      urls.push(publicUrl);
    }

    return NextResponse.json({ urls });
  } catch (error: unknown) {
    console.error(error);

    const supabaseSetupError = getSupabaseSetupErrorMessage(error);
    if (supabaseSetupError) {
      return NextResponse.json({ error: supabaseSetupError }, { status: 500 });
    }

    const message =
      error instanceof Error ? error.message : "Upload failed due to an unknown server error.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
