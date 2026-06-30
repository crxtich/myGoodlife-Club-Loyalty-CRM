-- Remove in-store functionality: channel_type becomes SMS / Email only.
-- Postgres cannot drop enum values directly, so we swap the type:
-- create new type -> migrate columns -> drop old type -> rename new type into place.

CREATE TYPE channel_type_new AS ENUM ('sms', 'email');

-- Existing values map as: in_store/online -> sms (no longer meaningful, default to sms),
-- whatsapp -> sms (closest equivalent channel). Any unmapped value becomes NULL.
ALTER TABLE members ADD COLUMN preferred_channel_new channel_type_new;
UPDATE members SET preferred_channel_new = CASE
  WHEN preferred_channel::text = 'whatsapp' THEN 'sms'::channel_type_new
  WHEN preferred_channel::text IN ('in_store', 'online') THEN NULL
  ELSE NULL
END;
ALTER TABLE members DROP COLUMN preferred_channel;
ALTER TABLE members RENAME COLUMN preferred_channel_new TO preferred_channel;

ALTER TABLE purchases ADD COLUMN channel_new channel_type_new;
UPDATE purchases SET channel_new = CASE
  WHEN channel::text = 'whatsapp' THEN 'sms'::channel_type_new
  ELSE NULL
END;
ALTER TABLE purchases DROP COLUMN channel;
ALTER TABLE purchases RENAME COLUMN channel_new TO channel;

ALTER TABLE campaigns ADD COLUMN channel_new channel_type_new;
UPDATE campaigns SET channel_new = CASE
  WHEN channel::text = 'whatsapp' THEN 'sms'::channel_type_new
  ELSE NULL
END;
ALTER TABLE campaigns DROP COLUMN channel;
ALTER TABLE campaigns RENAME COLUMN channel_new TO channel;

DROP TYPE channel_type;
ALTER TYPE channel_type_new RENAME TO channel_type;
