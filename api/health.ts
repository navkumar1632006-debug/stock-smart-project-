export default function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  
  res.status(200).json({
    status: 'ok',
    architecture: 'supabase',
    environment: process.env.NODE_ENV || 'production',
    platform: 'vercel-serverless',
    timestamp: new Date().toISOString()
  });
}
