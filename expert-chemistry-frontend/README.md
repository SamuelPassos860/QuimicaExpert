
# Run Expert Chemistry

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Add `DATABASE_URL` to the root `.env` file:
   `export DATABASE_URL="postgresql://user:password@host/database?sslmode=require"`
3. In the first terminal, start the frontend:
   `npm run dev`
4. In a second terminal, start the API:
   `npm run dev:api`

The frontend runs on `http://localhost:3000` and proxies `/api` requests to the Express API on `http://localhost:3001`.
The API health check should respond at `http://localhost:3001/api/health`.

If PowerShell blocks npm script execution on your machine, use:
- `cmd /c npm run dev`
- `cmd /c npm run dev:api`

