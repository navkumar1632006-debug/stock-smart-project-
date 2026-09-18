import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, X, Check, Search, Plus, Minus, ScanBarcode, Box } from 'lucide-react';
import { Product } from '../types/retail';

interface BarcodeScannerProps {
  products: Product[];
  onScanResult: (product: Product, action: 'add' | 'deduct', quantity: number) => Promise<void>;
  onClose: () => void;
}

export function BarcodeScanner({ products, onScanResult, onClose }: BarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(true);
  const [scannedSku, setScannedSku] = useState<string | null>(null);
  const [matchedProduct, setMatchedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraError, setCameraError] = useState('');
  
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const startScanner = async () => {
    setCameraError('');
    try {
       const html5QrCode = new Html5Qrcode("reader", {
         verbose: false,
         formatsToSupport: [ 
           Html5QrcodeSupportedFormats.QR_CODE, 
           Html5QrcodeSupportedFormats.UPC_A, 
           Html5QrcodeSupportedFormats.EAN_13, 
           Html5QrcodeSupportedFormats.CODE_128 
         ]
       });
       scannerRef.current = html5QrCode;
       
       await html5QrCode.start(
         { facingMode: "environment" },
         {
           fps: 10,
           qrbox: { width: 250, height: 250 }
         },
         (decodedText) => {
           handleScanSuccess(decodedText);
         },
         (errorMessage) => {
           // Handle silent failures
         }
       );
    } catch (err: any) {
      setCameraError(err.message || 'Unable to access camera. Please check permissions.');
    }
  };

  useEffect(() => {
    startScanner();
    
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const handleScanSuccess = async (sku: string) => {
    if (!isScanning) return;
    
    if (scannerRef.current && scannerRef.current.isScanning) {
      await scannerRef.current.stop();
    }
    setIsScanning(false);
    
    const product = products.find(p => p.sku === sku || p.id === sku || p.name.includes(sku));
    setScannedSku(sku);
    setMatchedProduct(product || null);
  };
  
  const handleAction = async (action: 'add' | 'deduct') => {
    if (!matchedProduct) return;
    setIsProcessing(true);
    await onScanResult(matchedProduct, action, quantity);
    setIsProcessing(false);
    onClose();
  };
  
  const resumeScanning = async () => {
    setScannedSku(null);
    setMatchedProduct(null);
    setQuantity(1);
    setIsScanning(true);
    
    if (scannerRef.current) {
      try {
        await scannerRef.current.start(
           { facingMode: "environment" },
           { fps: 10, qrbox: { width: 250, height: 250 } },
           (decodedText) => handleScanSuccess(decodedText),
           () => {}
         );
      } catch(e) {
         console.error(e);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-50 border border-slate-200/50 rounded-3xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200/50 bg-white shadow-sm border border-slate-200 rounded-2xl">
          <div className="flex items-center space-x-2">
            <ScanBarcode className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-medium text-slate-900">Scan QR / Barcode</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-500/90 hover:text-slate-900 transition rounded-full hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 flex flex-col items-center relative">
          
          {isScanning ? (
            <div className="w-full flex flex-col items-center">
              <div id="reader" className={`w-full max-w-sm rounded-2xl overflow-hidden shadow-inner bg-black ${cameraError ? 'hidden' : ''}`}></div>
              {cameraError ? (
                <div className="flex flex-col items-center w-full space-y-4">
                  <div className="text-xs text-rose-600 font-mono text-center bg-rose-50 p-3 rounded-2xl border border-rose-200 w-full">
                    {cameraError}
                  </div>
                  <button onClick={startScanner} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-2xl text-xs font-medium transition">
                    Retry Camera
                  </button>
                  <div className="w-full mt-6 bg-white shadow-sm border border-slate-200 rounded-2xl p-6 rounded-2xl border border-slate-200/50">
                     <p className="text-xs font-medium text-slate-700 mb-2">Manual Barcode Entry</p>
                     <div className="flex space-x-2">
                       <input 
                         type="text" 
                         placeholder="Enter SKU or Barcode..."
                         className="flex-1 bg-slate-50 border border-slate-200/50 rounded-2xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-200"
                         onKeyDown={(e) => {
                           if (e.key === 'Enter') {
                              handleScanSuccess(e.currentTarget.value);
                           }
                         }}
                         id="manual-barcode-input"
                       />
                       <button 
                         onClick={() => {
                           const val = (document.getElementById('manual-barcode-input') as HTMLInputElement)?.value;
                           if (val) handleScanSuccess(val);
                         }}
                         className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-slate-900 rounded-2xl text-xs font-medium transition shadow-lg shadow-indigo-500/20"
                       >
                         Submit
                       </button>
                     </div>
                  </div>
                </div>
              ) : (
                <p className="mt-6 text-xs text-slate-500/90 font-mono text-center max-w-xs">
                  Align the barcode within the frame. Scanning is automatic.
                </p>
              )}
            </div>
          ) : (
            <div className="w-full animate-fade-in flex flex-col items-center">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-200 rounded-full flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-emerald-600" />
              </div>
              
              <h4 className="text-lg font-semibold text-slate-900 mb-1">Code Scanned</h4>
              <p className="text-xs text-slate-500/90 font-mono mb-6 bg-white px-3 py-1 rounded-xl border border-slate-200/50">
                {scannedSku}
              </p>

              {matchedProduct ? (
                <div className="w-full bg-white border border-slate-200/50 rounded-2xl p-6 mb-6">
                  <div className="flex items-start justify-between border-b border-slate-200/50 pb-3 mb-3">
                    <div>
                      <h5 className="text-sm font-medium text-slate-800">{matchedProduct.name}</h5>
                      <span className="text-[10px] bg-indigo-500/10 text-indigo-600 px-2 py-0.5 rounded uppercase tracking-wider font-semibold">
                        {matchedProduct.category}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500/90">Current Stock</p>
                      <p className="text-lg font-semibold text-slate-900">{matchedProduct.stockLevel}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                     <span className="text-xs font-mono text-slate-500/90">Quantity to Adjust</span>
                     <div className="flex items-center space-x-3 bg-slate-50 p-1 rounded-2xl border border-slate-200/50">
                        <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-1.5 text-slate-500/90 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition">
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="text-sm font-semibold w-8 text-center">{quantity}</span>
                        <button onClick={() => setQuantity(quantity + 1)} className="p-1.5 text-slate-500/90 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition">
                          <Plus className="w-4 h-4" />
                        </button>
                     </div>
                  </div>
                </div>
              ) : (
                <div className="w-full bg-rose-50 border border-rose-200 rounded-2xl p-6 mb-6 text-center">
                  <p className="text-xs font-medium text-rose-600 mb-1">Product Not Found</p>
                  <p className="text-[10px] text-slate-500/90 font-mono">This SKU doesn't exist in the local catalog.</p>
                </div>
              )}

              <div className="w-full grid grid-cols-2 gap-3">
                <button 
                  disabled={!matchedProduct || isProcessing}
                  onClick={() => handleAction('deduct')}
                  className="py-3 bg-rose-500 hover:bg-rose-400 disabled:bg-slate-100 disabled:text-slate-400 text-slate-900 rounded-2xl text-xs font-semibold uppercase tracking-wider transition shadow-lg shadow-rose-500/20"
                >
                  {isProcessing ? 'Wait...' : 'Deduct Stock'}
                </button>
                <button 
                  disabled={!matchedProduct || isProcessing}
                  onClick={() => handleAction('add')}
                  className="py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-100 disabled:text-slate-400 text-slate-900 rounded-2xl text-xs font-semibold uppercase tracking-wider transition shadow-lg shadow-emerald-500/20"
                >
                  {isProcessing ? 'Wait...' : 'Add Stock'}
                </button>
              </div>

              <button 
                onClick={resumeScanning}
                className="mt-4 text-[10px] font-medium uppercase tracking-wider text-slate-500/90 hover:text-slate-900 flex items-center space-x-1"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Scan Another</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
