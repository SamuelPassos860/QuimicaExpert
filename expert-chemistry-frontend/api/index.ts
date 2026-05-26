import app from '../server/app.js';

export default function handler(request: Parameters<typeof app>[0], response: Parameters<typeof app>[1]) {
  return app(request, response);
}
