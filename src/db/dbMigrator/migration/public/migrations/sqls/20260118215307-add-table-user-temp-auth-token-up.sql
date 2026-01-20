CREATE TABLE IF NOT EXISTS user_temp_auth_token (
    token           uuid       PRIMARY KEY  DEFAULT uuid_generate_v4(),
    user_uuid       uuid       NOT NULL     REFERENCES "user"(uuid) ON DELETE CASCADE,
    date_created    TIMESTAMP  NOT NULL     DEFAULT (now() AT TIME ZONE 'UTC'),
    date_expires_at TIMESTAMP  NOT NULL     DEFAULT (now() AT TIME ZONE 'UTC' + INTERVAL '1 minute')
);

CREATE INDEX IF NOT EXISTS user_temp_auth_token_user_uuid_idx ON user_temp_auth_token(user_uuid);
CREATE INDEX IF NOT EXISTS user_temp_auth_token_date_created_idx ON user_temp_auth_token(date_created);
CREATE INDEX IF NOT EXISTS user_temp_auth_token_date_expires_at_idx ON user_temp_auth_token(date_expires_at);
