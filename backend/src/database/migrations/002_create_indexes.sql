-- Migration: 002_create_indexes
-- Description: Create indexes for better query performance
-- Created: 2025-01-08

-- Users table indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_referral_code ON users(referral_code);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email_verified ON users(email_verified);

-- Bots table indexes
CREATE INDEX idx_bots_user_id ON bots(user_id);
CREATE INDEX idx_bots_telegram_bot_id ON bots(telegram_bot_id);
CREATE INDEX idx_bots_status ON bots(status);
CREATE INDEX idx_bots_username ON bots(username);

-- Modules table indexes
CREATE INDEX idx_modules_status ON modules(status);
CREATE INDEX idx_modules_category ON modules(category);
CREATE INDEX idx_modules_developer_id ON modules(developer_id);
CREATE INDEX idx_modules_price ON modules(price);

-- Bot module activations table indexes
CREATE INDEX idx_bot_module_activations_bot_id ON bot_module_activations(bot_id);
CREATE INDEX idx_bot_module_activations_module_id ON bot_module_activations(module_id);
CREATE INDEX idx_bot_module_activations_status ON bot_module_activations(status);
CREATE INDEX idx_bot_module_activations_api_key ON bot_module_activations(api_key);

-- Transactions table indexes
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_transactions_processed_at ON transactions(processed_at);

-- Support tickets table indexes
CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX idx_support_tickets_created_at ON support_tickets(created_at);

-- Email verification tokens table indexes
CREATE INDEX idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);
CREATE INDEX idx_email_verification_tokens_token ON email_verification_tokens(token);
CREATE INDEX idx_email_verification_tokens_expires_at ON email_verification_tokens(expires_at);

-- Password reset tokens table indexes
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);