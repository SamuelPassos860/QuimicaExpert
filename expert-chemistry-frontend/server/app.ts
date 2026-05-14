import express from 'express';
import adminRouter from './routes/admin';
import auditRouter from './routes/audit';
import authRouter from './routes/auth';
import compoundsRouter from './routes/compounds';
import dashboardRouter from './routes/dashboard';
import healthRouter from './routes/health';
import { requireAdmin, requireAuth } from './middleware/auth';
import reportsRouter from './routes/reports';
import { initializeAuditSchema } from './services/audit';
import { initializeAuthSchema } from './services/auth';
import { initializeReportsSchema } from './services/reports';
import spectralRouter from './routes/spectral';

let startupPromise: Promise<void> | null = null;
const HEALTH_PATHS = new Set(['/health', '/api/health']);

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
  if (HEALTH_PATHS.has(request.path)) {
    next();
    return;
  }

  void initializeServer()
    .then(() => next())
    .catch((error) => next(error));
});

app.use(['/health', '/api/health'], healthRouter);
app.use(['/auth', '/api/auth'], authRouter);
app.use(['/admin', '/api/admin'], requireAuth, requireAdmin, adminRouter);
app.use(['/audit', '/api/audit'], requireAuth, auditRouter);
app.use(['/dashboard', '/api/dashboard'], requireAuth, dashboardRouter);
app.use(['/compounds', '/api/compounds'], requireAuth, compoundsRouter);
app.use(['/reports', '/api/reports'], requireAuth, reportsRouter);
app.use(['/spectral-data', '/api/spectral-data'], requireAuth, spectralRouter);

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled API error:', error);
  response.status(500).json({ error: 'Internal server error.' });
});

export default app;
