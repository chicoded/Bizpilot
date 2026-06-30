-- BizPilot AI: Row Level Security policies for Supabase
-- Run in Supabase Dashboard → SQL Editor AFTER: npm run db:setup
--
-- Note: The app uses Clerk + Prisma for auth/data access. These policies protect
-- direct Supabase client access (storage, realtime). Wire Clerk JWT to Supabase
-- auth or use the service role server-side for admin operations.

-- ---------------------------------------------------------------------------
-- Enable RLS on all tenant tables
-- ---------------------------------------------------------------------------
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_health_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Helper: business IDs for the authenticated user (Clerk sub in JWT)
-- Requires Supabase JWT custom claim "sub" matching Clerk user id.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auth.business_ids()
RETURNS SETOF text AS $$
  SELECT business_id::text FROM memberships WHERE user_id = auth.jwt() ->> 'sub'
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ---------------------------------------------------------------------------
-- Tenant isolation policies
-- ---------------------------------------------------------------------------
CREATE POLICY "businesses_tenant_isolation" ON businesses
  FOR ALL USING (id IN (SELECT auth.business_ids()));

CREATE POLICY "memberships_tenant_isolation" ON memberships
  FOR ALL USING (business_id IN (SELECT auth.business_ids()));

CREATE POLICY "products_tenant_isolation" ON products
  FOR ALL USING (business_id IN (SELECT auth.business_ids()));

CREATE POLICY "stock_adjustments_tenant_isolation" ON stock_adjustments
  FOR ALL USING (business_id IN (SELECT auth.business_ids()));

CREATE POLICY "sales_tenant_isolation" ON sales
  FOR ALL USING (business_id IN (SELECT auth.business_ids()));

CREATE POLICY "sale_items_tenant_isolation" ON sale_items
  FOR ALL USING (
    sale_id IN (SELECT id FROM sales WHERE business_id IN (SELECT auth.business_ids()))
  );

CREATE POLICY "expenses_tenant_isolation" ON expenses
  FOR ALL USING (business_id IN (SELECT auth.business_ids()));

CREATE POLICY "customers_tenant_isolation" ON customers
  FOR ALL USING (business_id IN (SELECT auth.business_ids()));

CREATE POLICY "suppliers_tenant_isolation" ON suppliers
  FOR ALL USING (business_id IN (SELECT auth.business_ids()));

CREATE POLICY "purchase_orders_tenant_isolation" ON purchase_orders
  FOR ALL USING (business_id IN (SELECT auth.business_ids()));

CREATE POLICY "employees_tenant_isolation" ON employees
  FOR ALL USING (business_id IN (SELECT auth.business_ids()));

CREATE POLICY "subscriptions_tenant_isolation" ON subscriptions
  FOR ALL USING (business_id IN (SELECT auth.business_ids()));

CREATE POLICY "payment_transactions_tenant_isolation" ON payment_transactions
  FOR ALL USING (business_id IN (SELECT auth.business_ids()));

CREATE POLICY "health_scores_tenant_isolation" ON business_health_scores
  FOR ALL USING (business_id IN (SELECT auth.business_ids()));

CREATE POLICY "audit_logs_tenant_isolation" ON audit_logs
  FOR ALL USING (business_id IN (SELECT auth.business_ids()));

CREATE POLICY "whatsapp_configs_tenant_isolation" ON whatsapp_configs
  FOR ALL USING (business_id IN (SELECT auth.business_ids()));

CREATE POLICY "whatsapp_messages_tenant_isolation" ON whatsapp_messages
  FOR ALL USING (business_id IN (SELECT auth.business_ids()));

-- Users: can read own profile
CREATE POLICY "users_self_access" ON users
  FOR SELECT USING (id = auth.jwt() ->> 'sub');

CREATE POLICY "users_self_update" ON users
  FOR UPDATE USING (id = auth.jwt() ->> 'sub');
