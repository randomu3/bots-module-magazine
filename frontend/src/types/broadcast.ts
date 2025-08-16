export interface BroadcastTarget {
  botId: string;
  chatIds: (string | number)[];
}

export interface BroadcastCampaign {
  id: string;
  title: string;
  message: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled';
  total_recipients: number;
  successful_sends: number;
  failed_sends: number;
  created_at: string;
  scheduled_at?: string;
  sent_at?: string;
  metadata: {
    targets: BroadcastTarget[];
    message_options?: {
      parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
      disable_web_page_preview?: boolean;
      disable_notification?: boolean;
    };
  };
}

export interface CreateBroadcastInput {
  title: string;
  message: string;
  targets: BroadcastTarget[];
  scheduledAt?: Date;
  messageOptions?: {
    parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    disable_web_page_preview?: boolean;
    disable_notification?: boolean;
  };
}

export interface BroadcastStats {
  totalTargets: number;
  successfulSends: number;
  failedSends: number;
  deliveryRate: number;
}

export interface BroadcastReport {
  broadcast: BroadcastCampaign;
  stats: BroadcastStats;
  botBreakdown: Array<{
    botId: string;
    botName: string;
    totalSent: number;
    successful: number;
    failed: number;
  }>;
}