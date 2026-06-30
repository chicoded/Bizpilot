import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    category: string | null;
    sellingPrice: number;
    quantity: number;
    reorderLevel: number;
    expiryDate: Date | null;
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
  return (
    <Link
      href={`/inventory/${product.id}`}
      className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-biz-blue focus-visible:ring-offset-2 touch-manipulation"
    >
      <Card className="hover:shadow-glass transition-shadow cursor-pointer h-full active:scale-[0.99]">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold truncate flex-1">{product.name}</h3>
            {isLowStock && (
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            )}
          </div>
          {product.category && (
            <p className="text-xs text-muted-foreground mb-3">
              {product.category}
            </p>
          )}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-lg font-bold text-biz-blue">
                {formatCurrency(product.sellingPrice, currency)}
              </p>
              <p
                className={`text-sm font-medium ${
                  isLowStock ? "text-amber-600" : "text-muted-foreground"
                }`}
              >
                {product.quantity} in stock
              </p>
            </div>
            {product.expiryDate && (
              <p
                className={`text-xs ${
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
