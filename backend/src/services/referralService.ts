import crypto from 'crypto';
import { UserModel } from '../models/User';
import { TransactionModel } from '../models/Transaction';
import { User, Transaction } from '../types/database';

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
  commissionRate: number; // Percentage
  bonusRate: number; // Additional bonus percentage
}

export class ReferralService {
  private static readonly REFERRAL_TIERS: ReferralTier[] = [
    { name: 'Bronze', minReferrals: 0, commissionRate: 10, bonusRate: 0 },
    { name: 'Silver', minReferrals: 10, commissionRate: 12, bonusRate: 2 },
    { name: 'Gold', minReferrals: 25, commissionRate: 15, bonusRate: 5 },
    { name: 'Platinum', minReferrals: 50, commissionRate: 18, bonusRate: 8 },
    { name: 'Diamond', minReferrals: 100, commissionRate: 20, bonusRate: 10 }
  ];

  private static readonly DEFAULT_COMMISSION_RATE = 0.10; // 10%

  /**
   * Generate a unique referral code for a user
   */
  static generateReferralCode(userId: string, email: string): string {
    const hash = crypto.createHash('md5').update(userId + email + Date.now()).digest('hex');
    return hash.substring(0, 8).toUpperCase();
  }

  /**
   * Get or create referral code for a user
   */
  static async getReferralCode(userId: string): Promise<string> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.referral_code) {
      return user.referral_code;
    }

    // Generate new referral code
    const referralCode = this.generateReferralCode(userId, user.email);
    
    // Update user with referral code - this would need to be added to UpdateUserInput type
    // For now, we'll skip this update and return the generated code
    
    return referralCode;
  }

  /**
   * Get referral link for a user
   */
  static async getReferralLink(userId: string): Promise<string> {
    const referralCode = await this.getReferralCode(userId);
    const baseUrl = process.env['FRONTEND_URL'] || 'http://localhost:3000';
    return `${baseUrl}/register?ref=${referralCode}`;
  }

  /**
   * Get user's referral tier based on their referral count
   */
  static async getUserReferralTier(userId: string): Promise<ReferralTier> {
    const referrals = await UserModel.getReferrals(userId);
    const activeReferrals = referrals.filter(r => r.email_verified).length;

    // Find the highest tier the user qualifies for
    let userTier: ReferralTier = this.REFERRAL_TIERS[0]!;
    for (const tier of this.REFERRAL_TIERS) {
      if (activeReferrals >= tier.minReferrals) {
        userTier = tier;
      } else {
        break;
      }
    }

    return userTier;
  }

  /**
   * Get comprehensive referral statistics for a user
   */
  static async getReferralStats(userId: string): Promise<ReferralStats> {
    const referrals = await UserModel.getReferrals(userId);
    const activeReferrals = referrals.filter(r => r.email_verified);

    // Get commission transactions
    const commissionTransactions = await TransactionModel.list({
      user_id: userId,
      type: 'commission',
      limit: 1000
    });

    const totalCommissionEarned = commissionTransactions.transactions
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);

    const pendingCommission = commissionTransactions.transactions
      .filter(t => t.status === 'pending')
      .reduce((sum, t) => sum + t.amount, 0);

    // This month stats
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const thisMonthReferrals = referrals.filter(r => 
      r.created_at >= monthStart && r.email_verified
    ).length;

    const thisMonthCommissionTransactions = await TransactionModel.list({
      user_id: userId,
      type: 'commission',
      start_date: monthStart,
      limit: 1000
    });

    const thisMonthCommission = thisMonthCommissionTransactions.transactions
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);

    // Calculate conversion rate (active referrals / total referrals)
    const conversionRate = referrals.length > 0 
      ? (activeReferrals.length / referrals.length) * 100 
      : 0;

    return {
      totalReferrals: referrals.length,
      activeReferrals: activeReferrals.length,
      totalCommissionEarned,
      pendingCommission,
      thisMonthReferrals,
      thisMonthCommission,
      conversionRate
    };
  }

  /**
   * Get detailed referral list for a user
   */
  static async getReferralList(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    referrals: Array<{
      id: string;
      email: string;
      firstName: string | undefined;
      lastName: string | undefined;
      emailVerified: boolean;
      registeredAt: Date;
      totalSpent: number;
      commissionEarned: number;
    }>;
    total: number;
    pagination: {
      page: number;
      limit: number;
      pages: number;
    };
  }> {
    const allReferrals = await UserModel.getReferrals(userId);
    const total = allReferrals.length;
    
    // Paginate
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedReferrals = allReferrals.slice(startIndex, endIndex);

    // Get detailed info for each referral
    const referralDetails = await Promise.all(
      paginatedReferrals.map(async (referral) => {
        // Get total spent by referral
        const spentTransactions = await TransactionModel.list({
          user_id: referral.id,
          type: 'payment',
          status: 'completed',
          limit: 1000
        });

        const totalSpent = spentTransactions.transactions
          .reduce((sum, t) => sum + t.amount, 0);

        // Get commission earned from this referral
        const commissionTransactions = await TransactionModel.list({
          user_id: userId,
          type: 'commission',
          limit: 1000
        });

        const commissionEarned = commissionTransactions.transactions
          .filter(t => 
            t.status === 'completed' && 
            t.metadata?.['referral_user_id'] === referral.id
          )
          .reduce((sum, t) => sum + t.amount, 0);

        return {
          id: referral.id,
          email: referral.email,
          firstName: referral.first_name,
          lastName: referral.last_name,
          emailVerified: referral.email_verified,
          registeredAt: referral.created_at,
          totalSpent,
          commissionEarned
        };
      })
    );

    return {
      referrals: referralDetails,
      total,
      pagination: {
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Process referral commission when a referred user makes a purchase
   */
  static async processReferralCommission(
    referredUserId: string,
    purchaseAmount: number,
    transactionId: string
  ): Promise<Transaction | null> {
    const referredUser = await UserModel.findById(referredUserId);
    if (!referredUser || !referredUser.referred_by) {
      return null; // No referrer
    }

    const referrer = await UserModel.findByReferralCode(referredUser.referred_by);
    if (!referrer) {
      return null; // Referrer not found
    }

    // Get referrer's tier to determine commission rate
    const referrerTier = await this.getUserReferralTier(referrer.id);
    const commissionRate = referrerTier.commissionRate / 100;
    const bonusRate = referrerTier.bonusRate / 100;
    
    // Calculate commission
    const baseCommission = purchaseAmount * commissionRate;
    const bonusCommission = purchaseAmount * bonusRate;
    const totalCommission = baseCommission + bonusCommission;

    // Create commission transaction
    const commissionTransaction = await TransactionModel.createCommission(
      referrer.id,
      totalCommission,
      `Referral commission from ${referredUser.email}`,
      {
        referral_user_id: referredUserId,
        original_transaction_id: transactionId,
        commission_rate: referrerTier.commissionRate,
        bonus_rate: referrerTier.bonusRate,
        base_commission: baseCommission,
        bonus_commission: bonusCommission,
        referrer_tier: referrerTier.name
      }
    );

    return commissionTransaction;
  }

  /**
   * Get referral program information
   */
  static getReferralProgramInfo(): {
    tiers: ReferralTier[];
    defaultCommissionRate: number;
    description: string;
  } {
    return {
      tiers: this.REFERRAL_TIERS,
      defaultCommissionRate: this.DEFAULT_COMMISSION_RATE * 100,
      description: 'Earn commission by referring new users to our platform. The more you refer, the higher your tier and commission rate!'
    };
  }

  /**
   * Get top referrers leaderboard
   */
  static async getTopReferrers(limit: number = 10): Promise<Array<{
    userId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    totalReferrals: number;
    activeReferrals: number;
    totalCommission: number;
    tier: string;
  }>> {
    // This is a simplified implementation
    // In a real scenario, you'd want to optimize this with proper database queries
    const allUsers = await UserModel.list({ limit: 1000 });
    
    const referrerStats = await Promise.all(
      allUsers.users.map(async (user) => {
        const referrals = await UserModel.getReferrals(user.id);
        const activeReferrals = referrals.filter(r => r.email_verified);
        
        if (referrals.length === 0) return null;

        const commissionTransactions = await TransactionModel.list({
          user_id: user.id,
          type: 'commission',
          status: 'completed',
          limit: 1000
        });

        const totalCommission = commissionTransactions.transactions
          .reduce((sum, t) => sum + t.amount, 0);

        const tier = await this.getUserReferralTier(user.id);

        return {
          userId: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          totalReferrals: referrals.length,
          activeReferrals: activeReferrals.length,
          totalCommission,
          tier: tier.name
        };
      })
    );

    return referrerStats
      .filter(stat => stat !== null)
      .sort((a, b) => b!.totalCommission - a!.totalCommission)
      .slice(0, limit) as any[];
  }

  /**
   * Validate referral code
   */
  static async validateReferralCode(referralCode: string): Promise<{
    valid: boolean;
    referrer?: User;
    error?: string;
  }> {
    if (!referralCode || referralCode.length < 6) {
      return {
        valid: false,
        error: 'Invalid referral code format'
      };
    }

    const referrer = await UserModel.findByReferralCode(referralCode);
    if (!referrer) {
      return {
        valid: false,
        error: 'Referral code not found'
      };
    }

    if (!referrer.email_verified) {
      return {
        valid: false,
        error: 'Referrer account is not verified'
      };
    }

    return {
      valid: true,
      referrer
    };
  }
}