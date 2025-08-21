export interface Transaction {
  id: string;
  user_id: string;
  type: 'payment' | 'withdrawal' | 'commission' | 'refund';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  description: string;
  metadata: Record<string, any>;
  created_at: string;
  processed_at?: string;
  user_email?: string;
  user_first_name?: string;
  user_last_name?: string;
}

export interface TransactionFilters {
  type?: string;
  status?: string;
  currency?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

export interface TransactionStats {
  total_earned: number;
  total_spent: number;
  total_withdrawn: number;
  pending_amount: number;
}

export interface WithdrawalRequest {
  amount: number;
  method: 'bank_transfer' | 'paypal' | 'crypto';
  details: {
    bankAccount?: {
      accountNumber: string;
      routingNumber: string;
      accountHolderName: string;
    };
    paypal?: {
      email: string;
    };
    crypto?: {
      address: string;
      currency: string;
    };
  };
}

export interface WithdrawalLimits {
  minAmount: number;
  maxAmount: number;
  dailyLimit: number;
  monthlyLimit: number;
  commission: number;
}