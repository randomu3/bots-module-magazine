import { Router } from 'express';
import { ModuleController } from '../controllers/moduleController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Public routes (no authentication required for browsing catalog)
router.get('/catalog', ModuleController.getCatalog);
router.get('/categories', ModuleController.getCategories);
router.get('/popular', ModuleController.getPopularModules);
router.get('/featured', ModuleController.getFeaturedModules);
router.get('/search', ModuleController.searchModules);
router.get('/:id', ModuleController.getModuleById);
router.get('/:id/ratings', ModuleController.getModuleRatings);

// Protected routes (authentication required)
router.use(authenticateToken);

// Module activation routes
router.post('/:id/activate', ModuleController.activateModule);
router.put('/activations/:id/settings', ModuleController.updateModuleSettings);
router.delete('/activations/:id/deactivate', ModuleController.deactivateModule);
router.post('/activations/:id/regenerate-key', ModuleController.regenerateApiKey);
router.get('/activations', ModuleController.getUserActivations);

// Module upload and management routes (for developers)
router.post('/upload', ModuleController.uploadModule);
router.get('/my-modules', ModuleController.getDeveloperModules);
router.put('/:id', ModuleController.updateModule);
router.delete('/:id', ModuleController.deleteModule);

export default router;