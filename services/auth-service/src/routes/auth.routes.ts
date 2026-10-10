import { Router } from 'express';
import { register, login, logout, refresh, switchOrg, me } from '../controllers/auth.controller.js';
import { authenticateUser } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/refresh', refresh);

router.post('/switch-org', authenticateUser, switchOrg);

router.get('/me', authenticateUser, me);

export default router;