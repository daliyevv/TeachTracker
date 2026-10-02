// Vercel serverless function entry point.
// Vercel does not run `app.listen()`, so the Express app is exported here and
// every /api/* request is rewritten to this function (see vercel.json).
import app from "../server/app.js";

export default app;
