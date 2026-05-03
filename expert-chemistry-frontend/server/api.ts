import express from 'express';
import authRouter from './routes/auth.ts';
import compoundsRouter from './routes/compounds.ts';
import healthRouter from './routes/health.ts';
import { initializeAuthSchema } from './services/auth.ts';
import spectralRouter from './routes/spectral.ts';

const app = express();

app.use(express.json());
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/compounds', compoundsRouter);
app.use('/api/spectral-data', spectralRouter);

const port = Number(process.env.API_PORT || 3001);

void initializeAuthSchema().catch((error) => {
  console.error('Failed to initialize auth schema:', error);
});

app.listen(port, () => {
  console.log(`Expert Chemistry API listening on http://localhost:${port}`);
});
