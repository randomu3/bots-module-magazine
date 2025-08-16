import { Request, Response } from 'express';
import { ModuleController } from '../../controllers/moduleController';
import { ModuleModel } from '../../models/Module';
import { BotModuleActivationModel } from '../../models/BotModuleActivation';

interface AuthenticatedRequest extends Request {
  user?: { id: string; role: string };
}

// Mock the models
jest.mock('../../models/Module');
jest.mock('../../models/BotModuleActivation');

const MockedModuleModel = ModuleModel as jest.Mocked<typeof ModuleModel>;
const MockedBotModuleActivationModel = BotModuleActivationModel as jest.Mocked<typeof BotModuleActivationModel>;

describe('Module Upload Controller', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  describe('uploadModule', () => {
    it('should upload a module successfully for developer', async () => {
      const mockModule = {
        id: 'module-1',
        name: 'Test Module',
        description: 'A test module',
        category: 'Testing',
        price: 29.99,
        status: 'pending' as const,
        code_url: 'https://example.com/code',
        documentation_url: 'https://docs.example.com',
        api_endpoints: ['POST /api/test'],
        webhook_required: false,
        created_at: new Date()
      };

      mockRequest = {
        body: {
          name: 'Test Module',
          description: 'A test module',
          category: 'Testing',
          price: 29.99,
          code_url: 'https://example.com/code',
          documentation_url: 'https://docs.example.com',
          api_endpoints: ['POST /api/test'],
          webhook_required: false
        },
        user: { id: 'user-1', role: 'developer' }
      };

      MockedModuleModel.create.mockResolvedValue(mockModule as any);

      await ModuleController.uploadModule(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          module: expect.objectContaining({
            id: 'module-1',
            name: 'Test Module',
            status: 'pending'
          })
        },
        message: 'Module uploaded successfully and is pending approval'
      });
    });

    it('should return 403 for non-developer users', async () => {
      mockRequest = {
        body: {
          name: 'Test Module',
          description: 'A test module'
        },
        user: { id: 'user-1', role: 'user' }
      };

      await ModuleController.uploadModule(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'ACCESS_DENIED',
          message: 'Only developers can upload modules',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 401 without authentication', async () => {
      mockRequest = {
        body: {
          name: 'Test Module',
          description: 'A test module'
        }
        // No user property
      };

      await ModuleController.uploadModule(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authentication required',
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('getDeveloperModules', () => {
    it('should return developer modules', async () => {
      const mockModules = [
        {
          id: 'module-1',
          name: 'Test Module',
          status: 'pending',
          developer_id: 'user-1'
        }
      ];

      mockRequest = {
        query: { page: '1', limit: '20' },
        user: { id: 'user-1', role: 'developer' }
      };

      MockedModuleModel.list.mockResolvedValue({
        modules: mockModules as any,
        total: 1
      });

      await ModuleController.getDeveloperModules(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
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

    it('should return 403 for non-developer users', async () => {
      mockRequest = {
        query: {},
        user: { id: 'user-1', role: 'user' }
      };

      await ModuleController.getDeveloperModules(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'ACCESS_DENIED',
          message: 'Only developers can access this endpoint',
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('deleteModule', () => {
    it('should delete module successfully', async () => {
      const mockModule = {
        id: 'module-1',
        name: 'Test Module',
        developer_id: 'user-1'
      };

      mockRequest = {
        params: { id: 'module-1' },
        user: { id: 'user-1', role: 'developer' }
      };

      MockedModuleModel.findById.mockResolvedValue(mockModule as any);
      MockedBotModuleActivationModel.findByModuleId.mockResolvedValue([]);
      MockedModuleModel.delete.mockResolvedValue(true);

      await ModuleController.deleteModule(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Module deleted successfully'
      });
    });

    it('should return 409 if module has active installations', async () => {
      const mockModule = {
        id: 'module-1',
        name: 'Test Module',
        developer_id: 'user-1'
      };

      const activeActivations = [
        { id: 'activation-1', status: 'active' }
      ];

      mockRequest = {
        params: { id: 'module-1' },
        user: { id: 'user-1', role: 'developer' }
      };

      MockedModuleModel.findById.mockResolvedValue(mockModule as any);
      MockedBotModuleActivationModel.findByModuleId.mockResolvedValue(activeActivations as any);

      await ModuleController.deleteModule(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'MODULE_IN_USE',
          message: 'Cannot delete module with active installations',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 403 for unauthorized access', async () => {
      const mockModule = {
        id: 'module-1',
        name: 'Test Module',
        developer_id: 'other-user'
      };

      mockRequest = {
        params: { id: 'module-1' },
        user: { id: 'user-1', role: 'developer' }
      };

      MockedModuleModel.findById.mockResolvedValue(mockModule as any);

      await ModuleController.deleteModule(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'ACCESS_DENIED',
          message: 'You do not have permission to delete this module',
          timestamp: expect.any(String)
        }
      });
    });
  });
});