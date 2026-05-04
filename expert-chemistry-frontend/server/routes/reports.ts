import { Router } from 'express';
import { createReport, listReports } from '../services/reports.ts';
import type { CreateReportBody } from '../types/reports.ts';
import { getSearchTerm } from '../utils/http.ts';

const router = Router();

router.get('/', async (request, response) => {
  const currentUser = response.locals.currentUser;

  if (!currentUser) {
    response.status(401).json({ error: 'Authentication required.' });
    return;
  }

  try {
    const reports = await listReports(currentUser.id, currentUser.role === 'admin', getSearchTerm(request.query.search));
    response.json({ reports });
  } catch (error) {
    console.error('Failed to list reports:', error);
    response.status(500).json({ error: 'Failed to list reports.' });
  }
});

router.post('/', async (request, response) => {
  const currentUser = response.locals.currentUser;
  const body = (request.body ?? {}) as CreateReportBody;

  if (!currentUser) {
    response.status(401).json({ error: 'Authentication required.' });
    return;
  }

  if (!body.reportId?.trim() || !body.compoundName?.trim()) {
    response.status(400).json({ error: 'reportId and compoundName are required.' });
    return;
  }

  try {
    const report = await createReport({
      reportId: body.reportId.trim(),
      ownerUserId: currentUser.id,
      ownerUserIdentifier: currentUser.userId,
      ownerFullName: currentUser.fullName,
      compoundName: body.compoundName.trim(),
      casId: body.casId?.trim() || 'N/A',
      lambdaMax: body.lambdaMax?.trim() || 'N/A',
      source: body.source?.trim() || 'Manual',
      epsilonValue: Number(body.epsilonValue ?? 0),
      pathLengthValue: Number(body.pathLengthValue ?? 0),
      concentrationValue: Number(body.concentrationValue ?? 0),
      absorbance: Number(body.absorbance ?? 0),
      generatedAt: body.generatedAt?.trim() || new Date().toISOString()
    });

    response.status(201).json({ report });
  } catch (error) {
    console.error('Failed to create report snapshot:', error);
    response.status(500).json({ error: 'Failed to create report snapshot.' });
  }
});

export default router;
