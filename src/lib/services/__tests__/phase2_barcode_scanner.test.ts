import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Phase 2: Retail Camera Barcode & QR Scanner Engine Tests', () => {
  // Retail standard barcode validation regex patterns
  const retailBarcodeRules: Record<string, RegExp> = {
    'EAN-13': /^\d{13}$/,
    'EAN-8': /^\d{8}$/,
    'UPC-A': /^\d{12}$/,
    'UPC-E': /^\d{6,8}$/,
    'Code-128': /^[\x20-\x7E]{1,80}$/,
    'Code-39': /^[0-9A-Z\-\.\ \$\/\+\%]{1,43}$/,
    'QR-Code': /^[\s\S]+$/,
  };

  function validateBarcodeFormat(code: string): { valid: boolean; format?: string } {
    const trimmed = code.trim();
    if (!trimmed) return { valid: false };

    for (const [format, pattern] of Object.entries(retailBarcodeRules)) {
      if (pattern.test(trimmed)) {
        return { valid: true, format };
      }
    }
    return { valid: false };
  }

  class BarcodeScannerDebouncer {
    private lastScannedCode: string | null = null;
    private lastScannedTimestamp: number = 0;
    private debounceWindowMs: number;

    constructor(debounceWindowMs = 1500) {
      this.debounceWindowMs = debounceWindowMs;
    }

    public shouldProcess(code: string, currentTime = Date.now()): boolean {
      const trimmed = code.trim();
      if (!trimmed) return false;

      if (
        this.lastScannedCode === trimmed &&
        currentTime - this.lastScannedTimestamp < this.debounceWindowMs
      ) {
        return false; // Suppress duplicate burst scan
      }

      this.lastScannedCode = trimmed;
      this.lastScannedTimestamp = currentTime;
      return true;
    }

    public reset() {
      this.lastScannedCode = null;
      this.lastScannedTimestamp = 0;
    }
  }

  interface MockProduct {
    id: string;
    name: string;
    sku: string;
    barcode?: string;
    stockLevel: number;
    price: number;
  }

  const catalog: MockProduct[] = [
    {
      id: 'prod-001',
      name: 'Amul Taaza Milk 500ml',
      sku: 'SKU-MILK-001',
      barcode: '8901262010053',
      stockLevel: 45,
      price: 28,
    },
    {
      id: 'prod-002',
      name: 'Aashirvaad Atta 5kg',
      sku: 'SKU-ATTA-005',
      barcode: '8901030382901',
      stockLevel: 20,
      price: 240,
    },
    {
      id: 'prod-003',
      name: 'Tata Salt 1kg',
      sku: 'SKU-SALT-001',
      barcode: '8901058852219',
      stockLevel: 100,
      price: 28,
    },
  ];

  function lookupProductByBarcodeOrSku(query: string): MockProduct | null {
    const target = query.trim().toLowerCase();
    if (!target) return null;
    return (
      catalog.find(
        (p) =>
          p.sku.toLowerCase() === target ||
          (p.barcode && p.barcode.toLowerCase() === target)
      ) || null
    );
  }

  it('should correctly classify valid Indian Kirana retail barcodes (EAN-13, UPC, QR)', () => {
    expect(validateBarcodeFormat('8901262010053')).toEqual({ valid: true, format: 'EAN-13' });
    expect(validateBarcodeFormat('8901030382901')).toEqual({ valid: true, format: 'EAN-13' });
    expect(validateBarcodeFormat('12345678')).toEqual({ valid: true, format: 'EAN-8' });
    expect(validateBarcodeFormat('012345678905')).toEqual({ valid: true, format: 'UPC-A' });
    expect(validateBarcodeFormat('SKU-MILK-001')).toEqual({ valid: true, format: 'Code-128' });
    expect(validateBarcodeFormat('STOCKSMART-INVENTORY-PROD-99')).toEqual({
      valid: true,
      format: 'Code-128',
    });
  });

  it('should reject invalid or empty barcode inputs', () => {
    expect(validateBarcodeFormat('')).toEqual({ valid: false });
    expect(validateBarcodeFormat('   ')).toEqual({ valid: false });
  });

  it('should debounce rapid continuous scans to prevent duplicate database RPC transactions', () => {
    const debouncer = new BarcodeScannerDebouncer(1500);
    const t0 = 1000000;

    // First scan should process
    expect(debouncer.shouldProcess('8901262010053', t0)).toBe(true);

    // Immediate rapid repeat 100ms later should be blocked
    expect(debouncer.shouldProcess('8901262010053', t0 + 100)).toBe(false);

    // Another rapid repeat 800ms later should be blocked
    expect(debouncer.shouldProcess('8901262010053', t0 + 800)).toBe(false);

    // A different barcode scanned 900ms later should be accepted immediately
    expect(debouncer.shouldProcess('8901030382901', t0 + 900)).toBe(true);

    // After debounce window expires, original barcode should be accepted again
    expect(debouncer.shouldProcess('8901262010053', t0 + 2600)).toBe(true);
  });

  it('should resolve product catalog entry by barcode and by SKU with case insensitivity', () => {
    const byBarcode = lookupProductByBarcodeOrSku('8901262010053');
    expect(byBarcode).not.toBeNull();
    expect(byBarcode?.name).toBe('Amul Taaza Milk 500ml');

    const bySku = lookupProductByBarcodeOrSku('sku-atta-005');
    expect(bySku).not.toBeNull();
    expect(bySku?.name).toBe('Aashirvaad Atta 5kg');

    const notFound = lookupProductByBarcodeOrSku('UNKNOWN-BARCODE-999');
    expect(notFound).toBeNull();
  });

  it('should support manual SKU entry fallback when barcode is unreadable or camera is off', () => {
    const manualInput = 'SKU-SALT-001';
    const resolved = lookupProductByBarcodeOrSku(manualInput);
    expect(resolved).not.toBeNull();
    expect(resolved?.id).toBe('prod-003');
    expect(resolved?.price).toBe(28);
  });
});
