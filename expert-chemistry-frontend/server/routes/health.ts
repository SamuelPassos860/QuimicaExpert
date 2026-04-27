import { Router } from 'express';

const router = Router();

router.get('/', (_request, response) => {
  response.json({ ok: true });
});

export default router;
