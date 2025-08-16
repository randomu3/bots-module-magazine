-- Add feedback system tables

-- User feedback table
CREATE TABLE user_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL DEFAULT 'general', -- 'general', 'bug_report', 'feature_request', 'complaint', 'compliment'
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5), -- Optional rating 1-5
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'reviewed', 'responded', 'closed'
    admin_response TEXT,
    admin_user_id UUID REFERENCES users(id),
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Support quality ratings table (for rating support interactions)
CREATE TABLE support_quality_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    feedback_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX idx_user_feedback_type ON user_feedback(type);
CREATE INDEX idx_user_feedback_status ON user_feedback(status);
CREATE INDEX idx_user_feedback_created_at ON user_feedback(created_at);
CREATE INDEX idx_user_feedback_rating ON user_feedback(rating);

CREATE INDEX idx_support_quality_ratings_ticket_id ON support_quality_ratings(ticket_id);
CREATE INDEX idx_support_quality_ratings_user_id ON support_quality_ratings(user_id);
CREATE INDEX idx_support_quality_ratings_rating ON support_quality_ratings(rating);
CREATE INDEX idx_support_quality_ratings_created_at ON support_quality_ratings(created_at);