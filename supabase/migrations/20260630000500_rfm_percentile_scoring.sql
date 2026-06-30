-- Percentile-based RFM scoring engine. Replaces the earlier fixed-threshold
-- client-side approximation in src/lib/rfmSegments.ts — this is now the
-- single source of truth and runs server-side against the real
-- membership_sales_transactions table (see 20260630000300 migration).
--
-- Locked specification (do not change without explicit sign-off):
--   Step 1 — overrides, checked in this order, before any scoring:
--     1. New: join_date within the last 30 days -> new_rfm. Stop.
--     2. Lapsed: not New, and most recent transaction (MAX(business_date) for
--        that phone_no) is 90+ days ago or there is no transaction ever -> lapsed. Stop.
--   Step 2 — for every remaining member, aggregate over a trailing 6-month
--     window, grouped by phone_no:
--       Frequency = COUNT(DISTINCT transaction_id) in the last 6 months
--       Monetary  = SUM(pre_tax) across all line items in the last 6 months
--       Recency   = days since MAX(business_date) (not window-limited)
--   Step 3 — score each of R/F/M 1-5 via percentile rank (NTILE(5)) against
--     the current eligible member base. Recency inverted (most recent = 5).
--   Step 4 — classify using the exact locked ranges below (all three must match).
--   Step 5 — residual: any member not caught by New/Lapsed/the three bands
--     defaults to Loyals as a PROVISIONAL placeholder, not part of the
--     original framework. Flagged here and in README "MVP Notes" — needs
--     explicit sign-off before being treated as final logic.
CREATE OR REPLACE FUNCTION public.recompute_rfm_segments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Step 2+3: aggregate + percentile-score every member NOT caught by the
  -- New/Lapsed overrides, then classify per the locked bands (Step 4/5).
  WITH last_txn AS (
    SELECT phone_no, MAX(business_date) AS last_date
    FROM public.membership_sales_transactions
    GROUP BY phone_no
  ),
  base AS (
    SELECT m.id, m.phone, m.join_date, lt.last_date,
      CASE WHEN lt.last_date IS NOT NULL THEN (CURRENT_DATE - lt.last_date) ELSE NULL END AS days_since_last,
      CASE WHEN m.join_date IS NOT NULL THEN (CURRENT_DATE - m.join_date) ELSE NULL END AS days_since_join
    FROM public.members m
    LEFT JOIN last_txn lt ON lt.phone_no = m.phone
  ),
  windowed AS (
    SELECT phone_no,
      COUNT(DISTINCT transaction_id) AS freq,
      SUM(pre_tax) AS monetary
    FROM public.membership_sales_transactions
    WHERE business_date >= (CURRENT_DATE - INTERVAL '6 months')
    GROUP BY phone_no
  ),
  scored AS (
    SELECT b.id, b.days_since_join, b.days_since_last,
      COALESCE(w.freq, 0) AS freq,
      COALESCE(w.monetary, 0) AS monetary
    FROM base b
    LEFT JOIN windowed w ON w.phone_no = b.phone
  ),
  -- Members not caught by the New or Lapsed overrides are the only ones
  -- percentile-ranked, so the overrides' members don't skew the bands.
  eligible AS (
    SELECT * FROM scored
    WHERE NOT (days_since_join IS NOT NULL AND days_since_join <= 30)
      AND NOT (days_since_last IS NULL OR days_since_last >= 90)
  ),
  ranked AS (
    SELECT id,
      (6 - NTILE(5) OVER (ORDER BY days_since_last ASC)) AS recency_score, -- inverted: most recent = 5
      NTILE(5) OVER (ORDER BY freq ASC) AS frequency_score,
      NTILE(5) OVER (ORDER BY monetary ASC) AS monetary_score
    FROM eligible
  )
  UPDATE public.members m
  SET
    recency_score = r.recency_score,
    frequency_score = r.frequency_score,
    monetary_score = r.monetary_score,
    rfm_segment = CASE
      WHEN r.recency_score BETWEEN 4 AND 5 AND r.frequency_score BETWEEN 4 AND 5 AND r.monetary_score BETWEEN 4 AND 5
        THEN 'champions'::rfm_segment
      WHEN r.recency_score BETWEEN 2 AND 4 AND r.frequency_score BETWEEN 4 AND 5 AND r.monetary_score BETWEEN 4 AND 5
        THEN 'loyals'::rfm_segment
      WHEN r.recency_score BETWEEN 1 AND 2 AND r.frequency_score BETWEEN 3 AND 5 AND r.monetary_score BETWEEN 3 AND 5
        THEN 'at_risk_rfm'::rfm_segment
      -- Step 5 residual default — provisional, needs sign-off (see README).
      ELSE 'loyals'::rfm_segment
    END
  FROM ranked r
  WHERE m.id = r.id;

  -- Step 1.1 — New override (applied after banding so it always wins for
  -- recently-joined members, matching "checked in this order, before any
  -- scoring runs"). No R/F/M score, since scoring did not run for them.
  UPDATE public.members m
  SET rfm_segment = 'new_rfm'::rfm_segment,
      recency_score = NULL, frequency_score = NULL, monetary_score = NULL
  WHERE m.join_date IS NOT NULL AND (CURRENT_DATE - m.join_date) <= 30;

  -- Step 1.2 — Lapsed override (checked after New, so New still wins if a
  -- member is technically both newly joined and transaction-less).
  UPDATE public.members m
  SET rfm_segment = 'lapsed'::rfm_segment,
      recency_score = NULL, frequency_score = NULL, monetary_score = NULL
  WHERE NOT (m.join_date IS NOT NULL AND (CURRENT_DATE - m.join_date) <= 30)
    AND (
      NOT EXISTS (SELECT 1 FROM public.membership_sales_transactions t WHERE t.phone_no = m.phone)
      OR (CURRENT_DATE - (SELECT MAX(t.business_date) FROM public.membership_sales_transactions t WHERE t.phone_no = m.phone)) >= 90
    );
END;
$$;
