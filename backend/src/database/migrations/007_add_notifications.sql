-- Migration: 007_add_notifications
-- Description: Add notification system with user preferences and notification history
-- Created: 2025-01-08

-- Create notification type enum
CREATE TYPE notification_type AS ENUM (
    'email_verification',
    'password_reset', 
    'welcome',
    'payment_received',
    'payment_failed',
    'withdrawal_requested',
    'withdrawal_completed',
    'withdrawal_failed',
    'module_activated',
    'module_expired',
    'referral_commission',
    'system_announcement',
    'support_ticket_created',
    'support_ticket_replied'
);

-- Create notification status enum
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed', 'read');

-- Add notification preferences to users table
ALTER TABLE users ADD COLUMN notification_preferences JSONB DEFAULT '{
    "email_notifications": true,
    "payment_notifications": true,
    "withdrawal_notifications": true,
    "module_notifications": true,
    "referral_notifications": true,
    "system_notifications": true,
    "support_notifications": true
}';

-- Create notifications table for tracking sent notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status notification_status DEFAULT 'pending',
    email_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create broadcast notifications table for system-wide announcements
CREATE TABLE broadcast_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type notification_type DEFAULT 'system_announcement',
    target_audience JSONB DEFAULT '{"all": true}', -- Can target specific user roles, etc.
    status VARCHAR(50) DEFAULT 'draft', -- draft, scheduled, sending, sent
    scheduled_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    total_recipients INTEGER DEFAULT 0,
    successful_sends INTEGER DEFAULT 0,
    failed_sends INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_broadcast_notifications_status ON broadcast_notifications(status);
CREATE INDEX idx_broadcast_notifications_scheduled_at ON broadcast_notifications(scheduled_at);