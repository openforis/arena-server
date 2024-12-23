CREATE INDEX IF NOT EXISTS auth_group_user_user_idx ON auth_group_user(user_uuid);

CREATE INDEX IF NOT EXISTS user_access_request_modified_by_idx ON user_access_request(modified_by);

CREATE INDEX IF NOT EXISTS user_invitation_invited_by_idx ON user_invitation(invited_by);

CREATE INDEX IF NOT EXISTS user_invitation_user_idx ON user_invitation(user_uuid);

CREATE INDEX IF NOT EXISTS user_reset_password_user_idx ON user_reset_password(user_uuid);

