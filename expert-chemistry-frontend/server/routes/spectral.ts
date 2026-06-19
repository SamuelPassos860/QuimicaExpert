import { Router } from 'express';
import { createAuditLog } from '../services/audit.js';
import {
  listSpectralData,
  listSpectrophotometerRuns,
  parseSpectrophotometerPayload,
  saveSpectrophotometerRun
} from '../services/spectral.js';
import type { SpectrophotometerPayload } from '../types/chemistry.js';
import { getSearchTerm } from '../utils/http.js';

const router = Router();

router.get('/runs', async (request, response) => {
  const search = getSearchTerm(request.query.search);
  const limit = Number(request.query.limit || 50);

  try {
    const runs = await listSpectrophotometerRuns(search, Number.isFinite(limit) ? limit : 50);
    response.json({ runs });
  } catch (error) {
    console.error('Failed to query spectrophotometer runs:', error);
    response.status(500).json({ error: 'Failed to query spectrophotometer runs.' });
  }
});

router.post('/parse', (request, response) => {
  try {
    const parsed = parseSpectrophotometerPayload((request.body ?? {}) as SpectrophotometerPayload);
    response.json({ parsed });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to parse spectrophotometer payload.';
    response.status(400).json({ error: message });
  }
});

router.post('/ingest', async (request, response) => {
  try {
    const run = await saveSpectrophotometerRun((request.body ?? {}) as SpectrophotometerPayload);
    const currentUser = response.locals.currentUser;

    if (currentUser) {
      await createAuditLog({
        actorUserId: currentUser.id,
        actorUserIdentifier: currentUser.userId,
        actorFullName: currentUser.fullName,
        eventType: 'spectrophotometer_run_ingested',
        resourceType: 'spectrophotometer_run',
        resourceKey: run.id,
        metadata: {
          fileName: run.fileName,
          instrumentName: run.instrumentName,
          parserName: run.parserName,
          compoundName: run.compoundName,
          cas: run.cas,
          solvent: run.solvent,
          peakWavelengthNm: run.peakWavelengthNm,
          peakAbsorbance: run.peakAbsorbance,
          points: run.points.length
        }
      });
    }

    response.status(201).json({ run });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to ingest spectrophotometer payload.';
    response.status(400).json({ error: message });
  }
});

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
