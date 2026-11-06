ALTER TABLE imported_posts ADD COLUMN cover_image_url TEXT;
CREATE INDEX IF NOT EXISTS imported_posts_published_idx ON imported_posts(published_at, created_at, id);
-- Backfill cover_image_url with scripts/migrate-d1-to-libsql.ts before cutover.
