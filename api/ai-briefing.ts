export default function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  
  res.status(200).json({
    text: "Good morning! StockSmart AI operations monitor is active. Real-time retail inventory synchronization is online. Check near-expiry batches to trigger dynamic clearances and maintain optimal shelf availability.",
    generatedAt: new Date().toISOString()
  });
}
