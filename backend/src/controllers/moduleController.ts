import { Request, Response } from 'express';
import { ModuleModel } from '../models/Module';
import { ModuleRatingModel } from '../models/ModuleRating';
import { BotModuleActivationModel } from '../models/BotModuleActivation';
import { BotModel } from '../models/Bot';
import { moduleFilterSchema, activateModuleSchema, createModuleSchema, updateModuleSchema } from '../validation/schemas';

export class ModuleController {
  /**
   * GET /modules/catalog - Get catalog of available modules
   * Supports filtering by category, price range, search, and pagination
   */
  static async getCatalog(req: Request, res: Response): Promise<void> {
    try {
      // Validate query parameters
      const { error, value } = moduleFilterSchema.validate(req.query);
      if (error) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.details[0]?.message || 'Invalid query parameters',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const filters = {
        ...value,
        sort: value.sort || 'created_at',
        order: value.order || 'desc'
      };
      
      // Get approved modules only for catalog
      const result = await ModuleModel.getApprovedModules(filters);

      res.status(200).json({
        success: true,
        data: {
          modules: result.modules,
          pagination: {
            page: filters.page,
            limit: filters.limit,
            total: result.total,
            totalPages: Math.ceil(result.total / filters.limit)
          }
        }
      });
    } catch (error: any) {
      console.error('Error fetching module catalog:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch module catalog',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * GET /modules/categories - Get available module categories
   */
  static async getCategories(_req: Request, res: Response): Promise<void> {
    try {
      const categories = await ModuleModel.getCategories();

      res.status(200).json({
        success: true,
        data: {
          categories
        }
      });
    } catch (error: any) {
      console.error('Error fetching module categories:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch module categories',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * GET /modules/popular - Get popular modules based on installation count
   */
  static async getPopularModules(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query['limit'] as string) || 10;
      
      if (limit < 1 || limit > 50) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Limit must be between 1 and 50',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const modules = await ModuleModel.getPopularModules(limit);

      res.status(200).json({
        success: true,
        data: {
          modules
        }
      });
    } catch (error: any) {
      console.error('Error fetching popular modules:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch popular modules',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * GET /modules/featured - Get featured modules
   */
  static async getFeaturedModules(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query['limit'] as string) || 5;
      
      if (limit < 1 || limit > 20) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Limit must be between 1 and 20',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const modules = await ModuleModel.getFeaturedModules(limit);

      res.status(200).json({
        success: true,
        data: {
          modules
        }
      });
    } catch (error: any) {
      console.error('Error fetching featured modules:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch featured modules',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * GET /modules/search - Search modules by name and description
   */
  static async searchModules(req: Request, res: Response): Promise<void> {
    try {
      const searchTerm = req.query['q'] as string;
      const limit = parseInt(req.query['limit'] as string) || 20;

      if (!searchTerm || searchTerm.trim().length === 0) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Search term is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      if (searchTerm.length < 2) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Search term must be at least 2 characters long',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      if (limit < 1 || limit > 50) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Limit must be between 1 and 50',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const modules = await ModuleModel.searchModules(searchTerm.trim(), limit);

      res.status(200).json({
        success: true,
        data: {
          modules,
          searchTerm: searchTerm.trim()
        }
      });
    } catch (error: any) {
      console.error('Error searching modules:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to search modules',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * GET /modules/:id - Get module details by ID
   */
  static async getModuleById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Module ID is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const module = await ModuleModel.findById(id);

      if (!module) {
        res.status(404).json({
          error: {
            code: 'MODULE_NOT_FOUND',
            message: 'Module not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Only return approved modules for public access
      if (module.status !== 'approved') {
        res.status(404).json({
          error: {
            code: 'MODULE_NOT_FOUND',
            message: 'Module not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Get module statistics
      const stats = await ModuleModel.getModuleStats(id);

      res.status(200).json({
        success: true,
        data: {
          module: {
            ...module,
            stats
          }
        }
      });
    } catch (error: any) {
      console.error('Error fetching module details:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch module details',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * GET /modules/:id/ratings - Get ratings and reviews for a module
   */
  static async getModuleRatings(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const page = parseInt(req.query['page'] as string) || 1;
      const limit = parseInt(req.query['limit'] as string) || 20;
      const sort = req.query['sort'] as 'rating' | 'created_at' || 'created_at';
      const order = req.query['order'] as 'asc' | 'desc' || 'desc';

      if (!id) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Module ID is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      if (page < 1 || limit < 1 || limit > 100) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid pagination parameters',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Check if module exists and is approved
      const module = await ModuleModel.findById(id);
      if (!module || module.status !== 'approved') {
        res.status(404).json({
          error: {
            code: 'MODULE_NOT_FOUND',
            message: 'Module not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const result = await ModuleRatingModel.getModuleRatings(id, {
        page,
        limit,
        sort,
        order
      });

      res.status(200).json({
        success: true,
        data: {
          ratings: result.ratings,
          stats: result.stats,
          pagination: {
            page,
            limit,
            total: result.total,
            totalPages: Math.ceil(result.total / limit)
          }
        }
      });
    } catch (error: any) {
      console.error('Error fetching module ratings:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch module ratings',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * POST /modules/:id/activate - Activate a module for a bot
   */
  static async activateModule(req: Request, res: Response): Promise<void> {
    try {
      const { id: moduleId } = req.params;
      const userId = (req as any).user?.id;

      if (!moduleId) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Module ID is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      if (!userId) {
        res.status(401).json({
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Validate request body
      const { error, value } = activateModuleSchema.validate({
        ...req.body,
        module_id: moduleId
      });

      if (error) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.details[0]?.message || 'Invalid input',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const { bot_id, markup_percentage, settings, expires_at } = value;

      // Check if module exists and is approved
      const module = await ModuleModel.findById(moduleId);
      if (!module) {
        res.status(404).json({
          error: {
            code: 'MODULE_NOT_FOUND',
            message: 'Module not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      if (module.status !== 'approved') {
        res.status(400).json({
          error: {
            code: 'MODULE_NOT_AVAILABLE',
            message: 'Module is not available for activation',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Check if bot exists and belongs to the user
      const bot = await BotModel.findById(bot_id);
      if (!bot) {
        res.status(404).json({
          error: {
            code: 'BOT_NOT_FOUND',
            message: 'Bot not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      if (bot.user_id !== userId) {
        res.status(403).json({
          error: {
            code: 'ACCESS_DENIED',
            message: 'You do not have permission to activate modules for this bot',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Check if module is already activated for this bot
      const existingActivation = await BotModuleActivationModel.findByBotAndModule(bot_id, moduleId);
      if (existingActivation) {
        res.status(409).json({
          error: {
            code: 'MODULE_ALREADY_ACTIVATED',
            message: 'Module is already activated for this bot',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Create activation
      const activation = await BotModuleActivationModel.create({
        bot_id,
        module_id: moduleId,
        markup_percentage: markup_percentage || 0,
        settings: settings || {},
        expires_at
      });

      res.status(201).json({
        success: true,
        data: {
          activation: {
            id: activation.id,
            bot_id: activation.bot_id,
            module_id: activation.module_id,
            markup_percentage: activation.markup_percentage,
            api_key: activation.api_key,
            status: activation.status,
            settings: activation.settings,
            activated_at: activation.activated_at,
            expires_at: activation.expires_at,
            module_name: module.name,
            module_description: module.description,
            module_category: module.category,
            module_price: module.price
          }
        }
      });
    } catch (error: any) {
      console.error('Error activating module:', error);
      
      if (error.message.includes('Module is already activated')) {
        res.status(409).json({
          error: {
            code: 'MODULE_ALREADY_ACTIVATED',
            message: error.message,
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      if (error.message.includes('Bot or module not found')) {
        res.status(404).json({
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: error.message,
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to activate module',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * PUT /modules/:id/settings - Update module activation settings
   */
  static async updateModuleSettings(req: Request, res: Response): Promise<void> {
    try {
      const { id: activationId } = req.params;
      const userId = (req as any).user?.id;

      if (!activationId) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Activation ID is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      if (!userId) {
        res.status(401).json({
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Get activation
      const activation = await BotModuleActivationModel.findById(activationId);
      if (!activation) {
        res.status(404).json({
          error: {
            code: 'ACTIVATION_NOT_FOUND',
            message: 'Module activation not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Check if bot belongs to the user
      const bot = await BotModel.findById(activation.bot_id);
      if (!bot || bot.user_id !== userId) {
        res.status(403).json({
          error: {
            code: 'ACCESS_DENIED',
            message: 'You do not have permission to modify this activation',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Update activation
      const updatedActivation = await BotModuleActivationModel.update(activationId, req.body);

      res.status(200).json({
        success: true,
        data: {
          activation: updatedActivation
        }
      });
    } catch (error: any) {
      console.error('Error updating module settings:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update module settings',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * DELETE /modules/:id/deactivate - Deactivate a module
   */
  static async deactivateModule(req: Request, res: Response): Promise<void> {
    try {
      const { id: activationId } = req.params;
      const userId = (req as any).user?.id;

      if (!activationId) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Activation ID is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      if (!userId) {
        res.status(401).json({
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Get activation
      const activation = await BotModuleActivationModel.findById(activationId);
      if (!activation) {
        res.status(404).json({
          error: {
            code: 'ACTIVATION_NOT_FOUND',
            message: 'Module activation not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Check if bot belongs to the user
      const bot = await BotModel.findById(activation.bot_id);
      if (!bot || bot.user_id !== userId) {
        res.status(403).json({
          error: {
            code: 'ACCESS_DENIED',
            message: 'You do not have permission to deactivate this module',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Deactivate module
      const deactivatedModule = await BotModuleActivationModel.deactivate(activationId);

      res.status(200).json({
        success: true,
        data: {
          activation: deactivatedModule
        }
      });
    } catch (error: any) {
      console.error('Error deactivating module:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to deactivate module',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * GET /modules/activations - Get user's module activations
   */
  static async getUserActivations(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const page = parseInt(req.query['page'] as string) || 1;
      const limit = parseInt(req.query['limit'] as string) || 20;
      const botId = req.query['bot_id'] as string;
      const status = req.query['status'] as string;

      const filters = {
        user_id: userId,
        page,
        limit,
        ...(botId && { bot_id: botId }),
        ...(status && { status: status as any })
      };

      const result = await BotModuleActivationModel.list(filters);

      res.status(200).json({
        success: true,
        data: {
          activations: result.activations,
          pagination: {
            page,
            limit,
            total: result.total,
            totalPages: Math.ceil(result.total / limit)
          }
        }
      });
    } catch (error: any) {
      console.error('Error fetching user activations:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch module activations',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * POST /modules/:id/regenerate-key - Regenerate API key for activation
   */
  static async regenerateApiKey(req: Request, res: Response): Promise<void> {
    try {
      const { id: activationId } = req.params;
      const userId = (req as any).user?.id;

      if (!activationId) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Activation ID is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      if (!userId) {
        res.status(401).json({
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Get activation
      const activation = await BotModuleActivationModel.findById(activationId);
      if (!activation) {
        res.status(404).json({
          error: {
            code: 'ACTIVATION_NOT_FOUND',
            message: 'Module activation not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Check if bot belongs to the user
      const bot = await BotModel.findById(activation.bot_id);
      if (!bot || bot.user_id !== userId) {
        res.status(403).json({
          error: {
            code: 'ACCESS_DENIED',
            message: 'You do not have permission to regenerate API key for this activation',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Regenerate API key
      const updatedActivation = await BotModuleActivationModel.regenerateApiKey(activationId);

      res.status(200).json({
        success: true,
        data: {
          activation: updatedActivation
        }
      });
    } catch (error: any) {
      console.error('Error regenerating API key:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to regenerate API key',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * POST /modules/upload - Upload a new module (for developers)
   */
  static async uploadModule(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;

      if (!userId) {
        res.status(401).json({
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Check if user has developer role
      if (userRole !== 'developer' && userRole !== 'admin') {
        res.status(403).json({
          error: {
            code: 'ACCESS_DENIED',
            message: 'Only developers can upload modules',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Validate request body
      const { error, value } = createModuleSchema.validate({
        ...req.body,
        developer_id: userId
      });

      if (error) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.details[0]?.message || 'Invalid input',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Create module with pending status
      const moduleData = {
        ...value,
        status: 'pending' as const,
        developer_id: userId
      };

      const module = await ModuleModel.create(moduleData);

      res.status(201).json({
        success: true,
        data: {
          module: {
            id: module.id,
            name: module.name,
            description: module.description,
            category: module.category,
            price: module.price,
            status: module.status,
            code_url: module.code_url,
            documentation_url: module.documentation_url,
            api_endpoints: module.api_endpoints,
            webhook_required: module.webhook_required,
            created_at: module.created_at
          }
        },
        message: 'Module uploaded successfully and is pending approval'
      });
    } catch (error: any) {
      console.error('Error uploading module:', error);
      
      if (error.message.includes('Developer not found')) {
        res.status(404).json({
          error: {
            code: 'DEVELOPER_NOT_FOUND',
            message: error.message,
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to upload module',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * GET /modules/my-modules - Get developer's modules
   */
  static async getDeveloperModules(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;

      if (!userId) {
        res.status(401).json({
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Check if user has developer role
      if (userRole !== 'developer' && userRole !== 'admin') {
        res.status(403).json({
          error: {
            code: 'ACCESS_DENIED',
            message: 'Only developers can access this endpoint',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const page = parseInt(req.query['page'] as string) || 1;
      const limit = parseInt(req.query['limit'] as string) || 20;
      const status = req.query['status'] as string;

      const filters = {
        developer_id: userId,
        page,
        limit,
        ...(status && { status: status as any })
      };

      const result = await ModuleModel.list(filters);

      res.status(200).json({
        success: true,
        data: {
          modules: result.modules,
          pagination: {
            page,
            limit,
            total: result.total,
            totalPages: Math.ceil(result.total / limit)
          }
        }
      });
    } catch (error: any) {
      console.error('Error fetching developer modules:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch developer modules',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * PUT /modules/:id - Update module (for developers)
   */
  static async updateModule(req: Request, res: Response): Promise<void> {
    try {
      const { id: moduleId } = req.params;
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;

      if (!moduleId) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Module ID is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      if (!userId) {
        res.status(401).json({
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Get module
      const module = await ModuleModel.findById(moduleId);
      if (!module) {
        res.status(404).json({
          error: {
            code: 'MODULE_NOT_FOUND',
            message: 'Module not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Check permissions - only module developer or admin can update
      if (module.developer_id !== userId && userRole !== 'admin') {
        res.status(403).json({
          error: {
            code: 'ACCESS_DENIED',
            message: 'You do not have permission to update this module',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Validate update data
      const { error, value } = updateModuleSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.details[0]?.message || 'Invalid input',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // If developer is updating, reset status to pending (except for admin)
      const updateData = { ...value };
      if (userRole !== 'admin' && Object.keys(updateData).length > 0) {
        updateData.status = 'pending';
      }

      const updatedModule = await ModuleModel.update(moduleId, updateData);

      res.status(200).json({
        success: true,
        data: {
          module: updatedModule
        },
        message: userRole !== 'admin' ? 'Module updated and is pending approval' : 'Module updated successfully'
      });
    } catch (error: any) {
      console.error('Error updating module:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update module',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * DELETE /modules/:id - Delete module (for developers)
   */
  static async deleteModule(req: Request, res: Response): Promise<void> {
    try {
      const { id: moduleId } = req.params;
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;

      if (!moduleId) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Module ID is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      if (!userId) {
        res.status(401).json({
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Get module
      const module = await ModuleModel.findById(moduleId);
      if (!module) {
        res.status(404).json({
          error: {
            code: 'MODULE_NOT_FOUND',
            message: 'Module not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Check permissions - only module developer or admin can delete
      if (module.developer_id !== userId && userRole !== 'admin') {
        res.status(403).json({
          error: {
            code: 'ACCESS_DENIED',
            message: 'You do not have permission to delete this module',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Check if module has active activations
      const activations = await BotModuleActivationModel.findByModuleId(moduleId);
      const activeActivations = activations.filter(a => a.status === 'active');
      
      if (activeActivations.length > 0) {
        res.status(409).json({
          error: {
            code: 'MODULE_IN_USE',
            message: 'Cannot delete module with active installations',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Delete module
      const deleted = await ModuleModel.delete(moduleId);
      if (!deleted) {
        res.status(500).json({
          error: {
            code: 'DELETE_FAILED',
            message: 'Failed to delete module',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Module deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting module:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete module',
          timestamp: new Date().toISOString()
        }
      });
    }
  }
}