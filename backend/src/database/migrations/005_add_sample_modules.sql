-- Migration: 005_add_sample_modules
-- Description: Add sample modules for testing the module catalog
-- Created: 2025-01-08

-- Insert sample modules for testing
INSERT INTO modules (
    name, 
    description, 
    category, 
    price, 
    status, 
    documentation_url, 
    api_endpoints, 
    webhook_required
) VALUES 
(
    'Subscription Manager',
    'Manage paid subscriptions for your bot users. Automatically handle recurring payments, subscription tiers, and access control.',
    'Monetization',
    29.99,
    'approved',
    'https://docs.example.com/subscription-manager',
    ARRAY['POST /api/subscriptions', 'GET /api/subscriptions/:id', 'DELETE /api/subscriptions/:id'],
    true
),
(
    'Premium Content Gate',
    'Create premium content sections that require payment to access. Perfect for exclusive channels, courses, or digital products.',
    'Monetization',
    19.99,
    'approved',
    'https://docs.example.com/premium-content',
    ARRAY['POST /api/content/gate', 'GET /api/content/access'],
    false
),
(
    'Affiliate Marketing',
    'Turn your bot users into affiliates. Track referrals, manage commissions, and automate payouts.',
    'Marketing',
    39.99,
    'approved',
    'https://docs.example.com/affiliate-marketing',
    ARRAY['POST /api/affiliates', 'GET /api/affiliates/stats', 'POST /api/affiliates/payout'],
    true
),
(
    'Survey & Polls',
    'Create interactive surveys and polls to engage your audience and collect valuable feedback.',
    'Engagement',
    14.99,
    'approved',
    'https://docs.example.com/surveys',
    ARRAY['POST /api/surveys', 'GET /api/surveys/:id/results'],
    false
),
(
    'E-commerce Store',
    'Transform your bot into a complete e-commerce platform with product catalog, shopping cart, and payment processing.',
    'E-commerce',
    49.99,
    'approved',
    'https://docs.example.com/ecommerce',
    ARRAY['POST /api/products', 'GET /api/products', 'POST /api/orders', 'GET /api/orders/:id'],
    true
),
(
    'Analytics Dashboard',
    'Get detailed insights about your bot usage, user behavior, and revenue metrics.',
    'Analytics',
    24.99,
    'approved',
    'https://docs.example.com/analytics',
    ARRAY['GET /api/analytics/users', 'GET /api/analytics/revenue', 'GET /api/analytics/engagement'],
    false
),
(
    'Auto-Responder',
    'Set up automated responses based on keywords, user behavior, or time triggers.',
    'Automation',
    17.99,
    'approved',
    'https://docs.example.com/auto-responder',
    ARRAY['POST /api/autoresponder/rules', 'GET /api/autoresponder/rules'],
    true
),
(
    'User Management Pro',
    'Advanced user management with roles, permissions, and detailed user profiles.',
    'Management',
    22.99,
    'approved',
    'https://docs.example.com/user-management',
    ARRAY['POST /api/users/roles', 'GET /api/users/permissions', 'PUT /api/users/:id/profile'],
    false
),
(
    'Payment Gateway',
    'Accept payments directly in your bot with support for multiple payment methods and currencies.',
    'Monetization',
    34.99,
    'approved',
    'https://docs.example.com/payment-gateway',
    ARRAY['POST /api/payments/create', 'GET /api/payments/:id/status', 'POST /api/payments/webhook'],
    true
),
(
    'Content Scheduler',
    'Schedule and automatically publish content to your bot channels at optimal times.',
    'Automation',
    18.99,
    'approved',
    'https://docs.example.com/content-scheduler',
    ARRAY['POST /api/scheduler/content', 'GET /api/scheduler/queue', 'DELETE /api/scheduler/:id'],
    false
),
(
    'Loyalty Program',
    'Reward your most active users with points, badges, and exclusive perks.',
    'Engagement',
    26.99,
    'approved',
    'https://docs.example.com/loyalty-program',
    ARRAY['POST /api/loyalty/points', 'GET /api/loyalty/rewards', 'POST /api/loyalty/redeem'],
    true
),
(
    'Multi-Language Support',
    'Make your bot accessible to global audiences with automatic translation and language detection.',
    'Localization',
    31.99,
    'approved',
    'https://docs.example.com/multi-language',
    ARRAY['POST /api/translate', 'GET /api/languages', 'PUT /api/users/:id/language'],
    false
),
(
    'Advanced Chatbot AI',
    'Enhance your bot with AI-powered conversations and natural language processing.',
    'AI',
    59.99,
    'approved',
    'https://docs.example.com/chatbot-ai',
    ARRAY['POST /api/ai/chat', 'GET /api/ai/training', 'PUT /api/ai/settings'],
    true
),
(
    'Backup & Restore',
    'Automatically backup your bot data and easily restore from previous versions.',
    'Utilities',
    12.99,
    'approved',
    'https://docs.example.com/backup-restore',
    ARRAY['POST /api/backup/create', 'GET /api/backup/list', 'POST /api/backup/restore'],
    false
),
(
    'Social Media Integration',
    'Connect your bot to social media platforms and cross-post content automatically.',
    'Integration',
    28.99,
    'approved',
    'https://docs.example.com/social-media',
    ARRAY['POST /api/social/connect', 'POST /api/social/post', 'GET /api/social/analytics'],
    true
);

-- Update the updated_at timestamp for all inserted modules
UPDATE modules SET updated_at = CURRENT_TIMESTAMP WHERE status = 'approved';