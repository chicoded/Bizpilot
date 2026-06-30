"use client";

import { useState } from "react";
import Image from "next/image";
import { Package } from "lucide-react";
import {
  getProductDisplayImageUrl,
  isProductPlaceholderImage,
} from "@/lib/product-images";

interface ProductImageProps {
  imageUrl: string | null | undefined;
  alt: string;
  className?: string;
  sizes?: string;
  fill?: boolean;
}

export function ProductImage({
  imageUrl,
  alt,
  className = "object-cover",
  sizes = "(max-width: 640px) 50vw, 33vw",
  fill = true,
}: ProductImageProps) {
  const [failed, setFailed] = useState(false);
  const displayUrl = getProductDisplayImageUrl(
    failed ? null : imageUrl
  );
  const showPlaceholder = isProductPlaceholderImage(displayUrl);

  if (showPlaceholder) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-100 text-muted-foreground">
        <Package className="h-10 w-10 opacity-40" aria-hidden />
      </div>
    );
  }

  return (
    <Image
      src={displayUrl}
      alt={alt}
      fill={fill}
      className={className}
      sizes={sizes}
      onError={() => setFailed(true)}
    />
  );
}
