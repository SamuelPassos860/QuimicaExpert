import { Router } from 'express';
import { listCompounds, saveCompound } from '../services/compounds.ts';
import type { CompoundUpsertBody } from '../types/chemistry.ts';
import { getSearchTerm } from '../utils/http.ts';
import { validateCompoundUpsert } from '../validators/compounds.ts';

const router = Router();

router.get('/', async (request, response) => {
  const search = getSearchTerm(request.query.search);

  try {
    const compounds = await listCompounds(search);
    response.json({ compounds });
  } catch (error) {
    console.error('Failed to query compounds table:', error);
    response.status(500).json({ error: 'Failed to query compounds table.' });
  }
});

router.post('/', async (request, response) => {
  const validation = validateCompoundUpsert((request.body ?? {}) as CompoundUpsertBody);

  if (validation.error) {
    response.status(400).json({ error: validation.error });
    return;
  }

  try {
    const compound = await saveCompound(validation.data!);
    response.status(201).json({ compound });
  } catch (error) {
    console.error('Failed to save compound:', error);
    response.status(500).json({ error: 'Failed to save compound.' });
  }
});

export default router;
