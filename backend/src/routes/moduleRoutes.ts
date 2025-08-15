import { Router } from 'express';
import { ModuleController } from '../controllers/moduleController';

const router = Router();

// Public routes (no authentication required for browsing catalog)
router.get('/catalog', ModuleController.getCatalog);
router.get('/categories', ModuleController.getCategories);
router.get('/popular', ModuleController.getPopularModules);
router.get('/featured', ModuleController.getFeaturedModules);
router.get('/search', ModuleController.searchModules);
router.get('/:id', ModuleController.getModuleById);
router.get('/:id/ratings', ModuleController.getModuleRatings);

// Protected routes will be added in subsequent tasks
// router.use(authenticateToken); // Apply to routes below
// router.post('/:id/activate', ModuleController.activateModule);
// router.post('/upload', ModuleController.uploadModule);

export default router;