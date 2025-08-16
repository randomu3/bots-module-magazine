import Joi from 'joi';

// Common validation patterns
const uuidSchema = Joi.string().uuid();
const emailSchema = Joi.string().email().max(255);
const passwordSchema = Joi.string().min(8).max(128);
const nameSchema = Joi.string().min(1).max(100).trim();
const urlSchema = Joi.string().uri().max(500);

// User validation schemas
export const createUserSchema = Joi.object({
  email: emailSchema.required(),
  password: passwordSchema.required(),
  first_name: nameSchema.optional(),
  last_name: nameSchema.optional(),
  role: Joi.string().valid('user', 'admin', 'developer').default('user'),
  referral_code: Joi.string().max(50).optional(),
  referred_by: uuidSchema.optional(),
});

export const updateUserSchema = Joi.object({
  first_name: nameSchema.optional(),
  last_name: nameSchema.optional(),
  theme_preference: Joi.string().valid('light', 'dark', 'system').optional(),
  avatar_url: Joi.string().uri().max(500).allow(null).optional(),
});

export const loginSchema = Joi.object({
  email: emailSchema.required(),
  password: Joi.string().required(),
});

// Bot validation schemas
export const createBotSchema = Joi.object({
  user_id: uuidSchema.required(),
  telegram_bot_id: Joi.string().max(50).required(),
  name: Joi.string().min(1).max(255).required(),
  username: Joi.string().max(255).optional(),
  description: Joi.string().max(1000).optional(),
  token: Joi.string().required(),
  webhook_url: urlSchema.optional(),
});

export const updateBotSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  description: Joi.string().max(1000).optional(),
  status: Joi.string().valid('active', 'inactive', 'suspended').optional(),
  webhook_url: urlSchema.optional(),
});

// Module validation schemas
export const createModuleSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().max(2000).optional(),
  category: Joi.string().max(100).optional(),
  price: Joi.number().min(0).precision(2).default(0),
  developer_id: uuidSchema.optional(),
  code_url: urlSchema.optional(),
  documentation_url: urlSchema.optional(),
  api_endpoints: Joi.array().items(Joi.string().max(500)).optional(),
  webhook_required: Joi.boolean().default(false),
});

export const updateModuleSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  description: Joi.string().max(2000).optional(),
  category: Joi.string().max(100).optional(),
  price: Joi.number().min(0).precision(2).optional(),
  status: Joi.string().valid('pending', 'approved', 'rejected', 'suspended').optional(),
  code_url: urlSchema.optional(),
  documentation_url: urlSchema.optional(),
  api_endpoints: Joi.array().items(Joi.string().max(500)).optional(),
  webhook_required: Joi.boolean().optional(),
});

// Transaction validation schemas
export const createTransactionSchema = Joi.object({
  user_id: uuidSchema.required(),
  type: Joi.string().valid('payment', 'withdrawal', 'commission', 'refund').required(),
  amount: Joi.number().positive().precision(2).required(),
  currency: Joi.string().length(3).uppercase().default('USD'),
  description: Joi.string().max(500).optional(),
  metadata: Joi.object().optional(),
});

export const updateTransactionSchema = Joi.object({
  status: Joi.string().valid('pending', 'completed', 'failed', 'cancelled').optional(),
  processed_at: Joi.date().optional(),
  metadata: Joi.object().optional(),
});

// Bot module activation validation schemas
export const activateModuleSchema = Joi.object({
  bot_id: uuidSchema.required(),
  module_id: uuidSchema.required(),
  markup_percentage: Joi.number().min(0).max(100).precision(2).default(0),
  settings: Joi.object().default({}),
  expires_at: Joi.date().optional(),
});

export const updateModuleActivationSchema = Joi.object({
  markup_percentage: Joi.number().min(0).max(100).precision(2).optional(),
  status: Joi.string().valid('active', 'inactive', 'suspended').optional(),
  settings: Joi.object().optional(),
  expires_at: Joi.date().optional(),
});

// Support ticket validation schemas
export const createSupportTicketSchema = Joi.object({
  user_id: uuidSchema.required(),
  subject: Joi.string().min(1).max(255).required(),
  message: Joi.string().min(1).max(5000).required(),
  priority: Joi.string().valid('low', 'normal', 'high', 'critical').default('normal'),
});

export const updateSupportTicketSchema = Joi.object({
  status: Joi.string().valid('open', 'in_progress', 'resolved', 'closed').optional(),
  priority: Joi.string().valid('low', 'normal', 'high', 'critical').optional(),
});

// User feedback validation schemas
export const createUserFeedbackSchema = Joi.object({
  user_id: uuidSchema.required(),
  type: Joi.string().valid('general', 'bug_report', 'feature_request', 'complaint', 'compliment').default('general'),
  subject: Joi.string().min(1).max(255).required(),
  message: Joi.string().min(1).max(5000).required(),
  rating: Joi.number().integer().min(1).max(5).optional(),
});

export const updateUserFeedbackSchema = Joi.object({
  status: Joi.string().valid('pending', 'reviewed', 'responded', 'closed').optional(),
  admin_response: Joi.string().max(5000).optional(),
  admin_user_id: uuidSchema.optional(),
  responded_at: Joi.date().optional(),
});

// Support quality rating validation schemas
export const createSupportQualityRatingSchema = Joi.object({
  ticket_id: uuidSchema.required(),
  user_id: uuidSchema.required(),
  rating: Joi.number().integer().min(1).max(5).required(),
  feedback_text: Joi.string().max(2000).optional(),
});

// Email verification and password reset schemas
export const emailVerificationSchema = Joi.object({
  token: Joi.string().required(),
});

export const passwordResetRequestSchema = Joi.object({
  email: emailSchema.required(),
});

export const passwordResetSchema = Joi.object({
  token: Joi.string().required(),
  password: passwordSchema.required(),
});

// Module rating validation schemas
export const createModuleRatingSchema = Joi.object({
  module_id: uuidSchema.required(),
  user_id: uuidSchema.required(),
  rating: Joi.number().integer().min(1).max(5).required(),
  review: Joi.string().max(2000).optional(),
});

export const updateModuleRatingSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).optional(),
  review: Joi.string().max(2000).optional(),
});

// Query parameter schemas
export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sort: Joi.string().optional(),
  order: Joi.string().valid('asc', 'desc').default('desc'),
});

export const dateRangeSchema = Joi.object({
  start_date: Joi.date().optional(),
  end_date: Joi.date().optional(),
});

// Filter schemas
export const userFilterSchema = Joi.object({
  role: Joi.string().valid('user', 'admin', 'developer').optional(),
  email_verified: Joi.boolean().optional(),
  search: Joi.string().max(255).optional(),
}).concat(paginationSchema);

export const botFilterSchema = Joi.object({
  status: Joi.string().valid('active', 'inactive', 'suspended').optional(),
  search: Joi.string().max(255).optional(),
}).concat(paginationSchema);

export const moduleFilterSchema = Joi.object({
  category: Joi.string().max(100).optional(),
  status: Joi.string().valid('pending', 'approved', 'rejected', 'suspended').optional(),
  price_min: Joi.number().min(0).optional(),
  price_max: Joi.number().min(0).optional(),
  search: Joi.string().max(255).optional(),
}).concat(paginationSchema);

export const transactionFilterSchema = Joi.object({
  type: Joi.string().valid('payment', 'withdrawal', 'commission', 'refund').optional(),
  status: Joi.string().valid('pending', 'completed', 'failed', 'cancelled').optional(),
  currency: Joi.string().length(3).uppercase().optional(),
}).concat(paginationSchema).concat(dateRangeSchema);