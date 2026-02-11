import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import { nanoid } from "nanoid";
import { ACCEPTED_IMAGE_TYPES, MAX_FILE_SIZE_BYTES } from "@/lib/config/constants";

const ACCEPTED_CONTENT_TYPES = Object.keys(ACCEPTED_IMAGE_TYPES);

function getExtension(contentType: string): string | null {
  const extensions = ACCEPTED_IMAGE_TYPES[contentType];
  if (!extensions || extensions.length === 0) return null;
  return extensions[0].replace(".", "");
}

/**
 * POST /api/upload/signed-url
 * Generate a signed upload URL for direct client-to-Supabase-Storage upload.
 * Body: { filename, contentType, draftId }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { filename, contentType, draftId } = body as {
      filename: string;
      contentType: string;
      draftId: string;
    };

    if (!filename || !contentType || !draftId) {
      return NextResponse.json(
        { error: "Missing required fields: filename, contentType, draftId" },
        { status: 400 }
      );
    }

    // Validate content type
    if (!ACCEPTED_CONTENT_TYPES.includes(contentType)) {
      return NextResponse.json(
        {
          error: `Invalid content type "${contentType}". Accepted: ${ACCEPTED_CONTENT_TYPES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Get extension from content type
    const ext = getExtension(contentType);
    if (!ext) {
      return NextResponse.json(
        { error: "Could not determine file extension" },
        { status: 400 }
      );
    }

    // Validate filename extension matches content type
    const fileExt = filename.split(".").pop()?.toLowerCase();
    const allowedExts = ACCEPTED_IMAGE_TYPES[contentType].map((e) =>
      e.replace(".", "").toLowerCase()
    );
    if (fileExt && !allowedExts.includes(fileExt)) {
      return NextResponse.json(
        {
          error: `File extension ".${fileExt}" does not match content type "${contentType}"`,
        },
        { status: 400 }
      );
    }

    // Generate unique storage path
    const path = `${user.id}/${draftId}/${nanoid()}.${ext}`;

    // Create signed upload URL
    const { data, error } = await supabase.storage
      .from("benchmark-images")
      .createSignedUploadUrl(path);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      signedUrl: data.signedUrl,
      token: data.token,
      path,
      maxSize: MAX_FILE_SIZE_BYTES,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate signed URL";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
