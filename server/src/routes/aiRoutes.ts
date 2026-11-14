import { Router } from 'express';
import { getAIStatus, chatWithAI } from '../controllers/aiController';
import { authMiddleware } from '../middlewares/authMiddleware';

const aiRouter = Router();

aiRouter.get('/status', authMiddleware, getAIStatus);
aiRouter.post('/chat', authMiddleware, chatWithAI);

export default aiRouter;
