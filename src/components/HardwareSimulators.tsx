import React, { useState } from 'react';
import { Camera, FileText, Mic, AlertCircle, CheckCircle2, Upload, Search, Volume2, Sparkles, Languages, HelpCircle } from 'lucide-react';
import { Product } from '../types/retail';
import { MobileBridge } from '../lib/mobileBridge';

interface HardwareSimulatorsProps {
  products: Product[];
  onTriggerRefresh: () => void;
  onFilterProducts: (filtered: Product[]) => void;
}

export const HardwareSimulators: React.FC<HardwareSimulatorsProps> = ({ products, onTriggerRefresh, onFilterProducts }) => {
  // Tabs for the simulator
  const [activeSim, setActiveSim] = useState<'shelf' | 'receipt' | 'voice'>('shelf');

  // Shelf Scanner state
  const [isScanningShelf, setIsScanningShelf] = useState(false);
  const [shelfScanResult, setShelfScanResult] = useState<string | null>(null);

  // Receipt Scanner state
  const [isScanningInvoice, setIsScanningInvoice] = useState(false);
  const [invoiceScanResult, setInvoiceScanResult] = useState<any | null>(null);

  // Semantic Voice state
  const [voiceQuery, setVoiceQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceSpeechFeedback, setVoiceSpeechFeedback] = useState<string | null>(null);
  const [voiceLang, setVoiceLang] = useState('en-IN');

  // --- 1. Camera Shelf Scanner Logic ---
  const handleScanShelf = async () => {
    const hasPermission = await MobileBridge.checkCameraPermission();
    if (!hasPermission) {
      await MobileBridge.showToast("Camera permission denied. Cannot scan shelf.", "long");
      return;
    }

    setIsScanningShelf(true);
    setShelfScanResult(null);
    await MobileBridge.triggerHapticFeedback('light');
    
    // Simulate computer vision latency
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    // Detect low-stock items in current inventory mock
    const lowAtta = products.find(p => p.id === 'P003');
    const lowPaneer = products.find(p => p.id === 'P005');
    
    setIsScanningShelf(false);
    setShelfScanResult(
      `🔍 Shelf Vision Analysis Complete:
- Detected Empty Slots in Section C (Staples): Aashirvaad Atta is depleted to only 4 bags.
- Detected Low Stock in Section B (Dairy): Mother Dairy Paneer is down to 18 packs.
- Generated Auto-Reorder recommendation: 40 units of Atta added to ONDC draft!`
    );
    await MobileBridge.triggerHapticFeedback('heavy');
    await MobileBridge.showToast("Shelf Scan Complete: Low stock alert!", "short");
    onTriggerRefresh();
  };

  // --- 2. AI Receipt/Invoice Scanner OCR Logic ---
  const handleUploadInvoice = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsScanningInvoice(true);
    setInvoiceScanResult(null);
    await MobileBridge.triggerHapticFeedback('light');

    // Simulate invoice OCR model extract (XGBoost/LSTM key-value parser)
    await new Promise((resolve) => setTimeout(resolve, 2200));

    const invoiceData = {
      supplier: "Fortune Foods Ltd (Northern Region)",
      invoiceNo: "INV/2026/88921",
      gstin: "06FORT7788A1Z9",
      date: "2026-06-30",
      itemExtracted: "Fortune Mustard Oil 1L Bottle",
      qtyExtracted: 50,
      costExtracted: 155,
      priceExtracted: 175,
      gstExtracted: "₹387.50 (5% IGST)",
      hsnExtracted: "1514"
    };

    try {
      // Automatically post extracted item to store backend catalog
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: invoiceData.itemExtracted,
          category: "Staples",
          sku: "FORT-MUST-1L-NEW",
          price: invoiceData.priceExtracted,
          cost: invoiceData.costExtracted,
          reorderPoint: 15,
          initialQty: invoiceData.qtyExtracted,
          batchNumber: "B-FORT-OCR-99",
          expiryDate: "2026-12-31"
        })
      });

      if (res.ok) {
        setIsScanningInvoice(false);
        setInvoiceScanResult(invoiceData);
        await MobileBridge.triggerHapticFeedback('medium');
        await MobileBridge.showToast("Invoice OCR success! Added to catalog.", "short");
        onTriggerRefresh();
      } else {
        throw new Error("Failed to register parsed invoice catalog entry.");
      }
    } catch (e: any) {
      await MobileBridge.showToast(`OCR registration failed: ${e.message}`, "long");
      setIsScanningInvoice(false);
    }
  };

  // --- 3. Semantic & Multilingual Voice Search Logic ---
  const handleVoiceSearch = (queryStr: string) => {
    const query = (queryStr || voiceQuery).toLowerCase().trim();
    if (!query) return;

    let matched: Product[] = [];

    // Semantic Mapping Rules (converting slang to catalog matches)
    if (query.includes('oil') || query.includes('tel') || query.includes('cooking') || query.includes('mustard')) {
      matched = products.filter(p => p.id === 'P008'); // Fortune Mustard Oil
      setVoiceSpeechFeedback(`Found Fortune Mustard Oil 1L Bottle priced at ₹175.`);
    } else if (query.includes('biscuit') || query.includes('biskut') || query.includes('snack') || query.includes('bhujia')) {
      matched = products.filter(p => p.id === 'P006'); // Haldiram's Bhujia Sev
      setVoiceSpeechFeedback(`Showing Haldiram's Bhujia Sev 350g, ₹110 per pack.`);
    } else if (query.includes('atta') || query.includes('rice') || query.includes('wheat') || query.includes('flour') || query.includes('cheap')) {
      matched = products.filter(p => p.id === 'P003' || p.id === 'P009'); // Aashirvaad Atta, Tata Salt
      setVoiceSpeechFeedback(`Filtering staples: Aashirvaad Atta is ₹460, Tata Salt is ₹28.`);
    } else if (query.includes('milk') || query.includes('doodh') || query.includes('amul')) {
      matched = products.filter(p => p.id === 'P001' || p.id === 'P005'); // Milk, Paneer
      setVoiceSpeechFeedback(`Displaying fresh dairy: Amul Milk 1L is ₹66, Paneer 200g is ₹90.`);
    } else if (query.includes('bread') || query.includes('pav') || query.includes('bakery')) {
      matched = products.filter(p => p.id === 'P002'); // Britannia Bread
      setVoiceSpeechFeedback(`Britannia Sliced Bread is ₹45.`);
    } else if (query.includes('dolo') || query.includes('medicine') || query.includes('fever') || query.includes('tablet')) {
      matched = products.filter(p => p.id === 'P004'); // Dolo 650
      setVoiceSpeechFeedback(`Dolo 650mg is available, ₹34 per strip.`);
    } else {
      // Simple regex search fallback
      matched = products.filter(p => p.name.toLowerCase().includes(query) || p.category.toLowerCase().includes(query));
      setVoiceSpeechFeedback(`Filtered catalog for: "${query}". Found ${matched.length} matching products.`);
    }

    onFilterProducts(matched);
    MobileBridge.triggerHapticFeedback('light');

    // Speak back the response if browser synthesis is active
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(voiceSpeechFeedback || `Found matching items.`);
      utterance.lang = voiceLang;
      window.speechSynthesis.speak(utterance);
    }
  };

  const startVoiceListening = async () => {
    setIsListening(true);
    setVoiceSpeechFeedback(null);
    await MobileBridge.triggerHapticFeedback('light');
    await MobileBridge.showToast("Listening to voice query...", "short");
    
    // Check for native browser Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = voiceLang;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = async (event: any) => {
        const text = event.results[0][0].transcript;
        setVoiceQuery(text);
        await MobileBridge.triggerHapticFeedback('medium');
        handleVoiceSearch(text);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } else {
      // Mock Speech recognition if browser blocks it or iframe limits permissions
      setTimeout(async () => {
        const mockQueries = [
          "red oil bottle",
          "cheap rice",
          "big biscuit",
          "How much milk is left?"
        ];
        const randomQuery = mockQueries[Math.floor(Math.random() * mockQueries.length)];
        setVoiceQuery(randomQuery);
        setIsListening(false);
        await MobileBridge.triggerHapticFeedback('medium');
        handleVoiceSearch(randomQuery);
      }, 1500);
    }
  };

  return (
    <div className="bg-white shadow-sm border border-slate-200 rounded-2xl border border-slate-200/30 rounded-3xl p-6 space-y-4">
      {/* Tab Selectors */}
      <div className="flex border-b border-slate-200/30 pb-2">
        <button
          onClick={() => setActiveSim('shelf')}
          className={`flex-1 pb-2 text-[10.5px] font-semibold uppercase tracking-wide transition-all ${
            activeSim === 'shelf' ? 'border-b-2 border-indigo-500 text-slate-900' : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          📷 Shelf Scanner
        </button>
        <button
          onClick={() => setActiveSim('receipt')}
          className={`flex-1 pb-2 text-[10.5px] font-semibold uppercase tracking-wide transition-all ${
            activeSim === 'receipt' ? 'border-b-2 border-indigo-500 text-slate-900' : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          🧾 Invoice OCR
        </button>
        <button
          onClick={() => setActiveSim('voice')}
          className={`flex-1 pb-2 text-[10.5px] font-semibold uppercase tracking-wide transition-all ${
            activeSim === 'voice' ? 'border-b-2 border-indigo-500 text-slate-900' : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          🎙️ Voice Assistant
        </button>
      </div>

      {/* 1. Camera Shelf Scanner Layout */}
      {activeSim === 'shelf' && (
        <div className="space-y-3">
          <div className="bg-slate-50 border border-slate-200/30 rounded-2xl h-44 flex flex-col items-center justify-center relative overflow-hidden">
            {isScanningShelf ? (
              <div className="space-y-2 text-center z-10">
                <div className="w-8 h-8 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin mx-auto" />
                <p className="text-[10px] font-mono text-indigo-600 font-medium uppercase tracking-wider">AI Computer Vision Scanning...</p>
              </div>
            ) : (
              <div className="text-center z-10 space-y-2">
                <Camera className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-[10px] font-mono text-slate-500/90">Position shop shelf camera towards aisles.</p>
              </div>
            )}
            {/* Mock Camera Scanning lines */}
            {isScanningShelf && (
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent animate-[bounce_2s_infinite]" />
            )}
          </div>

          {shelfScanResult && (
            <div className="bg-indigo-500/10 border border-indigo-200 rounded-2xl p-3.5 text-[10.5px] font-mono text-indigo-600 leading-relaxed">
              {shelfScanResult.split('\n').map((line, idx) => (
                <p key={idx}>{line}</p>
              ))}
            </div>
          )}

          <button
            onClick={handleScanShelf}
            disabled={isScanningShelf}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-slate-900 py-2.5 rounded-2xl text-xs font-semibold uppercase tracking-wider transition"
          >
            {isScanningShelf ? 'Scanning Store Shelf...' : 'Trigger Shelf Vision Scanner'}
          </button>
        </div>
      )}

      {/* 2. AI Receipt/Invoice Scanner Layout */}
      {activeSim === 'receipt' && (
        <div className="space-y-3">
          <div className="border-2 border-dashed border-slate-200/50 rounded-2xl h-44 flex flex-col items-center justify-center p-6 bg-slate-50/20 relative">
            <input
              type="file"
              accept=".pdf,image/*"
              onChange={handleUploadInvoice}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            
            {isScanningInvoice ? (
              <div className="space-y-2 text-center">
                <div className="w-8 h-8 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin mx-auto" />
                <p className="text-[10px] font-mono text-emerald-600 font-medium uppercase tracking-wider">Extracting Invoice Data (OCR)...</p>
              </div>
            ) : (
              <div className="text-center space-y-2 pointer-events-none">
                <Upload className="w-7 h-7 text-slate-400 mx-auto" />
                <p className="text-xs font-medium text-slate-700">Drop Wholesale Invoice here</p>
                <p className="text-[9.5px] text-slate-400 font-mono">Supports supplier PDFs, image scans. Auto-calculates HSN/GST.</p>
              </div>
            )}
          </div>

          {invoiceScanResult && (
            <div className="bg-emerald-500/10 border border-emerald-200 rounded-2xl p-3.5 text-[10.5px] font-mono text-emerald-600 space-y-1.5">
              <div className="flex items-center space-x-1.5 font-medium border-b border-emerald-200 pb-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>GST OCR EXTRACTION COMPLETE</span>
              </div>
              <p>Supplier: <strong className="text-slate-900">{invoiceScanResult.supplier}</strong></p>
              <p>Invoice No: <strong className="text-slate-900">{invoiceScanResult.invoiceNo}</strong></p>
              <p>Product: <strong className="text-slate-900">{invoiceScanResult.itemExtracted}</strong></p>
              <p>Qty Parsed: <strong className="text-slate-900">{invoiceScanResult.qtyExtracted} units</strong></p>
              <p>Cost / Retail: <strong className="text-slate-900">₹{invoiceScanResult.costExtracted} / ₹{invoiceScanResult.priceExtracted}</strong></p>
              <p>GST Extracted: <strong className="text-slate-900">{invoiceScanResult.gstExtracted} (HSN: {invoiceScanResult.hsnExtracted})</strong></p>
              <p className="text-[9px] bg-emerald-500/20 px-2 py-0.5 rounded font-medium uppercase w-fit text-emerald-600 mt-2">Added to Store Catalog!</p>
            </div>
          )}
        </div>
      )}

      {/* 3. Semantic & Multilingual Voice Search Layout */}
      {activeSim === 'voice' && (
        <div className="space-y-3 font-mono">
          <div className="flex items-center justify-between text-[10px] text-slate-500/90 border-b border-slate-200/30 pb-2">
            <span className="flex items-center"><Languages className="w-3.5 h-3.5 mr-1 text-indigo-600" /> Regional Language</span>
            <select
              value={voiceLang}
              onChange={e => setVoiceLang(e.target.value)}
              className="bg-slate-50 border border-slate-200/30 text-slate-700 rounded text-[9.5px] p-1 cursor-pointer focus:outline-none"
            >
              <option value="en-IN">English (India)</option>
              <option value="hi-IN">हिन्दी (Hindi)</option>
              <option value="ta-IN">தமிழ் (Tamil)</option>
              <option value="te-IN">తెలుగు (Telugu)</option>
              <option value="kn-IN">ಕನ್ನಡ (Kannada)</option>
              <option value="ml-IN">മലയാളം (Malayalam)</option>
            </select>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ask: 'big biscuit' or 'red oil bottle'..."
              value={voiceQuery}
              onChange={e => setVoiceQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleVoiceSearch('')}
              className="flex-1 bg-slate-50 border border-slate-200/30 focus:border-indigo-200 rounded-2xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none"
            />
            <button
              onClick={startVoiceListening}
              disabled={isListening}
              className={`p-2.5 rounded-2xl border transition ${
                isListening 
                  ? 'bg-rose-600/20 border-rose-200 text-rose-600 animate-pulse'
                  : 'bg-indigo-600 border-indigo-500 hover:bg-indigo-500 text-slate-900 shadow-md'
              }`}
            >
              <Mic className="w-4 h-4" />
            </button>
          </div>

          {/* Quick semantic chip suggestions */}
          <div className="flex flex-wrap gap-1.5">
            {['red oil bottle', 'cheap rice', 'big biscuit', 'dolo tablet'].map((sQuery) => (
              <button
                key={sQuery}
                onClick={() => {
                  setVoiceQuery(sQuery);
                  handleVoiceSearch(sQuery);
                }}
                className="bg-slate-50/80 border border-slate-200/30 hover:bg-white text-slate-500/90 hover:text-slate-900 px-2 py-1 rounded-xl text-[9px] transition"
              >
                "{sQuery}"
              </button>
            ))}
          </div>

          {voiceSpeechFeedback && (
            <div className="bg-indigo-500/10 border border-indigo-200 rounded-2xl p-3 text-[10px] text-indigo-600 flex items-start space-x-2">
              <Volume2 className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
              <span>{voiceSpeechFeedback}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
