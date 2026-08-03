CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 5 AND 160),
  summary TEXT NOT NULL CHECK (char_length(summary) BETWEEN 20 AND 320),
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 50 AND 30000),
  category TEXT NOT NULL CHECK (char_length(category) BETWEEN 2 AND 80),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_review', 'published')),
  author_name TEXT NOT NULL DEFAULT 'TrackFree Editorial Team',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS blog_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  label TEXT NOT NULL CHECK (char_length(label) BETWEEN 2 AND 160),
  url TEXT NOT NULL CHECK (url ~ '^https://'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS blog_posts_publication_idx ON blog_posts(status, published_at DESC);
CREATE INDEX IF NOT EXISTS blog_sources_post_idx ON blog_sources(post_id);
