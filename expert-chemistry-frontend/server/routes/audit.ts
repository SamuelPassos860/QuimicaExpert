import { Router } from 'express';
import { createAuditLog } from '../services/audit.js';
import type { AnalysisAuditBody } from '../types/audit.js';

const router = Router();

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

router.post('/report-exports', async (request, response) => {
  const currentUser = response.locals.currentUser;

  if (!currentUser) {
    response.status(401).json({ error: 'Authentication required.' });
    return;
  }

  response.status(204).send();
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
  const workflow = normalizeText(body.workflow);
  const projectId = normalizeText(body.projectId);
  const projectName = normalizeText(body.projectName);
  const methodId = normalizeText(body.methodId);
  const methodName = normalizeText(body.methodName);
  const stepDescription = normalizeText(body.stepDescription);
  const analysisRunId = normalizeText(body.analysisRunId);
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
        action,
        workflow,
        projectId,
        projectName,
        methodId,
        methodName,
        stepDescription,
        analysisRunId
      }
    });

    response.status(201).json({ ok: true });
  } catch (error) {
    console.error('Failed to record analysis audit event:', error);
    response.status(500).json({ error: 'Failed to record analysis audit event.' });
  }
});

export default router;
