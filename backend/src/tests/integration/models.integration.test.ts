import '../integration-setup';
import { UserModel, BotModel, ModuleModel, TransactionModel } from '../../models';

// Clear the mocked models for integration tests
jest.unmock('../../models/User');
jest.unmock('../../models/Bot');
jest.unmock('../../models/Module');
jest.unmock('../../models/Transaction');

describe('Models Integration Tests', () => {
  beforeAll(async () => {
    // Database is mocked in setup
  });

  describe('UserModel Integration', () => {
    let createdUserId: string;

    it('should create a user successfully', async () => {
      const userData = {
        email: `test-${Date.now()}@example.com`,
        password: 'password123',
        first_name: 'John',
        last_name: 'Doe',
      };

      const user = await UserModel.create(userData);

      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.first_name).toBe(userData.first_name);
      expect(user.last_name).toBe(userData.last_name);
      expect(user.role).toBe('user');
      expect(parseFloat(user.balance.toString())).toBe(0);
      expect(user.email_verified).toBe(false);

      createdUserId = user.id;
    });

    it('should find user by id', async () => {
      const user = await UserModel.findById(createdUserId);

      expect(user).toBeDefined();
      expect(user?.id).toBe(createdUserId);
    });

    it('should update user successfully', async () => {
      const updateData = {
        first_name: 'Jane',
        theme_preference: 'dark' as const,
      };

      const updatedUser = await UserModel.update(createdUserId, updateData);

      expect(updatedUser).toBeDefined();
      expect(updatedUser?.first_name).toBe('Jane');
      expect(updatedUser?.theme_preference).toBe('dark');
    });

    it('should verify password correctly', async () => {
      const user = await UserModel.findById(createdUserId);
      expect(user).toBeDefined();

      if (user) {
        const isValid = await UserModel.verifyPassword(user, 'password123');
        expect(isValid).toBe(true);

        const isInvalid = await UserModel.verifyPassword(user, 'wrongpassword');
        expect(isInvalid).toBe(false);
      }
    });

    afterAll(async () => {
      // Clean up created user
      if (createdUserId) {
        await UserModel.delete(createdUserId);
      }
    });
  });

  describe('BotModel Integration', () => {
    let createdUserId: string;
    let createdBotId: string;

    beforeAll(async () => {
      // Create a user first
      const userData = {
        email: `bot-test-${Date.now()}@example.com`,
        password: 'password123',
        first_name: 'Bot',
        last_name: 'Owner',
      };

      const user = await UserModel.create(userData);
      createdUserId = user.id;
    });

    it('should create a bot successfully', async () => {
      const botData = {
        user_id: createdUserId,
        telegram_bot_id: `${Date.now()}`,
        name: 'Test Bot',
        username: 'testbot',
        description: 'A test bot',
        token: 'test_bot_token_123',
        webhook_url: 'https://example.com/webhook',
      };

      const bot = await BotModel.create(botData);

      expect(bot).toBeDefined();
      expect(bot.user_id).toBe(createdUserId);
      expect(bot.telegram_bot_id).toBe(botData.telegram_bot_id);
      expect(bot.name).toBe(botData.name);
      expect(bot.username).toBe(botData.username);
      expect(bot.status).toBe('active');

      createdBotId = bot.id;
    });

    it('should find bot by telegram id', async () => {
      const bot = await BotModel.findById(createdBotId);
      expect(bot).toBeDefined();

      if (bot) {
        const foundBot = await BotModel.findByTelegramId(bot.telegram_bot_id);
        expect(foundBot).toBeDefined();
        expect(foundBot?.id).toBe(createdBotId);
      }
    });

    it('should update bot status', async () => {
      const updatedBot = await BotModel.updateStatus(createdBotId, 'inactive');

      expect(updatedBot).toBeDefined();
      expect(updatedBot?.status).toBe('inactive');
    });

    afterAll(async () => {
      // Clean up created bot and user
      if (createdBotId) {
        await BotModel.delete(createdBotId);
      }
      if (createdUserId) {
        await UserModel.delete(createdUserId);
      }
    });
  });

  describe('ModuleModel Integration', () => {
    let createdUserId: string;
    let createdModuleId: string;

    beforeAll(async () => {
      // Create a developer user first
      const userData = {
        email: `module-dev-${Date.now()}@example.com`,
        password: 'password123',
        first_name: 'Module',
        last_name: 'Developer',
        role: 'developer' as const,
      };

      const user = await UserModel.create(userData);
      createdUserId = user.id;
    });

    it('should create a module successfully', async () => {
      const moduleData = {
        name: 'Test Module',
        description: 'A test module for earning',
        category: 'advertising',
        price: 9.99,
        developer_id: createdUserId,
        webhook_required: true,
      };

      const module = await ModuleModel.create(moduleData);

      expect(module).toBeDefined();
      expect(module.name).toBe(moduleData.name);
      expect(module.description).toBe(moduleData.description);
      expect(module.category).toBe(moduleData.category);
      expect(module.price).toBe(moduleData.price);
      expect(module.developer_id).toBe(createdUserId);
      expect(module.status).toBe('pending');

      createdModuleId = module.id;
    });

    it('should update module status', async () => {
      const updatedModule = await ModuleModel.updateStatus(createdModuleId, 'approved');

      expect(updatedModule).toBeDefined();
      expect(updatedModule?.status).toBe('approved');
    });

    afterAll(async () => {
      // Clean up created module and user
      if (createdModuleId) {
        await ModuleModel.delete(createdModuleId);
      }
      if (createdUserId) {
        await UserModel.delete(createdUserId);
      }
    });
  });

  describe('TransactionModel Integration', () => {
    let createdUserId: string;
    let createdTransactionId: string;

    beforeAll(async () => {
      // Create a user first
      const userData = {
        email: `transaction-test-${Date.now()}@example.com`,
        password: 'password123',
        first_name: 'Transaction',
        last_name: 'User',
      };

      const user = await UserModel.create(userData);
      createdUserId = user.id;
    });

    it('should create a transaction successfully', async () => {
      const transactionData = {
        user_id: createdUserId,
        type: 'payment' as const,
        amount: 25.50,
        currency: 'USD',
        description: 'Test payment',
        metadata: { test: true },
      };

      const transaction = await TransactionModel.create(transactionData);

      expect(transaction).toBeDefined();
      expect(transaction.user_id).toBe(createdUserId);
      expect(transaction.type).toBe('payment');
      expect(transaction.amount).toBe(25.50);
      expect(transaction.currency).toBe('USD');
      expect(transaction.status).toBe('pending');

      createdTransactionId = transaction.id;
    });

    it('should update transaction status', async () => {
      const updatedTransaction = await TransactionModel.updateStatus(
        createdTransactionId, 
        'completed'
      );

      expect(updatedTransaction).toBeDefined();
      expect(updatedTransaction?.status).toBe('completed');
      expect(updatedTransaction?.processed_at).toBeDefined();
    });

    afterAll(async () => {
      // Clean up created transaction and user
      if (createdTransactionId) {
        await TransactionModel.delete(createdTransactionId);
      }
      if (createdUserId) {
        await UserModel.delete(createdUserId);
      }
    });
  });
});