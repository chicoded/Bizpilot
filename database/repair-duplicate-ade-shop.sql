-- Optional cleanup: empty typo shop "ade pharmcy" vs real "ade pharmacy".
-- Review before running. Safe approach: remove duplicate empty memberships
-- so cashiers are not stuck on the empty shop.

-- 1) Inspect
-- SELECT id, name FROM businesses WHERE name ILIKE '%ade%';

-- 2) Remove Augustine (and others) from the EMPTY typo shop only
-- (replace IDs after checking)
/*
DELETE FROM memberships
WHERE "businessId" = 'cmr0fx6s30002l5045gif6rsv';  -- ade pharmcy (0 products)

-- Optional: delete the empty typo business entirely if no products/sales
DELETE FROM businesses
WHERE id = 'cmr0fx6s30002l5045gif6rsv'
  AND NOT EXISTS (SELECT 1 FROM products WHERE "businessId" = 'cmr0fx6s30002l5045gif6rsv')
  AND NOT EXISTS (SELECT 1 FROM sales WHERE "businessId" = 'cmr0fx6s30002l5045gif6rsv');
*/
