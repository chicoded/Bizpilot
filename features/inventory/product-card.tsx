import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ProductImage } from "@/components/product/product-image";
import { formatCurrency, formatDate } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";
import { productTypeLabel, normalizeProductType } from "@/lib/product-types";

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    category: string | null;
    productType?: string | null;
    sellingPrice: number;
    quantity: number;
    reorderLevel: number;
    tracksStock?: boolean;
    expiryDate: Date | null;
    imageUrl: string | null;
  };
  currency: string;
  isLowStock: boolean;
  isExpiring: boolean;
}

export function ProductCard({
  product,
  currency,
  isLowStock,
  isExpiring,
}: ProductCardProps) {
  const type = normalizeProductType(product.productType);
  const showStock = product.tracksStock !== false && type !== "MENU_ITEM";

  return (
    <Link
      href={`/inventory/${product.id}`}
      className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-biz-blue focus-visible:ring-offset-2 touch-manipulation"
    >
      <Card className="hover:shadow-glass transition-shadow cursor-pointer h-full active:scale-[0.99] overflow-hidden">
        <div className="relative aspect-[4/3] w-full bg-muted">
          <ProductImage
            imageUrl={product.imageUrl}
            alt={product.name}
          />
          {isLowStock && (
            <div className="absolute top-2 right-2 rounded-full bg-amber-100 p-1.5 shadow-sm">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </div>
          )}
          {type !== "READY_MADE" && (
            <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
              {productTypeLabel(type)}
            </span>
          )}
        </div>
        <CardContent className="p-4">
          <h3 className="font-semibold truncate mb-1">{product.name}</h3>
          {product.category && (
            <p className="text-xs text-muted-foreground mb-2">
              {product.category}
            </p>
          )}
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-lg font-bold text-brand">
                {formatCurrency(product.sellingPrice, currency)}
              </p>
              <p
                className={`text-sm font-medium ${
                  isLowStock ? "text-amber-600" : "text-muted-foreground"
                }`}
              >
                {showStock
                  ? `${product.quantity} in stock`
                  : type === "MENU_ITEM"
                    ? "Made to order"
                    : `${product.quantity} available`}
              </p>
            </div>
            {product.expiryDate && (
              <p
                className={`text-xs shrink-0 ${
                  isExpiring ? "text-red-500 font-medium" : "text-muted-foreground"
                }`}
              >
                Exp: {formatDate(product.expiryDate)}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
