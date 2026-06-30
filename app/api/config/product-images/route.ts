import { NextResponse } from "next/server";
import { isProductImageUploadEnabled } from "@/lib/product-images";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    enabled: isProductImageUploadEnabled(),
  });
}
