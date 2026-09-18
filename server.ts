import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import compression from 'compression';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

dotenv.config();

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);

  const port = 3000;

  // Security: Enable Cross-Origin Resource Sharing
  app.use(cors({
    origin: process.env.APP_URL || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control']
  }));

  // Security: Rate limiting to prevent brute-force and DDoS
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // Limit each IP to 200 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false, default: true },
    message: { error: 'Too many requests, please try again later.' }
  });

  // Apply rate limiter specifically to API routes
  app.use('/api/', apiLimiter);

  // Performance: Enable response compression for JSON endpoints and static files
  app.use(compression());
  app.use(express.json({ limit: '10mb' })); // Security: Limit JSON payload size

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', architecture: 'supabase' });
  });

  // Note: All mock data endpoints have been removed as part of Phase 3C.
  // The frontend will now communicate directly with Supabase, or through dedicated ML microservices.

  // ---------------------------------------------------------------------------
  // Vite integration for SPA serving
  // ---------------------------------------------------------------------------
  
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, '../dist/client')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, '../dist/client', 'index.html'));
    });
  } else {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.warn("Vite not found, running in API-only mode");
    }
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`[Phase 3] Server running on port ${port} - Mock data removed`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server", err);
});
