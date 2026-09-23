CREATE TABLE `categories` (
  `id` integer PRIMARY KEY NOT NULL,
  `title` text NOT NULL,
  `icon` text NOT NULL,
  `created_at` text DEFAULT (CURRENT_TIMESTAMP),
  `updated_at` text DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE `comments` (
  `id` integer PRIMARY KEY NOT NULL,
  `user_id` text(200) NOT NULL,
  `user_info` text,
  `post_id` text(100) NOT NULL,
  `parent_id` integer,
  `body` text,
  `created_at` text DEFAULT (CURRENT_TIMESTAMP),
  `updated_at` text DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX `post_idx` ON `comments` (`post_id`);

CREATE TABLE `guestbook` (
  `id` integer PRIMARY KEY NOT NULL,
  `user_id` text(200) NOT NULL,
  `user_info` text,
  `message` text NOT NULL,
  `created_at` text DEFAULT (CURRENT_TIMESTAMP),
  `updated_at` text DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE `media` (
  `id` integer PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `key` text NOT NULL,
  `url` text NOT NULL,
  `color` text,
  `blurhash` text,
  `file_size` integer NOT NULL,
  `file_type` text NOT NULL,
  `md5` text NOT NULL,
  `ext` text,
  `created_at` text DEFAULT (CURRENT_TIMESTAMP),
  `updated_at` text DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE `newsletters` (
  `id` integer PRIMARY KEY NOT NULL,
  `subject` text(200),
  `body` text,
  `sent_at` integer,
  `created_at` text DEFAULT (CURRENT_TIMESTAMP),
  `updated_at` text DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE `photos` (
  `id` integer PRIMARY KEY NOT NULL,
  `description` text,
  `url` text NOT NULL,
  `created_at` text DEFAULT (CURRENT_TIMESTAMP),
  `updated_at` text DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE `post` (
  `id` integer PRIMARY KEY NOT NULL,
  `name` text(60) NOT NULL,
  `slug` text(30) NOT NULL,
  `description` text NOT NULL,
  `cat_id` integer,
  `main_image_id` integer,
  `body` text NOT NULL,
  `index` integer DEFAULT 0,
  `reading_time` integer DEFAULT 0,
  `mood` text NOT NULL,
  `published_at` integer,
  `created_at` text DEFAULT (CURRENT_TIMESTAMP),
  `updated_at` text DEFAULT (CURRENT_TIMESTAMP),
  FOREIGN KEY (`cat_id`) REFERENCES `categories` (`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`main_image_id`) REFERENCES `media` (`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `post_tags` (
  `post_id` integer,
  `tag_id` integer,
  FOREIGN KEY (`post_id`) REFERENCES `post` (`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`tag_id`) REFERENCES `tags` (`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `project` (
  `id` integer PRIMARY KEY NOT NULL,
  `name` text(200) NOT NULL,
  `url` text NOT NULL,
  `icon` text NOT NULL,
  `description` text NOT NULL,
  `created_at` text DEFAULT (CURRENT_TIMESTAMP),
  `updated_at` text DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE `subscribers` (
  `id` integer PRIMARY KEY NOT NULL,
  `email` text(120),
  `token` text(50),
  `subscribed_at` integer,
  `unsubscribed_at` text,
  `updated_at` text DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE `tags` (
  `id` integer PRIMARY KEY NOT NULL,
  `title` text NOT NULL,
  `created_at` text DEFAULT (CURRENT_TIMESTAMP),
  `updated_at` text DEFAULT (CURRENT_TIMESTAMP)
);
