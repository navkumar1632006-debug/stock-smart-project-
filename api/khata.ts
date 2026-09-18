let khataStore: any[] = [];

export default function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  
  if (req.method === 'POST') {
    const { customerName, customerPhone, amountOwed } = req.body || {};
    if (!customerName || !customerPhone || !amountOwed) {
      return res.status(400).json({ error: 'Missing required ledger fields.' });
    }
    const newEntry = {
      id: `khata-${Date.now()}`,
      customerName,
      customerPhone,
      amountOwed: Number(amountOwed),
      createdAt: new Date().toISOString()
    };
    khataStore.unshift(newEntry);
    return res.status(201).json(newEntry);
  }

  res.status(200).json(khataStore);
}
