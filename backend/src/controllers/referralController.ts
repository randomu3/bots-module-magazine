import { Response } from 'express';
import { ReferralService } from '../services/referralService';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

export class ReferralController {
  /**
   * Get referral program information
   */
  static async getReferralProgramInfo(_req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const programInfo = ReferralService.getReferralProgramInfo();

      res.json({
        success: true,
        data: programInfo
      });
    } catch (error: any) {
      console.error('Get referral program info error:', error);
      res.status(500).json({
        error: {
          code: 'FETCH_PROGRAM_INFO_FAILED',
          message: 'Failed to fetch referral program information'
        }
      });
    }
  }

  /**
   * Get user's referral code and link
   */
  static async getReferralCode(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      const [referralCode, referralLink] = await Promise.all([
        ReferralService.getReferralCode(userId),
        ReferralService.getReferralLink(userId)
      ]);

      res.json({
        success: true,
        data: {
          referral_code: referralCode,
          referral_link: referralLink
        }
      });
    } catch (error: any) {
      console.error('Get referral code error:', error);
      res.status(500).json({
        error: {
          code: 'FETCH_REFERRAL_CODE_FAILED',
          message: 'Failed to fetch referral code'
        }
      });
    }
  }

  /**
   * Get user's referral statistics
   */
  static async getReferralStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      const [stats, tier] = await Promise.all([
        ReferralService.getReferralStats(userId),
        ReferralService.getUserReferralTier(userId)
      ]);

      res.json({
        success: true,
        data: {
          ...stats,
          current_tier: tier
        }
      });
    } catch (error: any) {
      console.error('Get referral stats error:', error);
      res.status(500).json({
        error: {
          code: 'FETCH_REFERRAL_STATS_FAILED',
          message: 'Failed to fetch referral statistics'
        }
      });
    }
  }

  /**
   * Get user's referral list
   */
  static async getReferralList(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { page = 1, limit = 20 } = req.query;

      const result = await ReferralService.getReferralList(
        userId,
        parseInt(page as string),
        parseInt(limit as string)
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('Get referral list error:', error);
      res.status(500).json({
        error: {
          code: 'FETCH_REFERRAL_LIST_FAILED',
          message: 'Failed to fetch referral list'
        }
      });
    }
  }

  /**
   * Validate a referral code
   */
  static async validateReferralCode(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { code } = req.params;

      if (!code) {
        res.status(400).json({
          error: {
            code: 'MISSING_REFERRAL_CODE',
            message: 'Referral code is required'
          }
        });
        return;
      }

      const validation = await ReferralService.validateReferralCode(code);

      if (validation.valid) {
        res.json({
          success: true,
          data: {
            valid: true,
            referrer: {
              id: validation.referrer!.id,
              email: validation.referrer!.email,
              first_name: validation.referrer!.first_name,
              last_name: validation.referrer!.last_name
            }
          }
        });
      } else {
        res.status(400).json({
          success: false,
          data: {
            valid: false,
            error: validation.error
          }
        });
      }
    } catch (error: any) {
      console.error('Validate referral code error:', error);
      res.status(500).json({
        error: {
          code: 'VALIDATE_REFERRAL_CODE_FAILED',
          message: 'Failed to validate referral code'
        }
      });
    }
  }

  /**
   * Get top referrers leaderboard
   */
  static async getTopReferrers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { limit = 10 } = req.query;

      const topReferrers = await ReferralService.getTopReferrers(
        parseInt(limit as string)
      );

      res.json({
        success: true,
        data: {
          leaderboard: topReferrers
        }
      });
    } catch (error: any) {
      console.error('Get top referrers error:', error);
      res.status(500).json({
        error: {
          code: 'FETCH_TOP_REFERRERS_FAILED',
          message: 'Failed to fetch top referrers'
        }
      });
    }
  }

  /**
   * Get referral dashboard data (combined stats, tier info, recent referrals)
   */
  static async getReferralDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      const [stats, tier, recentReferrals, referralCode, referralLink] = await Promise.all([
        ReferralService.getReferralStats(userId),
        ReferralService.getUserReferralTier(userId),
        ReferralService.getReferralList(userId, 1, 5), // Get 5 most recent
        ReferralService.getReferralCode(userId),
        ReferralService.getReferralLink(userId)
      ]);

      // Calculate progress to next tier
      const allTiers = ReferralService.getReferralProgramInfo().tiers;
      const currentTierIndex = allTiers.findIndex(t => t.name === tier.name);
      const nextTier = currentTierIndex < allTiers.length - 1 ? allTiers[currentTierIndex + 1] : null;
      
      let progressToNextTier = 100; // If already at highest tier
      if (nextTier) {
        // const referralsNeeded = nextTier.minReferrals - stats.activeReferrals;
        const progress = Math.max(0, Math.min(100, 
          ((stats.activeReferrals - tier.minReferrals) / (nextTier.minReferrals - tier.minReferrals)) * 100
        ));
        progressToNextTier = progress;
      }

      res.json({
        success: true,
        data: {
          stats,
          current_tier: tier,
          next_tier: nextTier,
          progress_to_next_tier: progressToNextTier,
          referral_code: referralCode,
          referral_link: referralLink,
          recent_referrals: recentReferrals.referrals
        }
      });
    } catch (error: any) {
      console.error('Get referral dashboard error:', error);
      res.status(500).json({
        error: {
          code: 'FETCH_REFERRAL_DASHBOARD_FAILED',
          message: 'Failed to fetch referral dashboard'
        }
      });
    }
  }

  /**
   * Process referral commission (internal use, called by payment service)
   */
  static async processReferralCommission(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;

      // This endpoint should only be accessible by admin or internal services
      if (user.role !== 'admin') {
        res.status(403).json({
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Admin access required'
          }
        });
        return;
      }

      const { referredUserId, purchaseAmount, transactionId } = req.body;

      if (!referredUserId || !purchaseAmount || !transactionId) {
        res.status(400).json({
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'Referred user ID, purchase amount, and transaction ID are required'
          }
        });
        return;
      }

      const commissionTransaction = await ReferralService.processReferralCommission(
        referredUserId,
        purchaseAmount,
        transactionId
      );

      if (commissionTransaction) {
        res.json({
          success: true,
          data: {
            commission_transaction_id: commissionTransaction.id,
            commission_amount: commissionTransaction.amount
          }
        });
      } else {
        res.json({
          success: true,
          data: {
            message: 'No referral commission processed (user has no referrer)'
          }
        });
      }
    } catch (error: any) {
      console.error('Process referral commission error:', error);
      res.status(500).json({
        error: {
          code: 'PROCESS_COMMISSION_FAILED',
          message: 'Failed to process referral commission'
        }
      });
    }
  }
}