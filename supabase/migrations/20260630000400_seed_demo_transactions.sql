-- DEMO/SEED DATA ONLY — not real customer transactions.
--
-- Generates a trailing transaction history (matching the membership_sales_
-- transactions shape) for every member already in the `members` table,
-- keyed by phone number. This must be run AFTER members exist (i.e. after
-- the team's existing demo member data has been uploaded via the Data
-- Upload page) — it looks up current members.phone and is a no-op for any
-- phone number that already has transactions, so it is safe to re-run.
--
-- Purchase frequency is intentionally varied per member so the RFM model
-- has a realistic spread to classify into all 5 segments for today's demo:
--   - some members get many recent transactions  -> Champions/Loyals candidates
--   - some get a handful of older transactions    -> At Risk (RFM) candidates
--   - some get none in the trailing window         -> Lapsed candidates
--   - recently joined members are left untouched   -> New override applies
DO $$
DECLARE
  m RECORD;
  num_txns INT;
  i INT;
  j INT;
  num_items INT;
  txn_id TEXT;
  txn_date DATE;
  line_value NUMERIC(12,2);
BEGIN
  FOR m IN SELECT phone, member_id, name FROM public.members WHERE phone IS NOT NULL LOOP
    IF EXISTS (SELECT 1 FROM public.membership_sales_transactions WHERE phone_no = m.phone) THEN
      CONTINUE;
    END IF;

    -- 0-14 transactions spread across the last ~7 months (gives a trailing
    -- 6-month window plus some transactions older than 90 days for variety).
    num_txns := (random() * 14)::INT;

    FOR i IN 1..GREATEST(num_txns, 0) LOOP
      txn_id := m.member_id || '-T' || i::TEXT;
      txn_date := CURRENT_DATE - (random() * 210)::INT;
      num_items := 1 + (random() * 3)::INT;

      FOR j IN 1..num_items LOOP
        line_value := (200 + random() * 4800)::NUMERIC(12,2);
        INSERT INTO public.membership_sales_transactions
          (transaction_id, transaction_key, phone_no, customer_name, business_date,
           region, store_code, item, item_desc, brand, pre_tax, quantity)
        VALUES
          (txn_id, txn_id, m.phone, m.name, txn_date,
           CASE WHEN random() < 0.7 THEN 'Kenya' ELSE 'Uganda' END,
           'STR-' || (1 + (random() * 5)::INT)::TEXT,
           'SKU-' || (1000 + (random() * 9000)::INT)::TEXT,
           'Demo product ' || j::TEXT,
           'Goodlife', line_value, 1);
      END LOOP;
    END LOOP;
  END LOOP;
END $$;
