/**
 * GET /api/health
 *
 * Health check endpoint.
 * Reports the status of EODHD and Redis cache connections.
 * Useful for debugging deployment issues.
 */

import { checkHealth as checkEODHD } from './_lib/eodhd.js';
import { checkHealth as checkCache } from './_lib/cache.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const [eodhd, cache] = await Promise.all([
    checkEODHD().catch(err => ({
      configured: false,
      reachable: false,
      error: err.message,
    })),
    checkCache().catch(err => ({
      configured: false,
      reachable: false,
      error: err.message,
    })),
  ]);

  const allHealthy = eodhd.reachable && cache.reachable;

  return res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    services: { eodhd, cache },
    timestamp: new Date().toISOString(),
  });
}
