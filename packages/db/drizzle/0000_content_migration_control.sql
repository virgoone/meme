CREATE TABLE `imported_posts` (
  `id` text PRIMARY KEY NOT NULL,
  `sanity_id` text NOT NULL,
  `sanity_rev` text,
  `title` text NOT NULL,
  `slug` text NOT NULL,
  `description` text,
  `main_image_url` text,
  `mood` text DEFAULT 'neutral',
  `reading_time` integer DEFAULT 0,
  `portable_text_json` text NOT NULL,
  `slate_json` text,
  `published_at` text,
  `created_at` text DEFAULT (CURRENT_TIMESTAMP),
  `updated_at` text DEFAULT (CURRENT_TIMESTAMP)
);

CREATE UNIQUE INDEX `imported_posts_sanity_id_idx` ON `imported_posts` (`sanity_id`);
CREATE UNIQUE INDEX `imported_posts_slug_idx` ON `imported_posts` (`slug`);

CREATE TABLE `post_blocks` (
  `id` text PRIMARY KEY NOT NULL,
  `post_id` text NOT NULL,
  `block_id` text NOT NULL,
  `portable_text_key` text,
  `sort_index` integer NOT NULL,
  `type` text NOT NULL,
  `portable_text_json` text NOT NULL,
  `slate_json` text,
  `plain_text` text,
  `created_at` text DEFAULT (CURRENT_TIMESTAMP),
  `updated_at` text DEFAULT (CURRENT_TIMESTAMP),
  FOREIGN KEY (`post_id`) REFERENCES `imported_posts` (`id`) ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX `post_blocks_post_id_block_id_idx` ON `post_blocks` (`post_id`, `block_id`);
CREATE INDEX `post_blocks_post_id_sort_idx` ON `post_blocks` (`post_id`, `sort_index`);

CREATE TABLE `post_assets` (
  `id` text PRIMARY KEY NOT NULL,
  `sanity_asset_id` text NOT NULL,
  `sanity_ref` text NOT NULL,
  `source_url` text NOT NULL,
  `r2_key` text NOT NULL,
  `content_type` text,
  `size` integer,
  `checksum` text,
  `metadata_json` text,
  `created_at` text DEFAULT (CURRENT_TIMESTAMP),
  `updated_at` text DEFAULT (CURRENT_TIMESTAMP)
);

CREATE UNIQUE INDEX `post_assets_sanity_asset_id_idx` ON `post_assets` (`sanity_asset_id`);
CREATE UNIQUE INDEX `post_assets_r2_key_idx` ON `post_assets` (`r2_key`);

CREATE TABLE `comment_anchors` (
  `id` text PRIMARY KEY NOT NULL,
  `comment_id` integer NOT NULL,
  `post_id` text NOT NULL,
  `block_id` text,
  `quote` text,
  `range_json` text,
  `anchor_status` text DEFAULT 'post_level' NOT NULL,
  `created_at` text DEFAULT (CURRENT_TIMESTAMP),
  `updated_at` text DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX `comment_anchors_post_id_block_id_idx` ON `comment_anchors` (`post_id`, `block_id`);
CREATE INDEX `comment_anchors_comment_id_idx` ON `comment_anchors` (`comment_id`);

CREATE TABLE `sanity_migration_map` (
  `sanity_id` text PRIMARY KEY NOT NULL,
  `sanity_rev` text,
  `sanity_type` text NOT NULL,
  `d1_table` text NOT NULL,
  `d1_id` text NOT NULL,
  `status` text DEFAULT 'pending' NOT NULL,
  `error` text,
  `created_at` text DEFAULT (CURRENT_TIMESTAMP),
  `updated_at` text DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX `sanity_migration_map_d1_target_idx` ON `sanity_migration_map` (`d1_table`, `d1_id`);

CREATE TABLE `migration_runs` (
  `id` text PRIMARY KEY NOT NULL,
  `source` text NOT NULL,
  `mode` text NOT NULL,
  `status` text NOT NULL,
  `summary_json` text,
  `checksum` text,
  `started_at` text DEFAULT (CURRENT_TIMESTAMP),
  `completed_at` text
);
