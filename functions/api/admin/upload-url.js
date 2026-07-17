import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const ALLOWED_EXTENSIONS = [".mp4", ".mkv", ".m3u8", ".webm", ".avi"];
const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024; // 5 GB
const BUCKET_NAME = "rebafilme";
const PRESIGN_TTL_SECONDS = 3600; // 1 hour

function getContentType(filename) {
  const ext = filename.toLowerCase().split(".").pop();
  const map = {
    mp4: "video/mp4",
    mkv: "video/x-matroska",
    webm: "video/webm",
    avi: "video/x-msvideo",
    m3u8: "application/vnd.apple.mpegurl",
  };
  return map[ext] || "application/octet-stream";
}

export async function onRequestPost({ request, env }) {
  // 1. Admin auth
  const token = request.headers.get("x-admin-token");
  if (!token || token !== env.ADMIN_PASSWORD) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 2. Validate required env vars
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = env.R2_ACCESS_KEY_ID;
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY;
  const r2PublicUrl = env.R2_PUBLIC_URL;

  if (!accountId || !accessKeyId || !secretAccessKey || !r2PublicUrl) {
    return new Response(
      JSON.stringify({
        error:
          "R2 credentials not configured. Set R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY via `wrangler secret put`.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // 3. Parse body
  let filename, fileSize;
  try {
    ({ filename, fileSize } = await request.json());
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!filename || typeof fileSize !== "number") {
    return new Response(
      JSON.stringify({ error: "filename and fileSize are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // 4. Validate extension
  const lowerName = filename.toLowerCase();
  const hasAllowedExt = ALLOWED_EXTENSIONS.some((ext) =>
    lowerName.endsWith(ext)
  );
  if (!hasAllowedExt) {
    return new Response(
      JSON.stringify({
        error: `File type not allowed. Accepted: ${ALLOWED_EXTENSIONS.join(", ")}`,
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // 5. Validate size
  if (fileSize > MAX_FILE_SIZE) {
    return new Response(
      JSON.stringify({ error: "File exceeds 5 GB maximum size" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // 6. Build the R2 key
  const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "-");
  const key = `movies/${Date.now()}-${safeFilename}`;
  const contentType = getContentType(filename);

  // 7. Create S3 client pointed at R2
  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  // 8. Generate presigned PUT URL
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    const presignedUrl = await getSignedUrl(s3, command, {
      expiresIn: PRESIGN_TTL_SECONDS,
    });

    // 9. Return presigned URL + final public URL
    const publicUrl = `${r2PublicUrl.replace(/\/$/, "")}/${key}`;

    return new Response(
      JSON.stringify({ presignedUrl, key, publicUrl, contentType }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[upload-url] presign error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to generate upload URL" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
