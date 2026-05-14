import express from 'express';
import adminRouter from './routes/admin.ts';
import auditRouter from './routes/audit.ts';
import authRouter from './routes/auth.ts';
import compoundsRouter from './routes/compounds.ts';
import dashboardRouter from './routes/dashboard.ts';
import healthRouter from './routes/health.ts';
import { requireAdmin, requireAuth } from './middleware/auth.ts';
import reportsRouter from './routes/reports.ts';
import { initializeAuditSchema } from './services/audit.ts';
import { initializeAuthSchema } from './services/auth.ts';
import { initializeReportsSchema } from './services/reports.ts';
import spectralRouter from './routes/spectral.ts';

let startupPromise: Promise<void> | null = null;

export function initializeServer() {
  if (!startupPromise) {
    startupPromise = Promise.all([
      initializeAuthSchema(),
      initializeAuditSchema(),
      initializeReportsSchema()
    ])
      .then(() => undefined)
      .catch((error) => {
        startupPromise = null;
        throw error;
      });
  }

  return startupPromise;
}

const app = express();

app.set('trust proxy', 1);
app.use(express.json());

app.use((request, response, next) => {
  if (request.path === '/api/health') {
    next();
    return;
  }

  void initializeServer()
    .then(() => next())
    .catch((error) => next(error));
});

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/admin', requireAuth, requireAdmin, adminRouter);
app.use('/api/audit', requireAuth, auditRouter);
app.use('/api/dashboard', requireAuth, dashboardRouter);
app.use('/api/compounds', requireAuth, compoundsRouter);
app.use('/api/reports', requireAuth, reportsRouter);
app.use('/api/spectral-data', requireAuth, spectralRouter);

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled API error:', error);
  response.status(500).json({ error: 'Internal server error.' });
});

export default app;
