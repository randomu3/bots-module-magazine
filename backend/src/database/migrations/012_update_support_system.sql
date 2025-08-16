-- Migration: 012_update_support_system
-- Description: Update support system with missing fields and tables
-- Created: 2025-01-08

-- Add missing fields to support_tickets table
ALTER TABLE support_tickets 
ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'general',
ADD COLUMN IF NOT EXISTS assigned_to VARCHAR(255);

-- Update priority column to use proper enum values
ALTER TABLE support_tickets 
ALTER COLUMN priority TYPE VARCHAR(20),
ALTER COLUMN priority SET DEFAULT 'medium';

-- Update status column to use proper enum values  
ALTER TABLE support_tickets
ALTER COLUMN status TYPE VARCHAR(20),
ALTER COLUMN status SET DEFAULT 'open';

-- Create support_messages table
CREATE TABLE IF NOT EXISTS support_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    is_staff_reply BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add missing fields to modules table for moderation
ALTER TABLE modules 
ADD COLUMN IF NOT EXISTS moderation_notes TEXT;

-- Add missing fields to transactions table for withdrawal processing
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS payment_details JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Update transaction types to include admin operations
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'admin_credit';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'admin_debit';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_category ON support_tickets(category);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON support_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_modules_status ON modules(status);
CREATE INDEX IF NOT EXISTS idx_transactions_type_status ON transactions(type, status);