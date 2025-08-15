import { Request, Response } from 'express';
import { ModuleController } from '../../controllers/moduleController';
import { ModuleModel } from '../../models/Module';
import { ModuleRatingModel } from '../../models/ModuleRating';

// Mock the models
jest.mock('../../models/Module');
jest.mock('../../models/ModuleRating');
const MockedModuleModel = ModuleModel as jest.Mocked<typeof ModuleModel>;
const MockedModuleRatingModel = ModuleRatingModel as jest.Mocked<typeof ModuleRatingModel>;

describe('ModuleController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    
    mockRequest = {};
    mockResponse = {
      status: mockStatus,
      json: mockJson,
    };

    jest.clearAllMocks();
  });

  describe('getCatalog', () => {
    it('should return module catalog with pagination', async () => {
      const mockModules = [
        {
          id: '1',
          name: 'Test Module',
          description: 'Test Description',
          category: 'Test',
          price: 29.99,
          developer_id: 'dev-1',
          status: 'approved' as const,
          code_url: 'https://example.com/code',
          documentation_url: 'https://example.com/docs',
          api_endpoints: ['POST /api/test'],
          webhook_required: false,
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      MockedModuleModel.getApprovedModules.mockResolvedValue({
        modules: mockModules,
        total: 1
      });

      mockRequest.query = {
        page: '1',
        limit: '20'
      };

      await ModuleController.getCatalog(mockRequest as Request, mockResponse as Response);

      expect(MockedModuleModel.getApprovedModules).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        sort: 'created_at',
        order: 'desc'
      });

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          modules: mockModules,
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            totalPages: 1
          }
        }
      });
    });

    it('should handle validation errors', async () => {
      mockRequest.query = {
        page: 'invalid'
      };

      await ModuleController.getCatalog(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: {
          code: 'VALIDATION_ERROR',
          message: expect.any(String),
          timestamp: expect.any(String)
        }
      });
    });

    it('should handle database errors', async () => {
      MockedModuleModel.getApprovedModules.mockRejectedValue(new Error('Database error'));

      mockRequest.query = {};

      await ModuleController.getCatalog(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch module catalog',
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('getCategories', () => {
    it('should return available categories', async () => {
      const mockCategories = ['Monetization', 'Marketing', 'Engagement'];
      MockedModuleModel.getCategories.mockResolvedValue(mockCategories);

      await ModuleController.getCategories(mockRequest as Request, mockResponse as Response);

      expect(MockedModuleModel.getCategories).toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          categories: mockCategories
        }
      });
    });
  });

  describe('getPopularModules', () => {
    it('should return popular modules with default limit', async () => {
      const mockModules = [
        {
          id: '1',
          name: 'Popular Module',
          description: 'Popular Description',
          category: 'Popular',
          price: 19.99,
          developer_id: 'dev-1',
          status: 'approved' as const,
          code_url: 'https://example.com/code',
          documentation_url: 'https://example.com/docs',
          api_endpoints: ['POST /api/popular'],
          webhook_required: false,
          created_at: new Date(),
          updated_at: new Date(),
          installation_count: 100
        }
      ];

      MockedModuleModel.getPopularModules.mockResolvedValue(mockModules);

      mockRequest.query = {};

      await ModuleController.getPopularModules(mockRequest as Request, mockResponse as Response);

      expect(MockedModuleModel.getPopularModules).toHaveBeenCalledWith(10);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          modules: mockModules
        }
      });
    });

    it('should validate limit parameter', async () => {
      mockRequest.query = { limit: '100' };

      await ModuleController.getPopularModules(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Limit must be between 1 and 50',
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('searchModules', () => {
    it('should search modules by term', async () => {
      const mockModules = [
        {
          id: '1',
          name: 'Search Result',
          description: 'Search Description',
          category: 'Search',
          price: 15.99,
          developer_id: 'dev-1',
          status: 'approved' as const,
          code_url: 'https://example.com/code',
          documentation_url: 'https://example.com/docs',
          api_endpoints: ['POST /api/search'],
          webhook_required: false,
          created_at: new Date(),
          updated_at: new Date(),
          rank: 0.5
        }
      ];

      MockedModuleModel.searchModules.mockResolvedValue(mockModules);

      mockRequest.query = { q: 'test search' };

      await ModuleController.searchModules(mockRequest as Request, mockResponse as Response);

      expect(MockedModuleModel.searchModules).toHaveBeenCalledWith('test search', 20);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          modules: mockModules,
          searchTerm: 'test search'
        }
      });
    });

    it('should require search term', async () => {
      mockRequest.query = {};

      await ModuleController.searchModules(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Search term is required',
          timestamp: expect.any(String)
        }
      });
    });

    it('should validate minimum search term length', async () => {
      mockRequest.query = { q: 'a' };

      await ModuleController.searchModules(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Search term must be at least 2 characters long',
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('getModuleById', () => {
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
        documentation_url: 'https://example.com/docs',
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

      mockRequest.params = { id: '1' };

      await ModuleController.getModuleById(mockRequest as Request, mockResponse as Response);

      expect(MockedModuleModel.findById).toHaveBeenCalledWith('1');
      expect(MockedModuleModel.getModuleStats).toHaveBeenCalledWith('1');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          module: {
            ...mockModule,
            stats: mockStats
          }
        }
      });
    });

    it('should return 404 for non-existent module', async () => {
      MockedModuleModel.findById.mockResolvedValue(null);

      mockRequest.params = { id: '999' };

      await ModuleController.getModuleById(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        error: {
          code: 'MODULE_NOT_FOUND',
          message: 'Module not found',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 404 for non-approved module', async () => {
      const mockModule = {
        id: '1',
        name: 'Test Module',
        description: 'Test Description',
        category: 'Test',
        price: 29.99,
        developer_id: 'dev-1',
        status: 'pending' as const,
        code_url: 'https://example.com/code',
        documentation_url: 'https://example.com/docs',
        api_endpoints: ['POST /api/test'],
        webhook_required: false,
        created_at: new Date(),
        updated_at: new Date()
      };

      MockedModuleModel.findById.mockResolvedValue(mockModule);

      mockRequest.params = { id: '1' };

      await ModuleController.getModuleById(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        error: {
          code: 'MODULE_NOT_FOUND',
          message: 'Module not found',
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('getModuleRatings', () => {
    it('should return module ratings with stats and pagination', async () => {
      const mockModule = {
        id: '1',
        name: 'Test Module',
        description: 'Test Description',
        category: 'Test',
        price: 29.99,
        developer_id: 'dev-1',
        status: 'approved' as const,
        code_url: 'https://example.com/code',
        documentation_url: 'https://example.com/docs',
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
            review: 'Great module!',
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

      mockRequest.params = { id: '1' };
      mockRequest.query = { page: '1', limit: '20' };

      await ModuleController.getModuleRatings(mockRequest as Request, mockResponse as Response);

      expect(MockedModuleModel.findById).toHaveBeenCalledWith('1');
      expect(MockedModuleRatingModel.getModuleRatings).toHaveBeenCalledWith('1', {
        page: 1,
        limit: 20,
        sort: 'created_at',
        order: 'desc'
      });

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          ratings: mockRatingsResult.ratings,
          stats: mockRatingsResult.stats,
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            totalPages: 1
          }
        }
      });
    });

    it('should return 404 for non-existent module', async () => {
      MockedModuleModel.findById.mockResolvedValue(null);

      mockRequest.params = { id: '999' };
      mockRequest.query = {};

      await ModuleController.getModuleRatings(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        error: {
          code: 'MODULE_NOT_FOUND',
          message: 'Module not found',
          timestamp: expect.any(String)
        }
      });
    });

    it('should validate pagination parameters', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.query = { page: '0', limit: '200' };

      await ModuleController.getModuleRatings(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid pagination parameters',
          timestamp: expect.any(String)
        }
      });
    });
  });
});