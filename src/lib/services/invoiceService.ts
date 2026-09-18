import { supabase } from '../supabase/client';
import { storeService } from './storeService';
import { taxService, TaxComponents } from './taxService';

export interface InvoiceLineItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxableValue: number;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

export interface Invoice {
  id: string;
  storeId: string;
  invoiceNumber: string;
  customerName: string;
  customerContact: string;
  customerGstin: string;
  subtotal: number;
  totalDiscount: number;
  totalTaxable: number;
  totalGst: number;
  grandTotal: number;
  paymentMethod: string;
  salesChannel: string;
  createdAt: string;
  items?: InvoiceLineItem[];
}

export const invoiceService = {
  
  generateInvoiceNumber(): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const seq = (Date.now() % 100000).toString().padStart(5, '0');
    return `INV-${dateStr}-${seq}`;
  },

  /**
   * Retrieves an invoice and its dynamically calculated line items from the `sales` table.
   */
  async getInvoice(invoiceId: string): Promise<Invoice | null> {
    const { data: invoiceData, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoiceData) {
      if (invoiceError?.code === 'PGRST205') {
        throw new Error('Database migration required: The invoices table has not been created yet.');
      }
      return null;
    }

    // Fetch related line items from sales table using the invoice_id linkage
    const { data: salesData, error: salesError } = await supabase
      .from('sales')
      .select('*, products(name, sku, category)')
      .eq('invoice_id', invoiceId);

    if (salesError) {
      console.error('Failed to fetch invoice line items:', salesError);
      throw salesError;
    }

    const items: InvoiceLineItem[] = (salesData || []).map((sale: any) => {
      const unitPrice = sale.total_price / sale.quantity;
      const taxData = taxService.calculateTaxInclusive(sale.total_price, sale.products?.category || '');
      
      return {
        productId: sale.product_id,
        productName: sale.products?.name || 'Unknown',
        sku: sale.products?.sku || 'UNKNOWN',
        quantity: sale.quantity,
        unitPrice: unitPrice,
        discount: 0, // Phase 14 discounts apply at POS level
        taxableValue: taxData.taxableValue,
        gstRate: taxData.gstRate,
        cgst: taxData.cgst,
        sgst: taxData.sgst,
        igst: taxData.igst,
        total: sale.total_price
      };
    });

    return {
      id: invoiceData.id,
      storeId: invoiceData.store_id,
      invoiceNumber: invoiceData.invoice_number,
      customerName: invoiceData.customer_name || 'Not provided',
      customerContact: invoiceData.customer_contact || 'Not provided',
      customerGstin: invoiceData.customer_gstin || 'Not provided',
      subtotal: invoiceData.subtotal,
      totalDiscount: invoiceData.total_discount,
      totalTaxable: invoiceData.total_taxable,
      totalGst: invoiceData.total_gst,
      grandTotal: invoiceData.grand_total,
      paymentMethod: invoiceData.payment_method,
      salesChannel: invoiceData.sales_channel,
      createdAt: invoiceData.created_at,
      items: items
    };
  },

  /**
   * Links freshly generated sales into a new persistent Invoice record.
   */
  async createInvoiceFromSales(
    saleIds: string[], 
    customerInfo: { name: string; contact: string; gstin: string },
    paymentMethod: string,
    channel: string
  ): Promise<string> {
    const storeId = await storeService.getCurrentStoreId();

    // 1. Fetch the exact sales to aggregate the invoice
    const { data: salesData, error: salesError } = await supabase
      .from('sales')
      .select('*, products(category)')
      .in('id', saleIds);

    if (salesError) {
      throw new Error(`Failed to fetch sales for invoice: ${salesError.message}`);
    }

    if (!salesData || salesData.length === 0) {
      throw new Error('No valid sales found to invoice.');
    }

    let grandTotal = 0;
    let totalTaxable = 0;
    let totalGst = 0;

    // 2. Deterministic aggregation utilizing the centralized Tax Engine
    for (const sale of salesData) {
      grandTotal += sale.total_price;
      const taxData = taxService.calculateTaxInclusive(sale.total_price, sale.products?.category || '');
      totalTaxable += taxData.taxableValue;
      totalGst += taxData.gstAmount;
    }

    const subtotal = grandTotal; // Assuming inclusive pricing for now
    const invoiceNumber = this.generateInvoiceNumber();

    // 3. Create the Invoice Record
    const { data: invoiceResult, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        store_id: storeId,
        invoice_number: invoiceNumber,
        customer_name: customerInfo.name || null,
        customer_contact: customerInfo.contact || null,
        customer_gstin: customerInfo.gstin || null,
        subtotal: Number(subtotal.toFixed(2)),
        total_discount: 0,
        total_taxable: Number(totalTaxable.toFixed(2)),
        total_gst: Number(totalGst.toFixed(2)),
        grand_total: Number(grandTotal.toFixed(2)),
        payment_method: paymentMethod,
        sales_channel: channel
      })
      .select('id')
      .single();

    if (invoiceError) {
      if (invoiceError.code === 'PGRST205') {
        throw new Error('Database migration required: The invoices table does not exist yet. Please execute supabase_phase_16_invoices.sql');
      }
      throw new Error(`Failed to generate invoice: ${invoiceError.message}`);
    }

    const invoiceId = invoiceResult.id;

    // 4. Link the Sales to the new Invoice
    const { error: updateError } = await supabase
      .from('sales')
      .update({ invoice_id: invoiceId })
      .in('id', saleIds);

    if (updateError) {
      // If table alters haven't been run, we'll hit this error
      if (updateError.code === 'PGRST204') {
         console.warn('Migration warning: Sales table lacks invoice_id column.');
      } else {
         console.error('Failed to link sales to invoice:', updateError);
      }
    }

    return invoiceId;
  },

  async listInvoices(): Promise<Invoice[]> {
    const storeId = await storeService.getCurrentStoreId();
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === 'PGRST205') return []; // Graceful fail if missing table
      throw error;
    }

    return (data || []).map(row => ({
      id: row.id,
      storeId: row.store_id,
      invoiceNumber: row.invoice_number,
      customerName: row.customer_name || 'Not provided',
      customerContact: row.customer_contact || 'Not provided',
      customerGstin: row.customer_gstin || 'Not provided',
      subtotal: row.subtotal,
      totalDiscount: row.total_discount,
      totalTaxable: row.total_taxable,
      totalGst: row.total_gst,
      grandTotal: row.grand_total,
      paymentMethod: row.payment_method,
      salesChannel: row.sales_channel,
      createdAt: row.created_at
    }));
  }
};
