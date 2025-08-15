import { Request, Response } from 'express';
import { ModuleModel } from '../models/Module';
import { ModuleRatingModel } from '../models/ModuleRating';
import { moduleFilterSchema } from '../validation/schemas';

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
}