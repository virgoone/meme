import { createId } from '@paralleldrive/cuid2'
import { sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const subscribers = sqliteTable('subscribers', {
  id: integer('id').primaryKey(),
  email: text('email', { length: 120 }),
  token: text('token', { length: 50 }),
  subscribedAt: integer('subscribed_at', { mode: 'timestamp' }),
  unsubscribedAt: text('unsubscribed_at'),
  updatedAt: text('updated_at').default(sql`(CURRENT_TIMESTAMP)`),
})

export const newsletters = sqliteTable('newsletters', {
  id: integer('id').primaryKey(),
  subject: text('subject', { length: 200 }),
  body: text('body'),
  sentAt: integer('sent_at', { mode: 'timestamp' }),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at').default(sql`(CURRENT_TIMESTAMP)`),
})

export const comments = sqliteTable(
  'comments',
  {
    id: integer('id').primaryKey(),
    userId: text('user_id', { length: 200 }).notNull(),
    userInfo: text('user_info', { mode: 'json' }),
    postId: text('post_id', { length: 100 }).notNull(),
    parentId: integer('parent_id'),
    body: text('body', { mode: 'json' }),
    createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text('updated_at').default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => ({
    postIdx: index('post_idx').on(table.postId),
  }),
)

export const guestbook = sqliteTable('guestbook', {
  id: integer('id').primaryKey(),
  userId: text('user_id', { length: 200 }).notNull(),
  userInfo: text('user_info', { mode: 'json' }),
  message: text('message').notNull(),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at').default(sql`(CURRENT_TIMESTAMP)`),
})

export const project = sqliteTable('project', {
  id: integer('id').primaryKey(),
  name: text('name', { length: 200 }).notNull(),
  url: text('url').notNull(),
  icon: text('icon').notNull(),
  description: text('description').notNull(),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at').default(sql`(CURRENT_TIMESTAMP)`),
})

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey(),
  title: text('title').notNull(),
  icon: text('icon').notNull(),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at').default(sql`(CURRENT_TIMESTAMP)`),
})

export const media = sqliteTable('media', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  key: text('key').notNull(),
  url: text('url').notNull(),
  color: text('color'),
  blurhash: text('blurhash'),
  fileSize: integer('file_size').notNull(),
  fileType: text('file_type').notNull(),
  md5: text('md5').notNull(),
  ext: text('ext', { mode: 'json' }),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at').default(sql`(CURRENT_TIMESTAMP)`),
})

export const post = sqliteTable('post', {
  id: integer('id').primaryKey(),
  title: text('name', { length: 60 }).notNull(),
  slug: text('slug', { length: 30 }).notNull(),
  description: text('description').notNull(),
  catId: integer('cat_id').references(() => categories.id),
  mainImage: integer('main_image_id').references(() => media.id),
  body: text('body').notNull(),
  status: integer('index').default(0),
  readingTime: integer('reading_time').default(0),
  mood: text('mood', { enum: ['happy', 'sad', 'neutral'] }).notNull(),
  publishedAt: integer('published_at', { mode: 'timestamp' }),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at').default(sql`(CURRENT_TIMESTAMP)`),
})

export const tags = sqliteTable('tags', {
  id: integer('id').primaryKey(),
  title: text('title').notNull(),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at').default(sql`(CURRENT_TIMESTAMP)`),
})

export const postTags = sqliteTable('post_tags', {
  postId: integer('post_id').references(() => post.id),
  tagId: integer('tag_id').references(() => tags.id),
})
