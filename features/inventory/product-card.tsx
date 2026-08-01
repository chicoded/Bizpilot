import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ProductImage } from "@/components/product/product-image";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { AlertTriangle, Ban } from "lucide-react";
import type { InventoryListProduct } from "@/lib/products";

interface ProductCardProps {
  product: Pick<
    InventoryListProduct,
    | "id"
    | "name"
    | "category"
    | "sellingPrice"
    | "quantity"
    | "reorderLevel"
    | "expiryDate"
    | "imageUrl"
  >;
  currency: string;
  isLowStock: boolean;
  /** Within the warning window and still sellable. */
  isExpiring: boolean;
  /** Already past its date — a different problem, and a worse one. */
  isExpired?: boolean;
}

export function ProductCard({
  product,
  currency,
  isLowStock,
  isExpiring,
  isExpired = false,
}: ProductCardProps) {
  const outOfStock = product.quantity === 0;

  return (
    <Link
      href={`/inventory/${product.id}`}
      className="block rounded-lg touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Card className="h-full overflow-hidden transition-colors hover:border-primary active:scale-[0.99]">
        {/* Shorter than the old 4:3 so more of the shelf fits on one screen —
            on this page the facts are what get scanned, not the photograph. */}
        <div className="relative aspect-[16/9] w-full bg-muted">
          <ProductImage imageUrl={product.imageUrl} alt={product.name} />

          {/* Worded, not just an icon: a lone triangle does not say whether the
              problem is the stock level or the expiry date. */}
          {(isExpired || isLowStock || outOfStock) && (
            <span
              className={cn(
                "absolute right-2 top-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold shadow-sm",
                isExpired || outOfStock
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-warning text-warning-foreground"
              )}
            >
              {isExpired || outOfStock ? (
                <Ban className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
              )}
              {isExpired ? "Expired" : outOfStock ? "Out of stock" : "Low"}
            </span>
          )}
        </div>

        <CardContent className="p-3.5">
          <h3 className="line-clamp-2 font-semibold leading-snug text-foreground">
            {product.name}
          </h3>
          {product.category && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {product.category}
            </p>
          )}

          <div className="mt-2.5 flex items-end justify-between gap-2">
            <div className="min-w-0">
              <p className="tnum text-lg font-bold leading-tight text-foreground">
                {formatCurrency(product.sellingPrice, currency)}
              </p>
              <p
                className={cn(
                  "tnum text-sm font-medium",
                  outOfStock
                    ? "text-destructive"
                    : isLowStock
                      ? "text-warning"
                      : "text-muted-foreground"
                )}
              >
                {product.quantity} in stock
              </p>
            </div>

            {product.expiryDate && (
              <p
                className={cn(
                  "shrink-0 text-right text-xs font-medium",
                  isExpired
                    ? "text-destructive"
                    : isExpiring
                      ? "text-warning"
                      : "text-muted-foreground"
                )}
              >
                <span className="block">{isExpired ? "Expired" : "Expires"}</span>
                <span className="tnum">{formatDate(product.expiryDate)}</span>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
