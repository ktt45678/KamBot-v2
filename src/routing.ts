import { Router } from 'express';

import { kamplexarr } from './routes/kamplexarr/kamplexarr.controller';
import { errorHandler, nullRoute } from './middlewares/errors.middleware';

const router: Router = Router();

// Set up routes
router.use('/kamplexarr', kamplexarr);

// Error-handling middleware
router.use(errorHandler);
router.use(nullRoute);

export { router };