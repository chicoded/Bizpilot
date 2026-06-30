"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductImageFieldProps {
  currentImageUrl?: string | null;
  disabled?: boolean;
}

export function ProductImageField({
  currentImageUrl,
  disabled,
}: ProductImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentImageUrl ?? null);
  const [removed, setRemoved] = useState(false);
  const [uploadsEnabled, setUploadsEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/config/product-images")
      .then((res) => res.json())
      .then((data: { enabled?: boolean }) => setUploadsEnabled(Boolean(data.enabled)))
      .catch(() => setUploadsEnabled(false));
  }, []);

  useEffect(() => {
    setPreview(currentImageUrl ?? null);
    setRemoved(false);
  }, [currentImageUrl]);

  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (preview?.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }

    setPreview(URL.createObjectURL(file));
    setRemoved(false);
  }

  function handleRemove() {
    if (preview?.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
    setRemoved(true);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  const uploadDisabled = disabled || uploadsEnabled === false;

  return (
    <div className="space-y-2">
      <Label htmlFor="image">Product photo (optional)</Label>
      <input type="hidden" name="removeImage" value={removed ? "true" : "false"} />

      {uploadsEnabled === false && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          Photo uploads are not configured yet. Add{" "}
          <span className="font-mono">SUPABASE_SERVICE_ROLE_KEY</span> in Vercel
          environment variables, then redeploy.
        </p>
      )}

      {preview ? (
        <div className="relative overflow-hidden rounded-xl border bg-slate-50">
          <div className="relative aspect-[4/3] w-full">
            <Image
              src={preview}
              alt="Product preview"
              fill
              className="object-cover"
              unoptimized={preview.startsWith("blob:")}
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="absolute top-2 right-2 h-8 w-8 p-0 rounded-full"
            onClick={handleRemove}
            disabled={uploadDisabled}
            aria-label="Remove image"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          disabled={uploadDisabled}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-slate-50/80 px-4 py-8 text-center transition-colors",
            "hover:border-biz-blue hover:bg-biz-blue/5 touch-manipulation",
            uploadDisabled && "opacity-50 pointer-events-none"
          )}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm">
            <ImagePlus className="h-6 w-6 text-biz-blue" />
          </div>
          <div>
            <p className="text-sm font-medium">Add a product photo</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              JPG, PNG, WebP or GIF · max 5 MB
            </p>
          </div>
        </button>
      )}

      {preview && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          disabled={uploadDisabled}
          onClick={() => inputRef.current?.click()}
        >
          Change photo
        </Button>
      )}

      <input
        ref={inputRef}
        id="image"
        name="image"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        disabled={uploadDisabled}
        onChange={handleFileChange}
      />
    </div>
  );
}
