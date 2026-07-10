"use client";

import { useCallback, useEffect, useState } from "react";
import type { LocalProduct } from "@/lib/local-db/types";
import { listLocalProducts } from "@/lib/local-data/products";
import { useLocalData } from "@/components/providers/local-data-provider";

export function useLocalProducts() {
  const { businessId, status, refresh } = useLocalData();
  const [products, setProducts] = useState<LocalProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!businessId) {
      setProducts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const rows = await listLocalProducts(businessId);
      setProducts(rows);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    if (status === "ready") {
      void reload();
    }
  }, [status, reload]);

  return {
    products,
    loading: loading || status === "loading",
    businessId,
    reload,
    refreshAll: refresh,
  };
}
