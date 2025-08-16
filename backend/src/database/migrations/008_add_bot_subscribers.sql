-- Migration: 008_add_bot_subscribers
-- Description: Add bot subscribers table for managing broadcast recipients
-- Created: 2025-01-08

-- Create bot subscribers table
CREATE TABLE bot_subscribers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
    chat_id VARCHAR(255) NOT NULL,
    chat_type VARCHAR(20) NOT NULL CHECK (chat_type IN ('private', 'group', 'supergroup', 'channel')),
    user_id VARCHAR(255),
    username VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_interaction TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint to prevent duplicate subscribers per bot
    UNIQUE(bot_id, chat_id)
);

-- Create indexes for better performance
CREATE INDEX idx_bot_subscribers_bot_id ON bot_subscribers(bot_id);
CREATE INDEX idx_bot_subscribers_chat_id ON bot_subscribers(chat_id);
CREATE INDEX idx_bot_subscribers_is_active ON bot_subscribers(is_active);
CREATE INDEX idx_bot_subscribers_chat_type ON bot_subscribers(chat_type);
CREATE INDEX idx_bot_subscribers_subscribed_at ON bot_subscribers(subscribed_at);
CREATE INDEX idx_bot_subscribers_last_interaction ON bot_subscribers(last_interaction);
CREATE INDEX idx_bot_subscribers_username ON bot_subscribers(username) WHERE username IS NOT NULL;

-- Create composite indexes for common queries
CREATE INDEX idx_bot_subscribers_bot_active ON bot_subscribers(bot_id, is_active);
CREATE INDEX idx_bot_subscribers_bot_type ON bot_subscribers(bot_id, chat_type);
CREATE INDEX idx_bot_subscribers_active_interaction ON bot_subscribers(is_active, last_interaction);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_bot_subscribers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bot_subscribers_updated_at
    BEFORE UPDATE ON bot_subscribers
    FOR EACH ROW
    EXECUTE FUNCTION update_bot_subscribers_updated_at();