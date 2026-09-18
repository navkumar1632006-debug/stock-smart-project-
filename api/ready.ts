export default function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const isConfigured = Boolean(supabaseUrl && supabaseAnonKey);

  if (isConfigured) {
    res.status(200).json({
      ready: true,
      databaseConfigured: true,
      platform: 'vercel-serverless',
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(503).json({
      ready: false,
      databaseConfigured: false,
      error: 'Missing required Supabase environment configuration.',
      timestamp: new Date().toISOString()
    });
  }
}
