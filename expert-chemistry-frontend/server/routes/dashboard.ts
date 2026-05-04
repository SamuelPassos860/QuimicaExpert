import { Router } from 'express';
import { getDashboardSummary } from '../services/dashboard.ts';

const router = Router();

router.get('/', async (_request, response) => {
  try {
    const currentUser = response.locals.currentUser;

    if (!currentUser) {
      response.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const summary = await getDashboardSummary(currentUser);
    response.json(summary);
  } catch (error) {
    console.error('Failed to load dashboard summary:', error);
    response.status(500).json({ error: 'Failed to load dashboard summary.' });
  }
});

export default router;
