import crypto from "node:crypto";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT ?? "http://localhost:9000";
const MINIO_BUCKET = process.env.MINIO_BUCKET ?? "pfram-private";
const MINIO_ACCESS_KEY = process.env.MINIO_ROOT_USER ?? process.env.MINIO_ACCESS_KEY ?? "pfram_minio";
const MINIO_SECRET_KEY = process.env.MINIO_ROOT_PASSWORD ?? "pfram_dev_only";

const LOCAL_FALLBACK_DIR = path.resolve(process.cwd(), ".local_storage", "consultation");

function hmac(key: Buffer | string, str: string): Buffer {
  return crypto.createHmac("sha256", key).update(str).digest();
}

function hash(data: Buffer | string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function getSignatureKey(key: string, dateStamp: string, regionName: string, serviceName: string): Buffer {
  const kDate = hmac("AWS4" + key, dateStamp);
  const kRegion = hmac(kDate, regionName);
  const kService = hmac(kRegion, serviceName);
  return hmac(kService, "aws4_request");
}

async function putToMinio(objectKey: string, buffer: Buffer, mimeType: string): Promise<boolean> {
  try {
    const url = new URL(MINIO_ENDPOINT);
    const date = new Date();
    const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.substring(0, 8);
    const region = "us-east-1";
    const service = "s3";

    const payloadHash = hash(buffer);
    const requestPath = `/${MINIO_BUCKET}/${objectKey}`;

    const hostHeader = url.port ? `${url.hostname}:${url.port}` : url.hostname;
    const canonicalHeaders = `host:${hostHeader}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = "host;x-amz-content-sha256;x-amz-date";

    const canonicalRequest = [
      "PUT",
      requestPath,
      "",
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");

    const algorithm = "AWS4-HMAC-SHA256";
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = [
      algorithm,
      amzDate,
      credentialScope,
      hash(canonicalRequest),
    ].join("\n");

    const signingKey = getSignatureKey(MINIO_SECRET_KEY, dateStamp, region, service);
    const signature = crypto.createHmac("sha256", signingKey).update(stringToSign).digest("hex");

    const authHeader = `${algorithm} Credential=${MINIO_ACCESS_KEY}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return await new Promise<boolean>((resolve) => {
      const req = http.request(
        {
          hostname: url.hostname,
          port: url.port ? Number(url.port) : 9000,
          path: requestPath,
          method: "PUT",
          timeout: 4000,
          headers: {
            Host: hostHeader,
            "x-amz-date": amzDate,
            "x-amz-content-sha256": payloadHash,
            Authorization: authHeader,
            "Content-Type": mimeType,
            "Content-Length": buffer.length,
          },
        },
        (res) => {
          res.on("data", () => {});
          res.on("end", () => {
            resolve(res.statusCode !== undefined && res.statusCode >= 200 && res.statusCode < 300);
          });
        },
      );
      req.on("error", () => resolve(false));
      req.on("timeout", () => {
        req.destroy();
        resolve(false);
      });
      req.write(buffer);
      req.end();
    });
  } catch {
    return false;
  }
}

async function getFromMinio(objectKey: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const url = new URL(MINIO_ENDPOINT);
    const date = new Date();
    const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.substring(0, 8);
    const region = "us-east-1";
    const service = "s3";

    const payloadHash = hash("");
    const requestPath = `/${MINIO_BUCKET}/${objectKey}`;

    const hostHeader = url.port ? `${url.hostname}:${url.port}` : url.hostname;
    const canonicalHeaders = `host:${hostHeader}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = "host;x-amz-content-sha256;x-amz-date";

    const canonicalRequest = [
      "GET",
      requestPath,
      "",
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");

    const algorithm = "AWS4-HMAC-SHA256";
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = [
      algorithm,
      amzDate,
      credentialScope,
      hash(canonicalRequest),
    ].join("\n");

    const signingKey = getSignatureKey(MINIO_SECRET_KEY, dateStamp, region, service);
    const signature = crypto.createHmac("sha256", signingKey).update(stringToSign).digest("hex");

    const authHeader = `${algorithm} Credential=${MINIO_ACCESS_KEY}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return await new Promise<{ buffer: Buffer; contentType: string } | null>((resolve) => {
      const req = http.request(
        {
          hostname: url.hostname,
          port: url.port ? Number(url.port) : 9000,
          path: requestPath,
          method: "GET",
          timeout: 4000,
          headers: {
            Host: hostHeader,
            "x-amz-date": amzDate,
            "x-amz-content-sha256": payloadHash,
            Authorization: authHeader,
          },
        },
        (res) => {
          if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
            resolve(null);
            return;
          }
          const chunks: Buffer[] = [];
          res.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
          res.on("end", () => {
            resolve({
              buffer: Buffer.concat(chunks),
              contentType: (res.headers["content-type"] as string) ?? "application/octet-stream",
            });
          });
        },
      );
      req.on("error", () => resolve(null));
      req.on("timeout", () => {
        req.destroy();
        resolve(null);
      });
      req.end();
    });
  } catch {
    return null;
  }
}

export async function saveConsultationMedia(
  objectKey: string,
  buffer: Buffer,
  mimeType: string,
): Promise<void> {
  const minioOk = await putToMinio(objectKey, buffer, mimeType);
  if (!minioOk) {
    const targetFile = path.join(LOCAL_FALLBACK_DIR, objectKey);
    fs.mkdirSync(path.dirname(targetFile), { recursive: true });
    fs.writeFileSync(targetFile, buffer);
  }
}

export async function getConsultationMedia(
  objectKey: string,
  fallbackMimeType = "application/octet-stream",
): Promise<{ buffer: Buffer; contentType: string }> {
  const fromMinio = await getFromMinio(objectKey);
  if (fromMinio) return fromMinio;

  const targetFile = path.join(LOCAL_FALLBACK_DIR, objectKey);
  if (fs.existsSync(targetFile)) {
    const buffer = fs.readFileSync(targetFile);
    return { buffer, contentType: fallbackMimeType };
  }

  throw new Error("File not found in storage");
}

export const ALLOWED_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export const ALLOWED_VOICE_MIMES = new Set([
  "audio/m4a",
  "audio/mp4",
  "audio/aac",
  "audio/mpeg",
  "audio/webm",
  "audio/wav",
  "audio/x-m4a",
  "audio/ogg",
]);

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_VOICE_BYTES = 10 * 1024 * 1024; // 10 MB

export function validateAndProcessAttachment(input: {
  originalFilename: string;
  mimeType: string;
  fileData: string;
  durationSeconds?: number | null | undefined;
}): {
  buffer: Buffer;
  fileType: "IMAGE" | "VOICE";
  extension: string;
  storageKey: string;
} {
  const normalizedMime = input.mimeType.toLowerCase().trim();
  let fileType: "IMAGE" | "VOICE";

  if (ALLOWED_IMAGE_MIMES.has(normalizedMime)) {
    fileType = "IMAGE";
  } else if (ALLOWED_VOICE_MIMES.has(normalizedMime)) {
    fileType = "VOICE";
  } else {
    throw new Error(`Tipe file media '${input.mimeType}' tidak didukung. Gunakan gambar (JPEG/PNG/WebP) atau suara (m4a/aac/mp4/webm/wav).`);
  }

  const base64Clean = input.fileData.includes(",")
    ? input.fileData.split(",")[1]!
    : input.fileData;
  const buffer = Buffer.from(base64Clean, "base64");

  if (buffer.length === 0) {
    throw new Error("Data file kosong atau format base64 tidak valid");
  }

  if (fileType === "IMAGE" && buffer.length > MAX_IMAGE_BYTES) {
    throw new Error("Ukuran foto melebihi batas maksimal 5 MB");
  }

  if (fileType === "VOICE" && buffer.length > MAX_VOICE_BYTES) {
    throw new Error("Ukuran rekaman suara melebihi batas maksimal 10 MB");
  }

  const extMatch = input.originalFilename.match(/\.([a-zA-Z0-9]+)$/);
  const extension = extMatch ? extMatch[1]!.toLowerCase() : fileType === "IMAGE" ? "jpg" : "m4a";

  const storageKey = `attachments/${crypto.randomUUID()}-${Date.now()}.${extension}`;

  return {
    buffer,
    fileType,
    extension,
    storageKey,
  };
}
