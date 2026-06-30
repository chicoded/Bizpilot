import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { AlertTriangle, Package } from "lucide-react";

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    category: string | null;
    sellingPrice: number;
    quantity: number;
    reorderLevel: number;
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
  return (
    <Link
      href={`/inventory/${product.id}`}
      className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-biz-blue focus-visible:ring-offset-2 touch-manipulation"
    >
      <Card className="hover:shadow-glass transition-shadow cursor-pointer h-full active:scale-[0.99] overflow-hidden">
        <div className="relative aspect-[4/3] w-full bg-slate-100">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <Package className="h-10 w-10 opacity-40" />
            </div>
          )}
          {isLowStock && (
            <div className="absolute top-2 right-2 rounded-full bg-amber-100 p-1.5 shadow-sm">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </div>
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
