-- RFM (Recency / Frequency / Monetary) segmentation — additive, parallel model.
-- Does NOT touch the existing member_segment (lifecycle) enum/column, which
-- remains the source of truth for Dashboard and Members. rfm_segment drives
-- Campaign targeting only. See README "RFM vs Lifecycle Segmentation".

CREATE TYPE rfm_segment AS ENUM ('champions', 'loyals', 'at_risk_rfm', 'lapsed', 'new_rfm');

ALTER TABLE members ADD COLUMN IF NOT EXISTS rfm_segment rfm_segment;
ALTER TABLE members ADD COLUMN IF NOT EXISTS recency_score INTEGER;
ALTER TABLE members ADD COLUMN IF NOT EXISTS frequency_score INTEGER;
ALTER TABLE members ADD COLUMN IF NOT EXISTS monetary_score INTEGER;

CREATE INDEX IF NOT EXISTS idx_members_rfm_segment ON members(rfm_segment);

-- Campaign targeting switches to RFM segments. target_rfm_segments is added
-- as a NEW column rather than altering target_segments in place, since we
-- cannot confirm from this environment whether existing campaign rows
-- reference the old lifecycle values — this avoids any risk of data loss.
-- The legacy target_segments column is left in place for any historical rows.
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_rfm_segments rfm_segment[] NOT NULL DEFAULT '{}';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS message_template TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS email_subject TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS email_body TEXT;
