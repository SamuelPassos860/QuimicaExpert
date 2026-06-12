import { Router } from 'express';
import { createAuditLog } from '../services/audit.js';
import type { AnalysisAuditBody, ReportExportAuditBody } from '../types/audit.js';

const router = Router();

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

router.post('/report-exports', async (request, response) => {
  const currentUser = response.locals.currentUser;
  const body = (request.body ?? {}) as ReportExportAuditBody;

  if (!currentUser) {
    response.status(401).json({ error: 'Authentication required.' });
    return;
  }

  try {
    await createAuditLog({
        actorUserId: currentUser.id,
        actorUserIdentifier: currentUser.userId,
        actorFullName: currentUser.fullName,
        eventType: 'analysis_report_printed',
        resourceType: 'spectrophotometry_report',
      resourceKey: body.casId?.trim() || null,
      metadata: {
        reportId: body.reportId?.trim() || '',
        cas: body.casId?.trim() || 'N/A',
        compoundName: body.compoundName?.trim() || 'Not identified',
        lambdaMax: body.lambdaMax?.trim() || 'N/A',
        source: body.source?.trim() || 'Manual',
        epsilon: Number(body.epsilonValue ?? 0),
        pathLength: Number(body.pathLengthValue ?? 0),
        concentration: Number(body.concentrationValue ?? 0),
        absorbance: Number(body.absorbance ?? 0),
        generatedAt: body.generatedAt?.trim() || '',
        generatedByName: body.generatedByName?.trim() || currentUser.fullName,
        generatedByUserId: body.generatedByUserId?.trim() || currentUser.userId
      }
    });

    response.status(201).json({ ok: true });
  } catch (error) {
    console.error('Failed to record PDF export audit log:', error);
    response.status(500).json({ error: 'Failed to record PDF export audit log.' });
  }
});

router.post('/analysis-events', async (request, response) => {
  const currentUser = response.locals.currentUser;
  const body = (request.body ?? {}) as AnalysisAuditBody;

  if (!currentUser) {
    response.status(401).json({ error: 'Authentication required.' });
    return;
  }

  const fieldLabel = normalizeText(body.fieldLabel);
  const fieldKey = normalizeText(body.fieldKey);
  const previousValue = normalizeText(body.previousValue);
  const nextValue = normalizeText(body.nextValue);
  const compoundName = normalizeText(body.compoundName);
  const casId = normalizeText(body.casId);
  const action = body.action === 'cleared' || body.action === 'filled' ? body.action : 'changed';

  if (!fieldLabel || previousValue === nextValue) {
    response.status(400).json({ error: 'A changed analysis field is required.' });
    return;
  }

  try {
    await createAuditLog({
      actorUserId: currentUser.id,
      actorUserIdentifier: currentUser.userId,
      actorFullName: currentUser.fullName,
      eventType: 'analysis_field_changed',
      resourceType: 'analysis',
      resourceKey: casId || compoundName || null,
      metadata: {
        fieldKey,
        fieldLabel,
        previousValue,
        nextValue,
        compoundName: compoundName || 'Not identified',
        cas: casId || 'N/A',
        action
      }
    });

    response.status(201).json({ ok: true });
  } catch (error) {
    console.error('Failed to record analysis audit event:', error);
    response.status(500).json({ error: 'Failed to record analysis audit event.' });
  }
});

export default router;
