export interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  totalCommissionEarned: number;
  pendingCommission: number;
  thisMonthReferrals: number;
  thisMonthCommission: number;
  conversionRate: number;
}

export interface ReferralTier {
  name: string;
  minReferrals: number;
  commissionRate: number;
  bonusRate: number;
}

export interface ReferralDetails {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  emailVerified: boolean;
  registeredAt: string;
  totalSpent: number;
  commissionEarned: number;
}

export interface ReferralList {
  referrals: ReferralDetails[];
  total: number;
  pagination: {
    page: number;
    limit: number;
    pages: number;
  };
}

export interface ReferralProgramInfo {
  tiers: ReferralTier[];
  defaultCommissionRate: number;
  description: string;
}