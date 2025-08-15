// Database enum types
export type UserRole = 'user' | 'admin' | 'developer';
export type BotStatus = 'active' | 'inactive' | 'suspended';
export type ModuleStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type TransactionType = 'payment' | 'withdrawal' | 'commission' | 'refund';
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled';
export type ThemePreference = 'light' | 'dark' | 'system';

// Base interface for all models
export interface BaseModel {
  id: string;
  created_at: Date;
  updated_at: Date;
}

// User model interface
export interface User extends BaseModel {
  email: string;
  password_hash: string;
  first_name?: string;
  last_name?: string;
  role: UserRole;
  balance: number;
  referral_code?: string;
  referred_by?: string;
  email_verified: boolean;
  theme_preference: ThemePreference;
  avatar_url?: string;
}

// Bot model interface
export interface Bot extends BaseModel {
  user_id: string;
  telegram_bot_id: string;
  name: string;
  username?: string;
  description?: string;
  token_hash: string;
  status: BotStatus;
  webhook_url?: string;
}

// Module model interface
export interface Module extends BaseModel {
  name: string;
  description?: string;
  category?: string;
  price: number;
  developer_id?: string;
  status: ModuleStatus;
  code_url?: string;
  documentation_url?: string;
  api_endpoints?: string[];
  webhook_required: boolean;
}

// Bot module activation interface
export interface BotModuleActivation extends BaseModel {
  bot_id: string;
  module_id: string;
  markup_percentage: number;
  api_key?: string;
  status: BotStatus;
  settings: Record<string, any>;
  activated_at: Date;
  expires_at?: Date;
}

// Transaction model interface
export interface Transaction extends BaseModel {
  user_id: string;
  type: TransactionType;
  amount: number;
  currency: string;
  status: TransactionStatus;
  description?: string;
  metadata: Record<string, any>;
  processed_at?: Date;
}

// Support ticket interface
export interface SupportTicket extends BaseModel {
  user_id: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
}

// Module rating interface
export interface ModuleRating extends BaseModel {
  module_id: string;
  user_id: string;
  rating: number;
  review?: string;
}

// Email verification token interface
export interface EmailVerificationToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  created_at: Date;
}

// Password reset token interface
export interface PasswordResetToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  created_at: Date;
}

// Input types for creating/updating models
export interface CreateUserInput {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  role?: UserRole;
  referral_code?: string;
  referred_by?: string;
}

export interface UpdateUserInput {
  first_name?: string;
  last_name?: string;
  theme_preference?: ThemePreference;
  avatar_url?: string | null;
}

export interface CreateBotInput {
  user_id: string;
  telegram_bot_id: string;
  name: string;
  username?: string;
  description?: string;
  token: string;
  webhook_url?: string;
}

export interface UpdateBotInput {
  name?: string;
  description?: string;
  status?: BotStatus;
  webhook_url?: string;
}

export interface CreateModuleInput {
  name: string;
  description?: string;
  category?: string;
  price?: number;
  developer_id?: string;
  code_url?: string;
  documentation_url?: string;
  api_endpoints?: string[];
  webhook_required?: boolean;
}

export interface UpdateModuleInput {
  name?: string;
  description?: string;
  category?: string;
  price?: number;
  status?: ModuleStatus;
  code_url?: string;
  documentation_url?: string;
  api_endpoints?: string[];
  webhook_required?: boolean;
}

export interface CreateTransactionInput {
  user_id: string;
  type: TransactionType;
  amount: number;
  currency?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface UpdateTransactionInput {
  status?: TransactionStatus;
  processed_at?: Date;
  metadata?: Record<string, any>;
}

export interface ActivateModuleInput {
  bot_id: string;
  module_id: string;
  markup_percentage?: number;
  settings?: Record<string, any>;
  expires_at?: Date;
}

export interface CreateModuleRatingInput {
  module_id: string;
  user_id: string;
  rating: number;
  review?: string;
}

export interface UpdateModuleRatingInput {
  rating?: number;
  review?: string;
}