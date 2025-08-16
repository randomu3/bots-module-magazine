import request from 'supertest';
import app from '../../index';
import { UserModel } from '../../models/User';
import { ModuleModel } from '../../models/Module';
import { BotModuleActivationModel } from '../../models/BotModuleActivation';
import { EmailVerificationTokenModel } from '../../models/EmailVerificationToken';

describe('Module Activation Integration Tests', () => {
  let userId: string;
  let botId: string;
  let moduleId: string;
  let accessToken: string;

  const testUser = {
    email: 'moduletest@example.com',
    password: 'TestPassword123!',
    first_name: 'Module',
    last_name: 'Tester'
  };

  const testBot = {
    telegram_bot_id: '123456789',
    name: 'Test Bot for Modules',
    username: 'test_module_bot',
    description: 'A test bot for module activation',
    token: 'test_bot_token_for_modules'
  };

  const testModule = {
    name: 'Test Earning Module',
    description: 'A test module for earning money',
    category: 'Monetization',
    price: 29.99,
    code_url: 'https://example.com/test-module',
    documentation_url: 'https://docs.example.com/test-module',
    api_endpoints: ['POST /api/test-module/action'],
    webhook_required: true
  };

  beforeAll(async () => {
    // Register user
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(registerResponse.status).toBe(201);
    userId = registerResponse.body.user.id;

    // Verify email
    const verificationTokens = await EmailVerificationTokenModel.findByUserId(userId);
    expect(verificationTokens).toHaveLength(1);
    
    const verifyResponse = await request(app)
      .post('/api/auth/verify-email')
      .send({ token: verificationTokens[0]?.token });

    expect(verifyResponse.status).toBe(200);

    // Login to get access token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    expect(loginResponse.status).toBe(200);
    accessToken = loginResponse.body.tokens.accessToken;

    // Create a bot
    const botResponse = await request(app)
      .post('/api/bots/connect')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(testBot);

    expect(botResponse.status).toBe(201);
    botId = botResponse.body.data.bot.id;

    // Create a test module
    const module = await ModuleModel.create({
      ...testModule,
      developer_id: userId
    });
    
    // Approve the module
    await ModuleModel.updateStatus(module.id, 'approved');
    moduleId = module.id;
  });

  afterAll(async () => {
    // Clean up
    if (userId) {
      await UserModel.delete(userId);
    }
  });

  describe('POST /api/modules/:id/activate', () => {
    it('should activate a module for a bot successfully', async () => {
      const activationData = {
        bot_id: botId,
        markup_percentage: 15.5,
        settings: {
          custom_setting: 'test_value'
        }
      };

      const response = await request(app)
        .post(`/api/modules/${moduleId}/activate`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(activationData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.activation).toMatchObject({
        bot_id: botId,
        module_id: moduleId,
        markup_percentage: 15.5,
        status: 'active'
      });
      expect(response.body.data.activation.api_key).toBeDefined();
      expect(response.body.data.activation.settings).toEqual(activationData.settings);
    });

    it('should return 409 when module is already activated', async () => {
      const activationData = {
        bot_id: botId,
        markup_percentage: 10
      };

      const response = await request(app)
        .post(`/api/modules/${moduleId}/activate`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(activationData);

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('MODULE_ALREADY_ACTIVATED');
    });

    it('should return 404 for non-existent module', async () => {
      const activationData = {
        bot_id: botId,
        markup_percentage: 10
      };

      const response = await request(app)
        .post('/api/modules/non-existent-id/activate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(activationData);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('MODULE_NOT_FOUND');
    });

    it('should return 404 for non-existent bot', async () => {
      const activationData = {
        bot_id: 'non-existent-bot-id',
        markup_percentage: 10
      };

      const response = await request(app)
        .post(`/api/modules/${moduleId}/activate`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(activationData);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('BOT_NOT_FOUND');
    });

    it('should return 401 without authentication', async () => {
      const activationData = {
        bot_id: botId,
        markup_percentage: 10
      };

      const response = await request(app)
        .post(`/api/modules/${moduleId}/activate`)
        .send(activationData);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTH_REQUIRED');
    });

    it('should validate markup percentage', async () => {
      const activationData = {
        bot_id: botId,
        markup_percentage: 150 // Invalid: over 100%
      };

      const response = await request(app)
        .post(`/api/modules/${moduleId}/activate`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(activationData);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/modules/activations', () => {
    it('should return user activations', async () => {
      const response = await request(app)
        .get('/api/modules/activations')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.activations).toBeInstanceOf(Array);
      expect(response.body.data.activations.length).toBeGreaterThan(0);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should support filtering by bot_id', async () => {
      const response = await request(app)
        .get(`/api/modules/activations?bot_id=${botId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.activations).toBeInstanceOf(Array);
      
      // All activations should be for the specified bot
      response.body.data.activations.forEach((activation: any) => {
        expect(activation.bot_id).toBe(botId);
      });
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/modules/activations?page=1&limit=5')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.pagination).toMatchObject({
        page: 1,
        limit: 5
      });
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/modules/activations');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTH_REQUIRED');
    });
  });

  describe('PUT /api/modules/activations/:id/settings', () => {
    let activationId: string;

    beforeAll(async () => {
      // Get the activation ID from the previous test
      const activations = await BotModuleActivationModel.findByBotId(botId);
      activationId = activations[0]?.id || '';
    });

    it('should update module settings', async () => {
      const updateData = {
        markup_percentage: 25.0,
        settings: {
          updated_setting: 'new_value',
          another_setting: 123
        }
      };

      const response = await request(app)
        .put(`/api/modules/activations/${activationId}/settings`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.activation.markup_percentage).toBe(25.0);
    });

    it('should return 404 for non-existent activation', async () => {
      const updateData = {
        markup_percentage: 20.0
      };

      const response = await request(app)
        .put('/api/modules/activations/non-existent-id/settings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('ACTIVATION_NOT_FOUND');
    });

    it('should return 401 without authentication', async () => {
      const updateData = {
        markup_percentage: 20.0
      };

      const response = await request(app)
        .put(`/api/modules/activations/${activationId}/settings`)
        .send(updateData);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTH_REQUIRED');
    });
  });

  describe('POST /api/modules/activations/:id/regenerate-key', () => {
    let activationId: string;
    let originalApiKey: string;

    beforeAll(async () => {
      const activations = await BotModuleActivationModel.findByBotId(botId);
      activationId = activations[0]?.id || '';
      originalApiKey = activations[0]?.api_key || '';
    });

    it('should regenerate API key', async () => {
      const response = await request(app)
        .post(`/api/modules/activations/${activationId}/regenerate-key`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.activation.api_key).toBeDefined();
      expect(response.body.data.activation.api_key).not.toBe(originalApiKey);
    });

    it('should return 404 for non-existent activation', async () => {
      const response = await request(app)
        .post('/api/modules/activations/non-existent-id/regenerate-key')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('ACTIVATION_NOT_FOUND');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post(`/api/modules/activations/${activationId}/regenerate-key`);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTH_REQUIRED');
    });
  });

  describe('DELETE /api/modules/activations/:id/deactivate', () => {
    let activationId: string;

    beforeAll(async () => {
      const activations = await BotModuleActivationModel.findByBotId(botId);
      activationId = activations[0]?.id || '';
    });

    it('should deactivate module', async () => {
      const response = await request(app)
        .delete(`/api/modules/activations/${activationId}/deactivate`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.activation.status).toBe('inactive');
    });

    it('should return 404 for non-existent activation', async () => {
      const response = await request(app)
        .delete('/api/modules/activations/non-existent-id/deactivate')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('ACTIVATION_NOT_FOUND');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .delete(`/api/modules/activations/${activationId}/deactivate`);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTH_REQUIRED');
    });
  });
});