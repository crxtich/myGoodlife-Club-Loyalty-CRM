-- Curated report exports (PDF / Excel) log — same access pattern as campaign_exports.

CREATE TABLE report_exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_type TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('pdf', 'excel')),
  generated_by UUID REFERENCES auth.users(id),
  row_count INTEGER NOT NULL DEFAULT 0,
  file_reference TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE report_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_report_exports_select" ON report_exports FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_report_exports_insert" ON report_exports FOR INSERT TO authenticated WITH CHECK (auth.uid() = generated_by);
