import app, { initializeServer } from './app.ts';

const port = Number(process.env.API_PORT || 3001);

void initializeServer().catch((error) => {
  console.error('Failed to initialize API server:', error);
});

app.listen(port, () => {
  console.log(`Expert Chemistry API listening on http://localhost:${port}`);
});
