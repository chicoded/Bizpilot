import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

const BUCKET = "product-images";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function isProductImageUploadEnabled(): boolean {
  if (!isSupabaseConfigured()) return false;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return Boolean(key && !key.includes("[") && key.length > 20);
}

function extensionFor(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && ["jpg", "jpeg", "png", "webp", "gif"].includes(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  return map[file.type] ?? "jpg";
}

export function validateProductImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    return "Use a JPG, PNG, WebP, or GIF image";
  }
  if (file.size > MAX_BYTES) {
    return "Image must be 5 MB or smaller";
  }
  return null;
}

export async function uploadProductImage(
  businessId: string,
  file: File,
  productId: string
): Promise<string> {
  if (!isProductImageUploadEnabled()) {
    throw new Error(
      "Image upload is not configured. Add SUPABASE_SERVICE_ROLE_KEY in your environment."
    );
  }

  const validationError = validateProductImageFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const ext = extensionFor(file);
  const path = `${businessId}/${productId}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const supabase = createServerSupabaseClient();

  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type,
    upsert: true,
  });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteProductImage(imageUrl: string | null | undefined) {
  if (!imageUrl || !isProductImageUploadEnabled()) return;

  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const index = imageUrl.indexOf(marker);
  if (index === -1) return;

  const path = decodeURIComponent(imageUrl.slice(index + marker.length));
  const supabase = createServerSupabaseClient();
  await supabase.storage.from(BUCKET).remove([path]);
}
