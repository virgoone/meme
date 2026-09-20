import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

export const importedPosts = sqliteTable(
  'imported_posts',
  {
    id: text('id').primaryKey(),
    sanityId: text('sanity_id').notNull(),
    sanityRev: text('sanity_rev'),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    mainImageUrl: text('main_image_url'),
    mood: text('mood', { enum: ['happy', 'sad', 'neutral'] }).default(
      'neutral',
    ),
    readingTime: integer('reading_time').default(0),
    portableTextJson: text('portable_text_json', { mode: 'json' }).notNull(),
    slateJson: text('slate_json', { mode: 'json' }),
    publishedAt: text('published_at'),
    createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text('updated_at').default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => ({
    sanityIdIdx: uniqueIndex('imported_posts_sanity_id_idx').on(table.sanityId),
    slugIdx: uniqueIndex('imported_posts_slug_idx').on(table.slug),
  }),
);

export const postBlocks = sqliteTable(
  'post_blocks',
  {
    id: text('id').primaryKey(),
    postId: text('post_id')
      .notNull()
      .references(() => importedPosts.id, { onDelete: 'cascade' }),
    blockId: text('block_id').notNull(),
    portableTextKey: text('portable_text_key'),
    sortIndex: integer('sort_index').notNull(),
    type: text('type').notNull(),
    portableTextJson: text('portable_text_json', { mode: 'json' }).notNull(),
    slateJson: text('slate_json', { mode: 'json' }),
    plainText: text('plain_text'),
    createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text('updated_at').default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => ({
    postBlockIdx: uniqueIndex('post_blocks_post_id_block_id_idx').on(
      table.postId,
      table.blockId,
    ),
    postSortIdx: index('post_blocks_post_id_sort_idx').on(
      table.postId,
      table.sortIndex,
    ),
  }),
);

export const postAssets = sqliteTable(
  'post_assets',
  {
    id: text('id').primaryKey(),
    sanityAssetId: text('sanity_asset_id').notNull(),
    sanityRef: text('sanity_ref').notNull(),
    sourceUrl: text('source_url').notNull(),
    r2Key: text('r2_key').notNull(),
    contentType: text('content_type'),
    size: integer('size'),
    checksum: text('checksum'),
    metadataJson: text('metadata_json', { mode: 'json' }),
    createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text('updated_at').default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => ({
    sanityAssetIdx: uniqueIndex('post_assets_sanity_asset_id_idx').on(
      table.sanityAssetId,
    ),
    r2KeyIdx: uniqueIndex('post_assets_r2_key_idx').on(table.r2Key),
  }),
);

export const commentAnchors = sqliteTable(
  'comment_anchors',
  {
    id: text('id').primaryKey(),
    commentId: integer('comment_id').notNull(),
    postId: text('post_id').notNull(),
    blockId: text('block_id'),
    quote: text('quote'),
    rangeJson: text('range_json', { mode: 'json' }),
    anchorStatus: text('anchor_status', {
      enum: ['block', 'post_level', 'missing', 'stale'],
    })
      .notNull()
      .default('post_level'),
    createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text('updated_at').default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => ({
    postBlockIdx: index('comment_anchors_post_id_block_id_idx').on(
      table.postId,
      table.blockId,
    ),
    commentIdx: index('comment_anchors_comment_id_idx').on(table.commentId),
  }),
);

export const sanityMigrationMap = sqliteTable(
  'sanity_migration_map',
  {
    sanityId: text('sanity_id').primaryKey(),
    sanityRev: text('sanity_rev'),
    sanityType: text('sanity_type').notNull(),
    d1Table: text('d1_table').notNull(),
    d1Id: text('d1_id').notNull(),
    status: text('status', {
      enum: ['pending', 'imported', 'failed', 'skipped'],
    })
      .notNull()
      .default('pending'),
    error: text('error'),
    createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text('updated_at').default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => ({
    d1TargetIdx: index('sanity_migration_map_d1_target_idx').on(
      table.d1Table,
      table.d1Id,
    ),
  }),
);

export const migrationRuns = sqliteTable('migration_runs', {
  id: text('id').primaryKey(),
  source: text('source', { enum: ['sanity', 'turso', 'media'] }).notNull(),
  mode: text('mode', { enum: ['dry_run', 'write'] }).notNull(),
  status: text('status', {
    enum: ['started', 'completed', 'failed'],
  }).notNull(),
  summaryJson: text('summary_json', { mode: 'json' }),
  checksum: text('checksum'),
  startedAt: text('started_at').default(sql`(CURRENT_TIMESTAMP)`),
  completedAt: text('completed_at'),
});
