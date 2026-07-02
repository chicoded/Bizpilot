"use client";

import { useState } from "react";
import { Package } from "lucide-react";
import {
  getProductDisplayImageUrl,
  isProductPlaceholderImage,
} from "@/lib/product-images";

interface ProductImageProps {
  imageUrl: string | null | undefined;
  alt: string;
  className?: string;
}

export function ProductImage({
  imageUrl,
  alt,
  className = "object-cover",
}: ProductImageProps) {
  const [failed, setFailed] = useState(false);
  const displayUrl = getProductDisplayImageUrl(failed ? null : imageUrl);
  const showPlaceholder = isProductPlaceholderImage(displayUrl);

  if (showPlaceholder) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
        <Package className="h-10 w-10 opacity-40" aria-hidden />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={displayUrl}
      alt={alt}
      className={`absolute inset-0 h-full w-full ${className}`}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
