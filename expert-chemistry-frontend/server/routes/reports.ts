import { Router, type Request } from 'express';
import { createReport, deleteReportsByProjectKeys, listReports } from '../services/reports.js';
import type { CreateReportBody } from '../types/reports.js';
import { getSearchTerm } from '../utils/http.js';

const router = Router();

function normalizeReportGeneratedAt(value: string | undefined) {
  const rawValue = value?.trim();
  if (!rawValue) return new Date().toISOString();

  const directDate = new Date(rawValue);
  if (!Number.isNaN(directDate.getTime())) {
    return directDate.toISOString();
  }

  const brazilianDateMatch = rawValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (brazilianDateMatch) {
    const [, day, month, year, hour, minute, second = '0'] = brazilianDateMatch;
    const parsedDate = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    );

    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString();
    }
  }

  return new Date().toISOString();
}

function getProjectKeysFromRequest(request: Request) {
  const body = (request.body ?? {}) as { projectKeys?: unknown; projectKey?: unknown };
  const rawProjectKeys = Array.isArray(body.projectKeys) ? body.projectKeys : [body.projectKey, request.params.projectKey];

  return rawProjectKeys
    .filter((projectKey): projectKey is string => typeof projectKey === 'string')
    .map((projectKey) => projectKey.trim())
    .filter(Boolean);
}

router.delete('/project', async (request, response) => {
  const currentUser = response.locals.currentUser;
  const projectKeys = getProjectKeysFromRequest(request);

  if (!currentUser) {
    response.status(401).json({ error: 'Authentication required.' });
    return;
  }

  if (currentUser.role !== 'admin') {
    response.status(403).json({ error: 'Administrator access required.' });
    return;
  }

  if (!projectKeys.length) {
    response.status(400).json({ error: 'Project key is required.' });
    return;
  }

  try {
    const deletedReports = await deleteReportsByProjectKeys(projectKeys, currentUser.id, true);
    response.json({ deletedReports });
  } catch (error) {
    console.error('Failed to delete report project:', error);
    response.status(500).json({ error: 'Failed to delete report project.' });
  }
});

router.delete('/project/:projectKey', async (request, response) => {
  const currentUser = response.locals.currentUser;
  const projectKeys = getProjectKeysFromRequest(request);

  if (!currentUser) {
    response.status(401).json({ error: 'Authentication required.' });
    return;
  }

  if (currentUser.role !== 'admin') {
    response.status(403).json({ error: 'Administrator access required.' });
    return;
  }

  if (!projectKeys.length) {
    response.status(400).json({ error: 'Project key is required.' });
    return;
  }

  try {
    const deletedReports = await deleteReportsByProjectKeys(projectKeys, currentUser.id, true);
    response.json({ deletedReports });
  } catch (error) {
    console.error('Failed to delete report project:', error);
    response.status(500).json({ error: 'Failed to delete report project.' });
  }
});

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
      projectId: body.projectId?.trim() || '',
      projectName: body.projectName?.trim() || '',
      ownerUserId: currentUser.id,
      ownerUserIdentifier: currentUser.userId,
      ownerFullName: currentUser.fullName,
      compoundName: body.compoundName.trim(),
      casId: body.casId?.trim() || 'N/A',
      lambdaMax: body.lambdaMax?.trim() || 'N/A',
      solvent: body.solvent?.trim() || 'N/A',
      source: body.source?.trim() || 'Manual',
      epsilonValue: Number(body.epsilonValue ?? 0),
      pathLengthValue: Number(body.pathLengthValue ?? 0),
      concentrationValue: Number(body.concentrationValue ?? 0),
      absorbance: Number(body.absorbance ?? 0),
      generatedAt: normalizeReportGeneratedAt(body.generatedAt)
    });

    response.status(201).json({ report });
  } catch (error) {
    console.error('Failed to create report snapshot:', error);
    response.status(500).json({ error: 'Failed to create report snapshot.' });
  }
});

export default router;
