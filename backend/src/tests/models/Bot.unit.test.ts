// This test file bypasses the global model mocks to test the actual model logic

// Mock the database pool before any imports
const mockQuery = jest.fn();
jest.doMock('../../config/database', () => ({
  query: mockQuery,
}));

// Mock crypto for token encryption
jest.doMock('crypto', () => ({
  ...jest.requireActual('crypto'),
  scryptSync: jest.fn(() => Buffer.from('test-key-32-bytes-long-for-aes256')),
  randomBytes: jest.fn(() => Buffer.from('test-iv-16-bytes-')),
  createCipher: jest.fn(() => ({
    update: jest.fn(() => 'encrypted'),
    final: jest.fn(() => 'token'),
  })),
  createDecipher: jest.fn(() => ({
    update: jest.fn(() => 'decrypted'),
    final: jest.fn(() => 'token'),
  })),
}));

// Clear the global model mock for this test
jest.doMock('../../models/Bot', () => {
  return jest.requireActual('../../models/Bot');
});

describe('BotModel Unit Tests', () => {
  let BotModel: any;

  beforeAll(async () => {
    // Import the actual model after setting up mocks
    const { BotModel: ActualBotModel } = await import('../../models/Bot');
    BotModel = ActualBotModel;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a bot with valid input', async () => {
      const input = {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        telegram_bot_id: '123456789',
        name: 'Test Bot',
        username: 'testbot',
        description: 'A test bot',
        token: 'bot_token_123',
        webhook_url: 'https://example.com/webhook',
      };

      const mockBot = {
        id: '456e7890-e89b-12d3-a456-426614174000',
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        telegram_bot_id: '123456789',
        name: 'Test Bot',
        username: 'testbot',
        description: 'A test bot',
        status: 'active',
        created_at: new Date('2025-08-15T11:38:36.120Z'),
        updated_at: new Date('2025-08-15T11:38:36.120Z'),
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockBot] });

      const result = await BotModel.create(input);

      expect(result).toEqual(mockBot);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO bots'),
        expect.arrayContaining([
          '123e4567-e89b-12d3-a456-426614174000',
          '123456789',
          'Test Bot',
          'testbot',
          'A test bot',
          expect.any(String), // encrypted token
          'https://example.com/webhook',
        ])
      );
    });

    it('should throw validation error for invalid input', async () => {
      const input = {
        user_id: 'invalid-uuid',
        telegram_bot_id: '123456789',
        name: 'Test Bot',
        token: 'bot_token_123',
      };

      await expect(BotModel.create(input)).rejects.toThrow('Validation error');
    });

    it('should throw error for duplicate telegram bot id', async () => {
      const input = {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        telegram_bot_id: '123456789',
        name: 'Test Bot',
        token: 'bot_token_123',
      };

      const dbError = new Error('Duplicate key') as any;
      dbError.code = '23505';
      dbError.constraint = 'bots_telegram_bot_id_key';

      mockQuery.mockRejectedValueOnce(dbError);

      await expect(BotModel.create(input)).rejects.toThrow('Bot with this Telegram ID already exists');
    });

    it('should throw error for non-existent user', async () => {
      const input = {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        telegram_bot_id: '123456789',
        name: 'Test Bot',
        token: 'bot_token_123',
      };

      const dbError = new Error('Foreign key violation') as any;
      dbError.code = '23503';

      mockQuery.mockRejectedValueOnce(dbError);

      await expect(BotModel.create(input)).rejects.toThrow('User not found');
    });
  });

  describe('findById', () => {
    it('should return bot when found', async () => {
      const mockBot = {
        id: '456e7890-e89b-12d3-a456-426614174000',
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        telegram_bot_id: '123456789',
        name: 'Test Bot',
        status: 'active',
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockBot] });

      const result = await BotModel.findById('456e7890-e89b-12d3-a456-426614174000');

      expect(result).toEqual(mockBot);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM bots WHERE id = $1',
        ['456e7890-e89b-12d3-a456-426614174000']
      );
    });

    it('should return null when bot not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await BotModel.findById('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update bot with valid input', async () => {
      const input = {
        name: 'Updated Bot Name',
        description: 'Updated description',
        status: 'inactive' as const,
      };

      const mockUpdatedBot = {
        id: '456e7890-e89b-12d3-a456-426614174000',
        name: 'Updated Bot Name',
        description: 'Updated description',
        status: 'inactive',
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockUpdatedBot] });

      const result = await BotModel.update('456e7890-e89b-12d3-a456-426614174000', input);

      expect(result).toEqual(mockUpdatedBot);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringMatching(/UPDATE bots\s+SET/),
        ['456e7890-e89b-12d3-a456-426614174000', 'Updated Bot Name', 'Updated description', 'inactive']
      );
    });

    it('should throw validation error for invalid status', async () => {
      const input = {
        status: 'invalid-status' as any,
      };

      await expect(
        BotModel.update('456e7890-e89b-12d3-a456-426614174000', input)
      ).rejects.toThrow('Validation error');
    });
  });

  describe('delete', () => {
    it('should delete bot successfully', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      const result = await BotModel.delete('456e7890-e89b-12d3-a456-426614174000');

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM bots WHERE id = $1',
        ['456e7890-e89b-12d3-a456-426614174000']
      );
    });

    it('should return false when bot not found', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });

      const result = await BotModel.delete('nonexistent-id');

      expect(result).toBe(false);
    });
  });

  describe('list', () => {
    it('should return paginated bots list', async () => {
      const mockBots = [
        { id: '1', name: 'Bot 1', status: 'active' },
        { id: '2', name: 'Bot 2', status: 'inactive' },
      ];

      // Mock count query
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '2' }] });
      // Mock data query
      mockQuery.mockResolvedValueOnce({ rows: mockBots });

      const result = await BotModel.list({ page: 1, limit: 10 });

      expect(result).toEqual({
        bots: mockBots,
        total: 2,
      });
    });
  });

  describe('getBotStats', () => {
    it('should return default stats when no data found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await BotModel.getBotStats('nonexistent-bot-id');

      expect(result).toEqual({
        total_modules: 0,
        active_modules: 0,
        total_revenue: 0,
        monthly_revenue: 0,
      });
    });
  });
});