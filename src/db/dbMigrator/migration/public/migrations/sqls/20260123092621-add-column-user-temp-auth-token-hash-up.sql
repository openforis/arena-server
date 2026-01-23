-- Add new token_hash column
ALTER TABLE user_temp_auth_token 
    ADD COLUMN token_hash varchar(64) NULL;

-- Drop the existing primary key constraint on token
ALTER TABLE user_temp_auth_token
    DROP CONSTRAINT user_temp_auth_token_pkey;

-- Add primary key constraint on token_hash
ALTER TABLE user_temp_auth_token
    ADD CONSTRAINT user_temp_auth_token_pkey PRIMARY KEY (token_hash);

-- Remove the old token column
ALTER TABLE user_temp_auth_token DROP COLUMN token;

