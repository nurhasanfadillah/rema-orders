
export enum OrderStatus {
  PROCESSING = 'Diproses',
  PRINTING = 'Sablon',
  PACKING = 'Packing',
  SHIPPED = 'Dikirim'
}

export interface FileData {
  name: string;
  type: string;
  size: number;
  url: string; // URL from Supabase Storage
  file?: File; // Helper for upload process (not stored in DB JSON)
}

// New Interface for Customers
export interface CustomerRow {
  id: string;
  name: string;
  phone?: string;
  contact?: string;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  contact?: string;
  createdAt: number;
  updatedAt: number;
}

// New Interface for Products
export interface ProductRow {
  id: string;
  product_name: string;
  unit_price?: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  unitPrice?: number;
  createdAt: number;
  updatedAt: number;
}

// Database Row Structure (Snake Case)
// Updated to strictly expect Arrays (JSONB) for modern structure
export interface OrderRow {
  id: string;
  order_no?: string; // New field for Order Number
  customer_id?: string; // Link to customers table
  product_id?: string; // Link to products table

  customer_name: string;
  product_name: string;
  quantity: number;
  description: string;
  preview_image: FileData[] | null;
  design_file: FileData[] | null;
  receipt_file: FileData | null;
  status: string;
  created_at: string;
  updated_at: string;
  // New Fields
  channel?: 'ONLINE' | 'OFFLINE';
  recipient_name?: string;
  recipient_phone?: string;
  address?: string;
  dtf_printed?: boolean;
}

// Application State Structure (Camel Case)
export interface Order {
  id: string;
  orderNo: string; // New field for Order Number
  customerId?: string; // Link to customers table
  productId?: string; // Link to products table
  customerName: string;
  productName: string;
  quantity: number;
  description: string;
  previewImages: FileData[];
  designFiles: FileData[];
  receiptFile: FileData | null;
  status: OrderStatus;
  createdAt: number;
  updatedAt: number;
  // New Fields
  channel: 'ONLINE' | 'OFFLINE';
  recipientName?: string;
  recipientPhone?: string;
  address?: string;
  dtfPrinted: boolean;
}

export type ViewState = 'LIST' | 'FORM' | 'DETAIL' | 'CUSTOMERS' | 'PRODUCTS' | 'RANKING';