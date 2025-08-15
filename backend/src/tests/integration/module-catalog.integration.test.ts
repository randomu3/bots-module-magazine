import request from 'supertest';
import express from 'express';
import cors from 'cors';
import moduleRoutes from '../../routes/moduleRoutes';
import { ModuleModel } from '../../models/Module';
import { ModuleRatingModel } from '../../models/ModuleRating';

// Mock the models
jest.mock('../../models/Module');
jest.mock('../../models/ModuleRating');
const MockedModuleModel = ModuleModel as jest.Mocked<typeof ModuleModel>;
const MockedModuleRatingModel = ModuleRatingModel as jest.Mocked<typeof ModuleRatingModel>;

// Helper function to create consistent date strings
const createDateString = () => new Date('2025-08-14T10:20:45.498Z');

describe('Module Catalog Integration Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    // Create a test app with just the module routes
    app = express();
    app.use(cors());
    app.use(express.json());
    app.use('/api/modules', moduleRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/modules/catalog', () => {
    it('should return module catalog with default pagination', async () => {
      const mockModules = [
        {
          id: '1',
          name: 'Subscription Manager',
          description: 'Manage paid subscriptions for your bot users',
          category: 'Monetization',
          price: 29.99,
          developer_id: 'dev-1',
          status: 'approved' as const,
          code_url: 'https://example.com/code',
          documentation_url: 'https://docs.example.com/subscription-manager',
          api_endpoints: ['POST /api/subscriptions', 'GET /api/subscriptions/:id'],
          webhook_required: true,
          created_at: createDateString(),
          updated_at: createDateString(),
          developer_first_name: 'John',
          developer_last_name: 'Doe',
          active_installations: 10,
          average_rating: 4.5,
          total_ratings: 15
        }
      ];

      MockedModuleModel.getApprovedModules.mockResolvedValue({
        modules: mockModules,
        total: 1
      });

      const response = await request(app)
        .get('/api/modules/catalog')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.modules).toHaveLength(1);
      expect(response.body.data.modules[0].name).toBe(mockModules[0]?.name);
      expect(response.body.data.modules[0].category).toBe(mockModules[0]?.category);
      expect(response.body.data.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1
      });

      expect(MockedModuleModel.getApprovedModules).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        sort: 'created_at',
        order: 'desc'
      });
    });

    it('should handle category filtering', async () => {
      const mockModules = [
        {
          id: '1',
          name: 'Subscription Manager',
          description: 'Manage paid subscriptions',
          category: 'Monetization',
          price: 29.99,
          developer_id: 'dev-1',
          status: 'approved' as const,
          code_url: 'https://example.com/code',
          documentation_url: 'https://docs.example.com/subscription-manager',
          api_endpoints: ['POST /api/subscriptions'],
          webhook_required: true,
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      MockedModuleModel.getApprovedModules.mockResolvedValue({
        modules: mockModules,
        total: 1
      });

      const response = await request(app)
        .get('/api/modules/catalog?category=Monetization&page=1&limit=10')
        .expect(200);

      expect(MockedModuleModel.getApprovedModules).toHaveBeenCalledWith({
        category: 'Monetization',
        page: 1,
        limit: 10,
        sort: 'created_at',
        order: 'desc'
      });

      expect(response.body.success).toBe(true);
      expect(response.body.data.modules).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: '1',
            name: 'Subscription Manager',
            description: 'Manage paid subscriptions',
            category: 'Monetization',
            price: 29.99,
            developer_id: 'dev-1',
            status: 'approved',
            code_url: 'https://example.com/code',
            documentation_url: 'https://docs.example.com/subscription-manager',
            api_endpoints: ['POST /api/subscriptions'],
            webhook_required: true,
            created_at: expect.any(String),
            updated_at: expect.any(String)
          })
        ])
      );
    });

    it('should handle search filtering', async () => {
      const mockModules = [
        {
          id: '1',
          name: 'Payment Gateway',
          description: 'Accept payments directly in your bot',
          category: 'Monetization',
          price: 34.99,
          developer_id: 'dev-1',
          status: 'approved' as const,
          code_url: 'https://example.com/code',
          documentation_url: 'https://docs.example.com/payment-gateway',
          api_endpoints: ['POST /api/payments/create'],
          webhook_required: true,
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      MockedModuleModel.getApprovedModules.mockResolvedValue({
        modules: mockModules,
        total: 1
      });

      const response = await request(app)
        .get('/api/modules/catalog?search=payment')
        .expect(200);

      expect(MockedModuleModel.getApprovedModules).toHaveBeenCalledWith({
        search: 'payment',
        page: 1,
        limit: 20,
        sort: 'created_at',
        order: 'desc'
      });

      expect(response.body.success).toBe(true);
      expect(response.body.data.modules).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: '1',
            name: 'Payment Gateway',
            description: 'Accept payments directly in your bot',
            category: 'Monetization',
            price: 34.99,
            developer_id: 'dev-1',
            status: 'approved',
            code_url: 'https://example.com/code',
            documentation_url: 'https://docs.example.com/payment-gateway',
            api_endpoints: ['POST /api/payments/create'],
            webhook_required: true,
            created_at: expect.any(String),
            updated_at: expect.any(String)
          })
        ])
      );
    });

    it('should handle price range filtering', async () => {
      const mockModules = [
        {
          id: '1',
          name: 'Budget Module',
          description: 'Affordable module for small bots',
          category: 'Utilities',
          price: 15.99,
          developer_id: 'dev-1',
          status: 'approved' as const,
          code_url: 'https://example.com/code',
          documentation_url: 'https://docs.example.com/budget-module',
          api_endpoints: ['GET /api/budget'],
          webhook_required: false,
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      MockedModuleModel.getApprovedModules.mockResolvedValue({
        modules: mockModules,
        total: 1
      });

      const response = await request(app)
        .get('/api/modules/catalog?price_min=10&price_max=20')
        .expect(200);

      expect(MockedModuleModel.getApprovedModules).toHaveBeenCalledWith({
        price_min: 10,
        price_max: 20,
        page: 1,
        limit: 20,
        sort: 'created_at',
        order: 'desc'
      });

      expect(response.body.success).toBe(true);
      expect(response.body.data.modules).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: '1',
            name: 'Budget Module',
            description: 'Affordable module for small bots',
            category: 'Utilities',
            price: 15.99,
            developer_id: 'dev-1',
            status: 'approved',
            code_url: 'https://example.com/code',
            documentation_url: 'https://docs.example.com/budget-module',
            api_endpoints: ['GET /api/budget'],
            webhook_required: false,
            created_at: expect.any(String),
            updated_at: expect.any(String)
          })
        ])
      );
    });

    it('should handle sorting options', async () => {
      const mockModules = [
        {
          id: '1',
          name: 'Popular Module',
          description: 'Most popular module',
          category: 'Popular',
          price: 25.99,
          developer_id: 'dev-1',
          status: 'approved' as const,
          code_url: 'https://example.com/code',
          documentation_url: 'https://docs.example.com/popular-module',
          api_endpoints: ['GET /api/popular'],
          webhook_required: false,
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      MockedModuleModel.getApprovedModules.mockResolvedValue({
        modules: mockModules,
        total: 1
      });

      const response = await request(app)
        .get('/api/modules/catalog?sort=price&order=asc')
        .expect(200);

      expect(MockedModuleModel.getApprovedModules).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        sort: 'price',
        order: 'asc'
      });

      expect(response.body.success).toBe(true);
    });

    it('should return validation error for invalid parameters', async () => {
      const response = await request(app)
        .get('/api/modules/catalog?page=invalid')
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('page');
    });
  });

  describe('GET /api/modules/categories', () => {
    it('should return available categories', async () => {
      const mockCategories = ['Monetization', 'Marketing', 'Engagement', 'E-commerce'];

      MockedModuleModel.getCategories.mockResolvedValue(mockCategories);

      const response = await request(app)
        .get('/api/modules/categories')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          categories: mockCategories
        }
      });

      expect(MockedModuleModel.getCategories).toHaveBeenCalled();
    });
  });

  describe('GET /api/modules/search', () => {
    it('should search modules by term', async () => {
      const mockModules = [
        {
          id: '1',
          name: 'E-commerce Store',
          description: 'Transform your bot into a complete e-commerce platform',
          category: 'E-commerce',
          price: 49.99,
          developer_id: 'dev-1',
          status: 'approved' as const,
          code_url: 'https://example.com/code',
          documentation_url: 'https://docs.example.com/ecommerce',
          api_endpoints: ['POST /api/products', 'GET /api/products'],
          webhook_required: true,
          created_at: new Date(),
          updated_at: new Date(),
          rank: 0.8
        }
      ];

      MockedModuleModel.searchModules.mockResolvedValue(mockModules);

      const response = await request(app)
        .get('/api/modules/search?q=ecommerce')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          modules: expect.arrayContaining([
            expect.objectContaining({
              id: '1',
              name: 'E-commerce Store',
              description: 'Transform your bot into a complete e-commerce platform',
              category: 'E-commerce',
              price: 49.99,
              developer_id: 'dev-1',
              status: 'approved',
              code_url: 'https://example.com/code',
              documentation_url: 'https://docs.example.com/ecommerce',
              api_endpoints: ['POST /api/products', 'GET /api/products'],
              webhook_required: true,
              created_at: expect.any(String),
              updated_at: expect.any(String),
              rank: 0.8
            })
          ]),
          searchTerm: 'ecommerce'
        }
      });

      expect(MockedModuleModel.searchModules).toHaveBeenCalledWith('ecommerce', 20);
    });

    it('should require search term', async () => {
      const response = await request(app)
        .get('/api/modules/search')
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toBe('Search term is required');
    });

    it('should validate minimum search term length', async () => {
      const response = await request(app)
        .get('/api/modules/search?q=a')
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toBe('Search term must be at least 2 characters long');
    });
  });

  describe('GET /api/modules/popular', () => {
    it('should return popular modules', async () => {
      const mockModules = [
        {
          id: '1',
          name: 'Most Popular Module',
          description: 'The most installed module',
          category: 'Popular',
          price: 19.99,
          developer_id: 'dev-1',
          status: 'approved' as const,
          code_url: 'https://example.com/code',
          documentation_url: 'https://docs.example.com/popular',
          api_endpoints: ['GET /api/popular'],
          webhook_required: false,
          created_at: new Date(),
          updated_at: new Date(),
          installation_count: 500,
          average_rating: 4.8,
          total_ratings: 120
        }
      ];

      MockedModuleModel.getPopularModules.mockResolvedValue(mockModules);

      const response = await request(app)
        .get('/api/modules/popular')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          modules: expect.arrayContaining([
            expect.objectContaining({
              id: '1',
              name: 'Most Popular Module',
              description: 'The most installed module',
              category: 'Popular',
              price: 19.99,
              developer_id: 'dev-1',
              status: 'approved',
              code_url: 'https://example.com/code',
              documentation_url: 'https://docs.example.com/popular',
              api_endpoints: ['GET /api/popular'],
              webhook_required: false,
              created_at: expect.any(String),
              updated_at: expect.any(String),
              installation_count: 500,
              average_rating: 4.8,
              total_ratings: 120
            })
          ])
        }
      });

      expect(MockedModuleModel.getPopularModules).toHaveBeenCalledWith(10);
    });

    it('should handle custom limit', async () => {
      MockedModuleModel.getPopularModules.mockResolvedValue([]);

      await request(app)
        .get('/api/modules/popular?limit=5')
        .expect(200);

      expect(MockedModuleModel.getPopularModules).toHaveBeenCalledWith(5);
    });

    it('should validate limit parameter', async () => {
      const response = await request(app)
        .get('/api/modules/popular?limit=100')
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toBe('Limit must be between 1 and 50');
    });
  });

  describe('GET /api/modules/:id', () => {
    it('should return module details with stats', async () => {
      const mockModule = {
        id: '1',
        name: 'Test Module',
        description: 'Test Description',
        category: 'Test',
        price: 29.99,
        developer_id: 'dev-1',
        status: 'approved' as const,
        code_url: 'https://example.com/code',
        documentation_url: 'https://docs.example.com/test',
        api_endpoints: ['POST /api/test'],
        webhook_required: false,
        created_at: new Date(),
        updated_at: new Date()
      };

      const mockStats = {
        total_installations: 10,
        active_installations: 8,
        total_revenue: 299.90,
        monthly_revenue: 59.98,
        average_rating: 4.5,
        total_ratings: 15
      };

      MockedModuleModel.findById.mockResolvedValue(mockModule);
      MockedModuleModel.getModuleStats.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/modules/1')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          module: expect.objectContaining({
            id: '1',
            name: 'Test Module',
            description: 'Test Description',
            category: 'Test',
            price: 29.99,
            developer_id: 'dev-1',
            status: 'approved',
            code_url: 'https://example.com/code',
            documentation_url: 'https://docs.example.com/test',
            api_endpoints: ['POST /api/test'],
            webhook_required: false,
            created_at: expect.any(String),
            updated_at: expect.any(String),
            stats: mockStats
          })
        }
      });

      expect(MockedModuleModel.findById).toHaveBeenCalledWith('1');
      expect(MockedModuleModel.getModuleStats).toHaveBeenCalledWith('1');
    });

    it('should return 404 for non-existent module', async () => {
      MockedModuleModel.findById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/modules/999')
        .expect(404);

      expect(response.body.error.code).toBe('MODULE_NOT_FOUND');
    });

    it('should return 404 for non-approved module', async () => {
      const mockModule = {
        id: '1',
        name: 'Pending Module',
        description: 'Not yet approved',
        category: 'Test',
        price: 29.99,
        developer_id: 'dev-1',
        status: 'pending' as const,
        code_url: 'https://example.com/code',
        documentation_url: 'https://docs.example.com/pending',
        api_endpoints: ['POST /api/pending'],
        webhook_required: false,
        created_at: new Date(),
        updated_at: new Date()
      };

      MockedModuleModel.findById.mockResolvedValue(mockModule);

      const response = await request(app)
        .get('/api/modules/1')
        .expect(404);

      expect(response.body.error.code).toBe('MODULE_NOT_FOUND');
    });
  });

  describe('GET /api/modules/:id/ratings', () => {
    it('should return module ratings with stats', async () => {
      const mockModule = {
        id: '1',
        name: 'Test Module',
        description: 'Test Description',
        category: 'Test',
        price: 29.99,
        developer_id: 'dev-1',
        status: 'approved' as const,
        code_url: 'https://example.com/code',
        documentation_url: 'https://docs.example.com/test',
        api_endpoints: ['POST /api/test'],
        webhook_required: false,
        created_at: new Date(),
        updated_at: new Date()
      };

      const mockRatingsResult = {
        ratings: [
          {
            id: 'rating-1',
            module_id: '1',
            user_id: 'user-1',
            rating: 5,
            review: 'Excellent module!',
            first_name: 'John',
            last_name: 'Doe',
            created_at: new Date(),
            updated_at: new Date()
          }
        ],
        total: 1,
        stats: {
          average: 4.5,
          distribution: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 2 }
        }
      };

      MockedModuleModel.findById.mockResolvedValue(mockModule);
      MockedModuleRatingModel.getModuleRatings.mockResolvedValue(mockRatingsResult);

      const response = await request(app)
        .get('/api/modules/1/ratings')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          ratings: expect.arrayContaining([
            expect.objectContaining({
              id: 'rating-1',
              module_id: '1',
              user_id: 'user-1',
              rating: 5,
              review: 'Excellent module!',
              first_name: 'John',
              last_name: 'Doe',
              created_at: expect.any(String),
              updated_at: expect.any(String)
            })
          ]),
          stats: mockRatingsResult.stats,
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            totalPages: 1
          }
        }
      });

      expect(MockedModuleModel.findById).toHaveBeenCalledWith('1');
      expect(MockedModuleRatingModel.getModuleRatings).toHaveBeenCalledWith('1', {
        page: 1,
        limit: 20,
        sort: 'created_at',
        order: 'desc'
      });
    });

    it('should return 404 for non-existent module', async () => {
      MockedModuleModel.findById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/modules/999/ratings')
        .expect(404);

      expect(response.body.error.code).toBe('MODULE_NOT_FOUND');
    });
  });
});