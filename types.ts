
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

// Database Row Structure (Snake Case)
// Updated to strictly expect Arrays (JSONB) for modern structure
export interface OrderRow {
  id: string;
  order_no?: string; // New field for Order Number
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
}

// Application State Structure (Camel Case)
export interface Order {
  id: string;
  orderNo: string; // New field for Order Number
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
}

export type ViewState = 'LIST' | 'FORM' | 'DETAIL';