-- ============================================================
-- Sandlot Picks 3.0 — Supabase Schema
-- Run this in the Supabase SQL Editor (Project > SQL Editor > New Query)
-- ============================================================

-- ── Profiles table ──────────────────────────────────────────
-- Extends auth.users with display name, favorite team, and role.
-- Auto-populated via trigger when a user signs up.

CREATE TABLE IF NOT EXISTS profiles (
  id           UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  favorite_team TEXT,
  role         TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile (display_name, favorite_team only — not role)
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Auto-create profile row when a new user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (
    NEW.id,
    split_part(NEW.email, '@', 1)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ── Content Posts table ─────────────────────────────────────
-- Stores both Sandlot Insider articles (type='article') and
-- Strategy Blog posts (type='blog') in one table.

CREATE TABLE IF NOT EXISTS content_posts (
  id                    SERIAL PRIMARY KEY,
  type                  TEXT NOT NULL CHECK (type IN ('article', 'blog')),
  title                 TEXT NOT NULL,
  slug                  TEXT NOT NULL UNIQUE,
  author                TEXT NOT NULL DEFAULT 'Sandlot Picks Team',
  status                TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  date                  DATE,
  tags                  TEXT[],
  summary               TEXT,
  read_time_minutes     INT,
  estimated_word_count  INT,
  hero_image_url        TEXT,
  hero_image_alt        TEXT,
  content               JSONB,    -- Array of { type, text, items?, author? } blocks
  seo                   JSONB,    -- { title_tag, meta_description, keywords[], canonical_url, og_image }
  affiliate_cta         JSONB,    -- { enabled, platform, context, link, hero_banner?, promo_code? }
  affiliate_disclaimer  TEXT,
  related_posts         TEXT[],   -- Array of slugs
  reference_urls        TEXT[],
  published_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE content_posts ENABLE ROW LEVEL SECURITY;

-- Anyone can read published posts
CREATE POLICY "Public can read published posts"
  ON content_posts FOR SELECT
  USING (status = 'published');

-- Admins can do everything
CREATE POLICY "Admins can manage all posts"
  ON content_posts FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS content_posts_updated_at ON content_posts;
CREATE TRIGGER content_posts_updated_at
  BEFORE UPDATE ON content_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Set published_at automatically when status changes to 'published'
CREATE OR REPLACE FUNCTION set_published_at()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'published' AND OLD.status != 'published' THEN
    NEW.published_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS content_posts_published_at ON content_posts;
CREATE TRIGGER content_posts_published_at
  BEFORE UPDATE ON content_posts
  FOR EACH ROW EXECUTE FUNCTION set_published_at();
