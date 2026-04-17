-- Roles enum and table
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'analyst');

CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Segments enum
CREATE TYPE public.member_segment AS ENUM ('active', 'at_risk', 'churned_60_90', 'churned_90_180', 'churned_180_plus', 'new');
CREATE TYPE public.channel_type AS ENUM ('in_store', 'online', 'whatsapp');

CREATE TABLE public.members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  join_date DATE,
  store_location TEXT,
  preferred_channel public.channel_type,
  total_purchases INT NOT NULL DEFAULT 0,
  total_spend NUMERIC(12,2) NOT NULL DEFAULT 0,
  last_purchase_date DATE,
  segment public.member_segment,
  priority_score INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_members_segment ON public.members(segment);
CREATE INDEX idx_members_last_purchase ON public.members(last_purchase_date);
CREATE INDEX idx_members_phone ON public.members(phone);
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  purchase_date DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  store_location TEXT,
  channel public.channel_type,
  product_category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_purchases_member ON public.purchases(member_id);
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  objective TEXT,
  target_segments public.member_segment[] NOT NULL DEFAULT '{}',
  channel public.channel_type,
  created_by UUID REFERENCES auth.users(id),
  notes TEXT,
  export_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.campaign_exports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  exported_by UUID REFERENCES auth.users(id),
  member_count INT NOT NULL DEFAULT 0,
  file_reference TEXT,
  exported_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.campaign_exports ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.upload_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  uploaded_by UUID REFERENCES auth.users(id),
  file_name TEXT,
  records_processed INT NOT NULL DEFAULT 0,
  new_members INT NOT NULL DEFAULT 0,
  updated_members INT NOT NULL DEFAULT 0,
  errors INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.upload_batches ENABLE ROW LEVEL SECURITY;

-- timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_members_updated BEFORE UPDATE ON public.members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_campaigns_updated BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile + default analyst role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'analyst');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS policies — internal tool: any authenticated user can read; only admins/managers can write
-- Profiles
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- user_roles
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- members — all authenticated can read; admins/managers can write
CREATE POLICY "Authenticated read members" ON public.members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers insert members" ON public.members FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Managers update members" ON public.members FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admins delete members" ON public.members FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- purchases
CREATE POLICY "Authenticated read purchases" ON public.purchases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers insert purchases" ON public.purchases FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- campaigns
CREATE POLICY "Authenticated read campaigns" ON public.campaigns FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated create campaigns" ON public.campaigns FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creator updates campaigns" ON public.campaigns FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete campaigns" ON public.campaigns FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- campaign_exports
CREATE POLICY "Authenticated read exports" ON public.campaign_exports FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated create exports" ON public.campaign_exports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = exported_by);

-- upload_batches
CREATE POLICY "Authenticated read uploads" ON public.upload_batches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated create uploads" ON public.upload_batches FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);