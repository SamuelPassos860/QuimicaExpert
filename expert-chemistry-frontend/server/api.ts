import adminRouter from './routes/admin.ts';
import express from 'express';
import authRouter from './routes/auth.ts';
import { requireAdmin, requireAuth } from './middleware/auth.ts';
import compoundsRouter from './routes/compounds.ts';
import healthRouter from './routes/health.ts';
import { initializeAuthSchema } from './services/auth.ts';
import spectralRouter from './routes/spectral.ts';

const app = express();

app.use(express.json());
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/admin', requireAuth, requireAdmin, adminRouter);
app.use('/api/compounds', requireAuth, compoundsRouter);
app.use('/api/spectral-data', requireAuth, spectralRouter);

const port = Number(process.env.API_PORT || 3001);

void initializeAuthSchema().catch((error) => {
  console.error('Failed to initialize auth schema:', error);
});

app.listen(port, () => {
  console.log(`Expert Chemistry API listening on http://localhost:${port}`);
});
