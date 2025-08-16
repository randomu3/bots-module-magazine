-- Add triggers for feedback system tables

-- User feedback table trigger
CREATE TRIGGER update_user_feedback_updated_at 
    BEFORE UPDATE ON user_feedback 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();