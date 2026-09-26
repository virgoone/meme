CREATE TABLE newsletter_campaigns (
  id TEXT PRIMARY KEY NOT NULL,
  newsletter_id INTEGER NOT NULL UNIQUE REFERENCES newsletters(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'sending', 'sent')),
  lease_id TEXT,
  lease_until INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE newsletter_deliveries (
  campaign_id TEXT NOT NULL REFERENCES newsletter_campaigns(id),
  subscriber_id INTEGER NOT NULL REFERENCES subscribers(id),
  email TEXT NOT NULL,
  unsubscribe_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'skipped')),
  payload TEXT,
  attempted_at INTEGER,
  provider_id TEXT,
  PRIMARY KEY (campaign_id, subscriber_id)
);

CREATE INDEX newsletter_deliveries_pending ON newsletter_deliveries(campaign_id, status);
