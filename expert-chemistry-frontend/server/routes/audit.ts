import { Router } from 'express';
import { createAuditLog } from '../services/audit.ts';
import type { ReportExportAuditBody } from '../types/audit.ts';

const router = Router();

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
      eventType: 'pdf_exported',
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

export default router;
