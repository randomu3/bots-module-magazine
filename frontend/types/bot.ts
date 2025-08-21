export interface Bot {
  id: string;
  userId: string;
  telegramBotId: string;
  name: string;
  username: string;
  description: string;
  status: 'active' | 'inactive' | 'suspended';
  webhookUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface BotStats {
  botId: string;
  activeModules: number;
  totalRevenue: number;
  monthlyRevenue: number;
  subscribers: number;
}

export interface CreateBotRequest {
  token: string;
}

export interface UpdateBotRequest {
  name?: string;
  description?: string;
  webhookUrl?: string;
}