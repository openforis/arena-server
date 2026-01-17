CREATE TABLE IF NOT EXISTS user_qr_code_auth (
    token           uuid       PRIMARY KEY  DEFAULT uuid_generate_v4(),
    user_uuid       uuid       NOT NULL     REFERENCES "user"(uuid) ON DELETE CASCADE,
    date_created    TIMESTAMP  NOT NULL     DEFAULT (now() AT TIME ZONE 'UTC'),
    date_expires_at TIMESTAMP  NOT NULL     DEFAULT (now() AT TIME ZONE 'UTC' + INTERVAL '5 minutes'
);
    
CREATE INDEX IF NOT EXISTS user_qr_code_auth_user_uuid_idx ON user_qr_code_auth(user_uuid);
CREATE INDEX IF NOT EXISTS user_qr_code_auth_date_created_idx ON user_qr_code_auth(date_created);