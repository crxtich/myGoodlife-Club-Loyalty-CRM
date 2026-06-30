-- MVP demo data model — schema corrected to match the real iVend/SAP source
-- table "Membership Sales" (confirmed columns: Region, StoreCode, Description,
-- BusinessDate, Item, ItemDesc, Group, U_SubCategory1, U_SubCategory3, Brand,
-- TransactionKey, TransactionId, CustomerName, PhoneNo, CustomerGrp, PreTax,
-- Quantity, Month, Year). This is LINE-ITEM grain: one row per item purchased
-- in a visit, so one transaction_id can span multiple rows. pre_tax is already
-- the total value of that line — do not multiply by quantity when summing.
--
-- Field names mirror the source columns (snake_cased) so this table maps onto
-- the real iVend/SAP feed with minimal renaming once the live connector
-- (iVend/SAP Azure SQL views -> Node/Express on Azure -> this CRM) is built in
-- the next phase. The existing `purchases` table is unrelated legacy/unused
-- scaffolding and is left untouched.
CREATE TABLE public.membership_sales_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id TEXT NOT NULL,
  transaction_key TEXT,
  -- PhoneNo is the only customer-linking field present in the real source
  -- data today. It is NOT a guaranteed-stable identity (numbers can change
  -- hands/be reissued) — see members.loyalty_id for the future stable key.
  phone_no TEXT NOT NULL,
  customer_name TEXT,
  business_date DATE NOT NULL,
  region TEXT,
  store_code TEXT,
  description TEXT,
  item TEXT,
  item_desc TEXT,
  category_group TEXT,
  sub_category_1 TEXT,
  sub_category_3 TEXT,
  brand TEXT,
  customer_grp TEXT,
  -- Already the total line value (PreTax), not a per-unit price.
  pre_tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mst_phone_no ON public.membership_sales_transactions(phone_no);
CREATE INDEX idx_mst_transaction_id ON public.membership_sales_transactions(transaction_id);
CREATE INDEX idx_mst_business_date ON public.membership_sales_transactions(business_date);

ALTER TABLE public.membership_sales_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_membership_sales_transactions" ON public.membership_sales_transactions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "managers_write_membership_sales_transactions" ON public.membership_sales_transactions
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
  );

-- Reserved for the authoritative loyalty system identifier. The real stable
-- customer key lives in a separate loyalty system whose table/field names
-- have not been shared yet (expected in a future session). Until that source
-- is connected, `phone` remains the operative join key to Membership Sales.
-- Do not treat loyalty_id as required or as a join key until then.
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS loyalty_id TEXT;

-- Reserved for future persona sub-segments nested under each of the 5 main
-- RFM segments (e.g. "Health Custodian", "Family Caregiver" under Champions).
-- No sub-segment list has been defined yet. Placeholder only — not yet
-- populated or surfaced anywhere in the UI.
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS sub_segment TEXT;
