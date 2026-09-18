export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      stores: {
        Row: {
          id: string
          owner_id: string
          name: string
          location: string | null
          created_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          location?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          location?: string | null
          created_at?: string
        }
      }
      products: {
        Row: {
          id: string
          store_id: string
          name: string
          category: string
          sku: string
          price: number
          cost: number
          stock_level: number
          reorder_point: number
          is_fresh_product: boolean
          created_at: string
        }
        Insert: {
          id?: string
          store_id: string
          name: string
          category: string
          sku: string
          price?: number
          cost?: number
          stock_level?: number
          reorder_point?: number
          is_fresh_product?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          name?: string
          category?: string
          sku?: string
          price?: number
          cost?: number
          stock_level?: number
          reorder_point?: number
          is_fresh_product?: boolean
          created_at?: string
        }
      }
      sales: {
        Row: {
          id: string
          store_id: string
          product_id: string
          quantity: number
          total_price: number
          channel: string
          sale_date: string
          idempotency_key: string | null
        }
        Insert: {
          id?: string
          store_id: string
          product_id: string
          quantity: number
          total_price: number
          channel?: string
          sale_date?: string
          idempotency_key?: string | null
        }
        Update: {
          id?: string
          store_id?: string
          product_id?: string
          quantity?: number
          total_price?: number
          channel?: string
          sale_date?: string
          idempotency_key?: string | null
        }
      }
      batches: {
        Row: {
          id: string
          store_id: string
          product_id: string
          batch_number: string
          initial_quantity: number
          current_quantity: number
          expiry_date: string
          received_date: string
        }
        Insert: {
          id?: string
          store_id: string
          product_id: string
          batch_number: string
          initial_quantity: number
          current_quantity: number
          expiry_date: string
          received_date?: string
        }
        Update: {
          id?: string
          store_id?: string
          product_id?: string
          batch_number?: string
          initial_quantity?: number
          current_quantity?: number
          expiry_date?: string
          received_date?: string
        }
      }
      forecasts: {
        Row: {
          id: string
          store_id: string
          product_id: string
          predicted_demand_7d: number
          confidence_score: number
          insight: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          product_id: string
          predicted_demand_7d: number
          confidence_score?: number
          insight?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          product_id?: string
          predicted_demand_7d?: number
          confidence_score?: number
          insight?: string | null
          updated_at?: string
        }
      }
      suppliers: {
        Row: {
          id: string
          store_id: string
          name: string
          contact_info: string | null
          reliability_score: number
          created_at: string
        }
        Insert: {
          id?: string
          store_id: string
          name: string
          contact_info?: string | null
          reliability_score?: number
          created_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          name?: string
          contact_info?: string | null
          reliability_score?: number
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          store_id: string
          type: string
          title: string
          message: string
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          store_id: string
          type: string
          title: string
          message: string
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          store_id?: string
          type?: string
          title?: string
          message?: string
          read_at?: string | null
          created_at?: string
        }
      }
      stock_movements: {
        Row: {
          id: string
          store_id: string
          product_id: string
          movement_type: string
          quantity_changed: number
          resulting_quantity: number
          reference_id: string | null
          idempotency_key: string | null
          created_at: string
        }
        Insert: {
          id?: string
          store_id: string
          product_id: string
          movement_type: string
          quantity_changed: number
          resulting_quantity: number
          reference_id?: string | null
          idempotency_key?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          product_id?: string
          movement_type?: string
          quantity_changed?: number
          resulting_quantity?: number
          reference_id?: string | null
          idempotency_key?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      process_sale: {
        Args: {
          p_store_id: string
          p_product_id: string
          p_quantity: number
          p_total_price: number
          p_channel: string
          p_idempotency_key: string
        }
        Returns: Json
      }
      process_stock_adjustment: {
        Args: {
          p_store_id: string
          p_product_id: string
          p_action: string
          p_quantity: number
          p_notes: string
          p_idempotency_key: string
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
