import { BroadcastService } from './broadcastService';
import { NotificationService } from './notificationService';

export class SchedulerService {
  private static intervals: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Start all scheduled jobs
   */
  static startScheduledJobs(): void {
    console.log('🕐 Starting scheduled jobs...');

    // Process scheduled broadcasts every minute
    this.startJob('scheduled-broadcasts', () => {
      BroadcastService.processScheduledBroadcasts();
    }, 60 * 1000); // 1 minute

    // Process pending notifications every 30 seconds
    this.startJob('pending-notifications', () => {
      NotificationService.processPendingBroadcasts();
    }, 30 * 1000); // 30 seconds

    // Cleanup inactive subscribers daily
    this.startJob('cleanup-subscribers', async () => {
      try {
        const { BotSubscriberModel } = await import('../models/BotSubscriber');
        const cleaned = await BotSubscriberModel.cleanupInactiveSubscribers(90);
        console.log(`🧹 Cleaned up ${cleaned} inactive subscribers`);
      } catch (error) {
        console.error('Failed to cleanup inactive subscribers:', error);
      }
    }, 24 * 60 * 60 * 1000); // 24 hours

    // Escalate critical support tickets every 15 minutes
    this.startJob('escalate-critical-tickets', async () => {
      try {
        const { SupportService } = await import('./supportService');
        await SupportService.escalateCriticalTickets();
      } catch (error) {
        console.error('Failed to escalate critical tickets:', error);
      }
    }, 15 * 60 * 1000); // 15 minutes

    console.log('✅ Scheduled jobs started');
  }

  /**
   * Stop all scheduled jobs
   */
  static stopScheduledJobs(): void {
    console.log('🛑 Stopping scheduled jobs...');
    
    for (const [name, interval] of this.intervals) {
      clearInterval(interval);
      console.log(`Stopped job: ${name}`);
    }
    
    this.intervals.clear();
    console.log('✅ All scheduled jobs stopped');
  }

  /**
   * Start a specific job
   */
  private static startJob(name: string, job: () => void | Promise<void>, intervalMs: number): void {
    // Stop existing job if running
    if (this.intervals.has(name)) {
      clearInterval(this.intervals.get(name)!);
    }

    // Start new job
    const interval = setInterval(async () => {
      try {
        await job();
      } catch (error) {
        console.error(`Error in scheduled job ${name}:`, error);
      }
    }, intervalMs);

    this.intervals.set(name, interval);
    console.log(`Started job: ${name} (interval: ${intervalMs}ms)`);
  }

  /**
   * Stop a specific job
   */
  static stopJob(name: string): void {
    const interval = this.intervals.get(name);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(name);
      console.log(`Stopped job: ${name}`);
    }
  }

  /**
   * Get status of all jobs
   */
  static getJobStatus(): Array<{ name: string; running: boolean }> {
    const jobs = [
      'scheduled-broadcasts',
      'pending-notifications',
      'cleanup-subscribers',
      'escalate-critical-tickets'
    ];

    return jobs.map(name => ({
      name,
      running: this.intervals.has(name)
    }));
  }

  /**
   * Restart a specific job
   */
  static restartJob(name: string): void {
    this.stopJob(name);
    
    // Restart based on job name
    switch (name) {
      case 'scheduled-broadcasts':
        this.startJob(name, () => {
          BroadcastService.processScheduledBroadcasts();
        }, 60 * 1000);
        break;
      case 'pending-notifications':
        this.startJob(name, () => {
          NotificationService.processPendingBroadcasts();
        }, 30 * 1000);
        break;
      case 'cleanup-subscribers':
        this.startJob(name, async () => {
          try {
            const { BotSubscriberModel } = await import('../models/BotSubscriber');
            const cleaned = await BotSubscriberModel.cleanupInactiveSubscribers(90);
            console.log(`🧹 Cleaned up ${cleaned} inactive subscribers`);
          } catch (error) {
            console.error('Failed to cleanup inactive subscribers:', error);
          }
        }, 24 * 60 * 60 * 1000);
        break;
      case 'escalate-critical-tickets':
        this.startJob(name, async () => {
          try {
            const { SupportService } = await import('./supportService');
            await SupportService.escalateCriticalTickets();
          } catch (error) {
            console.error('Failed to escalate critical tickets:', error);
          }
        }, 15 * 60 * 1000);
        break;
      default:
        console.warn(`Unknown job name: ${name}`);
    }
  }
}