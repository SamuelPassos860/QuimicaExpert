import { Router } from 'express';
import { listSpectralData } from '../services/spectral.ts';
import { getSearchTerm } from '../utils/http.ts';

const router = Router();

router.get('/', async (request, response) => {
  const search = getSearchTerm(request.query.search);

  try {
    const spectralData = await listSpectralData(search);
    response.json({ spectralData });
  } catch (error) {
    console.error('Failed to query spectral_data table:', error);
    response.status(500).json({ error: 'Failed to query spectral_data table.' });
  }
});

export default router;
