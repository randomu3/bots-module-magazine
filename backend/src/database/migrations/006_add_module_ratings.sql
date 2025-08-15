-- Migration: 006_add_module_ratings
-- Description: Add module ratings and reviews system
-- Created: 2025-01-08

-- Module ratings table
CREATE TABLE module_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(module_id, user_id)
);

-- Create index for better performance
CREATE INDEX idx_module_ratings_module_id ON module_ratings(module_id);
CREATE INDEX idx_module_ratings_user_id ON module_ratings(user_id);
CREATE INDEX idx_module_ratings_rating ON module_ratings(rating);