-- BizPilot AI: Row Level Security policies for Supabase
-- Run after Prisma migrations on Supabase SQL editor

-- Enable RLS on all tenant tables
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_health_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Helper: get business IDs for current Clerk user (set via JWT claim)
CREATE OR REPLACE FUNCTION auth.business_ids()
RETURNS SETOF text AS $$
  SELECT business_id::text FROM memberships WHERE user_id = auth.jwt() ->> 'sub'
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Products: users can only access their business products
CREATE POLICY "products_tenant_isolation" ON products
  FOR ALL USING (business_id IN (SELECT auth.business_ids()));

CREATE POLICY "sales_tenant_isolation" ON sales
  FOR ALL USING (business_id IN (SELECT auth.business_ids()));

CREATE POLICY "expenses_tenant_isolation" ON expenses
  FOR ALL USING (business_id IN (SELECT auth.business_ids()));

CREATE POLICY "customers_tenant_isolation" ON customers
  FOR ALL USING (business_id IN (SELECT auth.business_ids()));

CREATE POLICY "suppliers_tenant_isolation" ON suppliers
  FOR ALL USING (business_id IN (SELECT auth.business_ids()));

CREATE POLICY "health_scores_tenant_isolation" ON business_health_scores
  FOR ALL USING (business_id IN (SELECT auth.business_ids()));

CREATE POLICY "audit_logs_tenant_isolation" ON audit_logs
  FOR ALL USING (business_id IN (SELECT auth.business_ids()));

CREATE POLICY "whatsapp_configs_tenant_isolation" ON whatsapp_configs
  FOR ALL USING (business_id IN (SELECT auth.business_ids()));

CREATE POLICY "whatsapp_messages_tenant_isolation" ON whatsapp_messages
  FOR ALL USING (business_id IN (SELECT auth.business_ids()));
