/**
 * RxGuard Express backend — Phase 1
 *
 * Start:   node server/index.js
 * Or:      npm run server
 * With UI: npm run dev:full
 *
 * Environment variables (set in .env or shell):
 *   GROQ_API_KEY   — server-side Groq key (no VITE_ prefix)
 *   PORT           — optional, defaults to 3001
 */

// Load .env if present (gracefully ignored if file does not exist)
import { config } from 'dotenv';
config();

import express from 'express';
import cors    from 'cors';

import safetyRouter          from './routes/safety.js';
import interactionsRouter    from './routes/interactions.js';
import renalRouter           from './routes/renalDosing.js';
import aiRouter              from './routes/ai.js';
import drugsRouter           from './routes/drugs.js';
import recommendationsRouter from './routes/recommendations.js';
import antibiogramRouter     from './routes/antibiogram.js';
import fhirRouter            from './routes/fhir.js';
import { errorHandler }      from './middleware/errorHandler.js';

const app  = express();
const PORT = process.env.PORT || 3001;

// ── middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    'http://localhost:5173',  // Vite default
    'http://localhost:4173',  // Vite preview
    'http://localhost:3000',
  ],
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

// ── routes ────────────────────────────────────────────────────────────────────
app.use('/api', safetyRouter);
app.use('/api', interactionsRouter);
app.use('/api', renalRouter);
app.use('/api', aiRouter);
app.use('/api', drugsRouter);
app.use('/api', recommendationsRouter);
app.use('/api', antibiogramRouter);
app.use('/api', fhirRouter);

// ── health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0-phase2a' });
});

// ── error handler (must be last) ──────────────────────────────────────────────
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`RxGuard backend listening on http://localhost:${PORT}`);
  console.log(`  GROQ_API_KEY:   ${process.env.GROQ_API_KEY ? 'set ✓' : 'not set (AI fallbacks will be used)'}`);
  console.log(`  FHIR_BASE_URL:  ${process.env.FHIR_BASE_URL || 'https://hapi.fhir.org/baseR4 (default)'}`);
  console.log(`  FHIR_AUTH_TOKEN: ${process.env.FHIR_AUTH_TOKEN ? 'set ✓' : 'not set (unauthenticated)'}`);
});
