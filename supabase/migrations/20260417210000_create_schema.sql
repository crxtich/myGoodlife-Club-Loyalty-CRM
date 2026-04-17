-- myGoodlife Club Loyalty CRM — Full Schema
-- Applied to: bbjmrlxtjlhegktpqylc

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE app_role AS ENUM ('admin', 'manager', 'analyst');
CREATE TYPE channel_type AS ENUM ('in_store', 'online', 'whatsapp');
CREATE TYPE member_segment AS ENUM ('active', 'new', 'at_risk', 'churned_60_90', 'churned_90_180', 'churned_180_plus');
CREATE TYPE outreach_channel AS ENUM ('sms', 'call', 'email', 'whatsapp');
CREATE TYPE campaign_objective AS ENUM ('reactivation', 'retention', 'acquisition', 'engagement');

-- Core tables
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  join_date DATE,
  store_location TEXT,
  preferred_channel channel_type,
  total_purchases INTEGER DEFAULT 0,
  total_spend NUMERIC(12,2) DEFAULT 0,
  last_purchase_date DATE,
  segment member_segment DEFAULT 'new',
  priority_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_id TEXT UNIQUE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  purchase_date DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  store_location TEXT,
  channel channel_type,
  product_category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  objective campaign_objective NOT NULL,
  target_segments member_segment[] NOT NULL DEFAULT ARRAY[]::member_segment[],
  channel outreach_channel NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  export_count INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE campaign_exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  exported_at TIMESTAMPTZ DEFAULT NOW(),
  exported_by UUID REFERENCES auth.users(id),
  member_count INTEGER NOT NULL DEFAULT 0,
  file_reference TEXT,
  filters JSONB
);

CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE upload_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_name TEXT,
  records_processed INTEGER DEFAULT 0,
  new_members INTEGER DEFAULT 0,
  updated_members INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'analyst',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Indexes
CREATE INDEX idx_members_segment ON members(segment);
CREATE INDEX idx_members_last_purchase ON members(last_purchase_date);
CREATE INDEX idx_members_phone ON members(phone);
CREATE INDEX idx_members_member_id ON members(member_id);
CREATE INDEX idx_purchases_member_id ON purchases(member_id);
CREATE INDEX idx_purchases_date ON purchases(purchase_date);
CREATE INDEX idx_campaign_exports_campaign ON campaign_exports(campaign_id);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);

-- Auto-segmentation
CREATE OR REPLACE FUNCTION calculate_segment(last_purchase DATE, join_date_val DATE, total_purchases_count INTEGER)
RETURNS member_segment AS $$
DECLARE
  days_since INTEGER;
  join_days INTEGER;
BEGIN
  IF last_purchase IS NULL THEN
    IF join_date_val IS NOT NULL THEN
      join_days := CURRENT_DATE - join_date_val;
      IF join_days <= 30 THEN RETURN 'new'; END IF;
    END IF;
    RETURN 'churned_180_plus';
  END IF;
  days_since := CURRENT_DATE - last_purchase;
  IF days_since <= 30 THEN
    IF join_date_val IS NOT NULL THEN
      join_days := CURRENT_DATE - join_date_val;
      IF join_days <= 30 AND total_purchases_count <= 1 THEN RETURN 'new'; END IF;
    END IF;
    RETURN 'active';
  ELSIF days_since <= 60 THEN RETURN 'at_risk';
  ELSIF days_since <= 90 THEN RETURN 'churned_60_90';
  ELSIF days_since <= 180 THEN RETURN 'churned_90_180';
  ELSE RETURN 'churned_180_plus';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION update_member_segment()
RETURNS TRIGGER AS $$
BEGIN
  NEW.segment := calculate_segment(NEW.last_purchase_date, NEW.join_date, NEW.total_purchases);
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_member_segment
BEFORE INSERT OR UPDATE OF last_purchase_date, join_date, total_purchases
ON members FOR EACH ROW EXECUTE FUNCTION update_member_segment();

-- Role helper
CREATE OR REPLACE FUNCTION has_role(_role app_role, _user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = _role);
$$ LANGUAGE sql SECURITY DEFINER;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  INSERT INTO user_roles (user_id, role) VALUES (NEW.id, 'analyst');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- RLS
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_members_select" ON members FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_members_insert" ON members FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_members_update" ON members FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_purchases_select" ON purchases FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_purchases_insert" ON purchases FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_campaigns_all" ON campaigns FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_exports_select" ON campaign_exports FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_exports_insert" ON campaign_exports FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_profiles_select" ON profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "auth_profiles_update" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "auth_upload_batches_all" ON upload_batches FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_user_roles_select" ON user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
