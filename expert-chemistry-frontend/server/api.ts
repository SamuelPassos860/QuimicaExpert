import express from 'express';
import compoundsRouter from './routes/compounds.ts';
import healthRouter from './routes/health.ts';
import spectralRouter from './routes/spectral.ts';

const app = express();

app.use(express.json());
app.use('/api/health', healthRouter);
app.use('/api/compounds', compoundsRouter);
app.use('/api/spectral-data', spectralRouter);

const port = Number(process.env.API_PORT || 3001);

app.listen(port, () => {
  console.log(`Expert Chemistry API listening on http://localhost:${port}`);
});
