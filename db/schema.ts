import { sql } from 'drizzle-orm'
import * as s from 'drizzle-orm/sqlite-core'
import { sqliteTable as table } from "drizzle-orm/sqlite-core"
export const subscribers = table('subscribers', {
  id: s.integer('id').primaryKey(),
  email: s.text('email', { length: 120 }),
  token: s.text('token', { length: 50 }),
  subscribedAt: s.integer('subscribed_at', { mode: 'timestamp' }),
  unsubscribedAt: s.text('unsubscribed_at'),
  updatedAt: s.text('updated_at').default(sql`(CURRENT_TIMESTAMP)`),
})

export const newsletters = table('newsletters', {
  id: s.integer('id').primaryKey(),
  subject: s.text('subject', { length: 200 }),
  body: s.text('body'),
  sentAt: s.integer('sent_at', { mode: 'timestamp' }),
  createdAt: s.text('created_at').default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: s.text('updated_at').default(sql`(CURRENT_TIMESTAMP)`),
})

export const comments = table('comments',
  {
    id: s.integer('id').primaryKey(),
    userId: s.text('user_id', { length: 200 }).notNull(),
    userInfo: s.text('user_info', { mode: 'json' }),
    postId: s.text('post_id', { length: 100 }).notNull(),
    parentId: s.integer('parent_id'),
    body: s.text('body', { mode: 'json' }),
    createdAt: s.text('created_at').default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: s.text('updated_at').default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => ({
    postIdx: s.index('post_idx').on(t.postId),
  }),
)

export const guestbook = table('guestbook', {
  id: s.integer('id').primaryKey(),
  userId: s.text('user_id', { length: 200 }).notNull(),
  userInfo: s.text('user_info', { mode: 'json' }),
  message: s.text('message').notNull(),
  createdAt: s.text('created_at').default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: s.text('updated_at').default(sql`(CURRENT_TIMESTAMP)`),
})

export const project = table('project', {
  id: s.integer('id').primaryKey(),
  name: s.text('name', { length: 200 }).notNull(),
  url: s.text('url').notNull(),
  icon: s.text('icon').notNull(),
  description: s.text('description').notNull(),
  createdAt: s.text('created_at').default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: s.text('updated_at').default(sql`(CURRENT_TIMESTAMP)`),
})

export const categories = table('categories', {
  id: s.integer('id').primaryKey(),
  title: s.text('title').notNull(),
  icon: s.text('icon').notNull(),
  createdAt: s.text('created_at').default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: s.text('updated_at').default(sql`(CURRENT_TIMESTAMP)`),
})

export const media = table('media', {
  id: s.integer('id').primaryKey(),
  name: s.text('name').notNull(),
  key: s.text('key').notNull(),
  url: s.text('url').notNull(),
  color: s.text('color'),
  blurhash: s.text('blurhash'),
  fileSize: s.integer('file_size').notNull(),
  fileType: s.text('file_type').notNull(),
  md5: s.text('md5').notNull(),
  ext: s.text('ext', { mode: 'json' }),
  createdAt: s.text('created_at').default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: s.text('updated_at').default(sql`(CURRENT_TIMESTAMP)`),
})

export const post = table('post', {
  id: s.integer('id').primaryKey(),
  title: s.text('name', { length: 60 }).notNull(),
  slug: s.text('slug', { length: 30 }).notNull(),
  description: s.text('description').notNull(),
  catId: s.integer('cat_id').references(() => categories.id),
  mainImage: s.integer('main_image_id').references(() => media.id),
  body: s.text('body').notNull(),
  status: s.integer('index').default(0),
  readingTime: s.integer('reading_time').default(0),
  mood: s.text('mood', { enum: ['happy', 'sad', 'neutral'] }).notNull(),
  publishedAt: s.integer('published_at', { mode: 'timestamp' }),
  createdAt: s.text('created_at').default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: s.text('updated_at').default(sql`(CURRENT_TIMESTAMP)`),
})

export const tags = table('tags', {
  id: s.integer('id').primaryKey(),
  title: s.text('title').notNull(),
  createdAt: s.text('created_at').default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: s.text('updated_at').default(sql`(CURRENT_TIMESTAMP)`),
})

export const postTags = table('post_tags', {
  postId: s.integer('post_id').references(() => post.id),
  tagId: s.integer('tag_id').references(() => tags.id),
})

export const photos = table('photos', {
  id: s.integer('id').primaryKey(),
  description: s.text('description'),
  url: s.text('url').notNull(),
  createdAt: s.text('created_at').default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: s.text('updated_at').default(sql`(CURRENT_TIMESTAMP)`),
})
