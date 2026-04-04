/**
 * AI proxy route — forwards requests to Groq, keeping the API key server-side.
 *
 * The frontend builds the prompt payload (messages, model, max_tokens, temperature)
 * and sends it to POST /api/ai/groq.  This route adds the Authorization header and
 * forwards to Groq, then streams the response back.
 *
 * Falls back with a 503 when GROQ_API_KEY is not set so the frontend
 * can use its built-in fallback generators.
 */

import { Router } from 'express';

const router = Router();
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

router.post('/ai/groq', async (req, res, next) => {
  try {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      // Tell the frontend to use its fallback generators
      return res.status(503).json({
        error: 'GROQ_API_KEY not configured on server',
        code: 'NO_API_KEY',
      });
    }

    const payload = req.body;

    const upstream = await fetch(GROQ_API_URL, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: data.error?.message || 'Groq API error',
        code:  'GROQ_ERROR',
      });
    }

    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
