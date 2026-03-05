import { OrderStatus, Order, OrderRow, FileData } from "./types";

export const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(val);
};

export const formatDate = (dateString: string | number, withTime: boolean = true) => {
  if (!dateString) return '-';
  const date = typeof dateString === 'number' ? new Date(dateString) : new Date(dateString);

  if (isNaN(date.getTime())) return '-';

  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();

  const formattedDate = `${day}/${month}/${year}`;

  if (withTime) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${formattedDate} ${hours}:${minutes}`;
  }

  return formattedDate;
};

export const getStatusColor = (status: OrderStatus) => {
  switch (status) {
    case OrderStatus.PROCESSING:
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case OrderStatus.PRINTING:
      return 'bg-amber-100 text-amber-700 border-amber-200';
    case OrderStatus.PACKING:
      return 'bg-purple-100 text-purple-700 border-purple-200';
    case OrderStatus.SHIPPED:
      return 'bg-green-100 text-green-700 border-green-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

export const getStatusLabel = (status: OrderStatus) => status;

// --- NEW: Time Urgency Logic ---

export interface OrderAgeInfo {
  days: number;
  label: string;
  colorClass: string;
  borderColorClass: string;
  bgClass: string;
}

export const getOrderAgeInfo = (createdAt: number | string, status: OrderStatus): OrderAgeInfo => {
  const created = new Date(createdAt);
  const now = new Date();

  // Set to midnight to compare dates only, roughly
  const createdMidnight = new Date(created.getFullYear(), created.getMonth(), created.getDate());
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffTime = Math.abs(nowMidnight.getTime() - createdMidnight.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let label = '';
  if (diffDays === 0) label = 'Hari ini';
  else if (diffDays === 1) label = 'Kemarin';
  else label = `${diffDays} hari lalu`;

  // Determine Urgency Colors
  // If Shipped/Done, it's always safe (Green/Zinc)
  if (status === OrderStatus.SHIPPED) {
    return {
      days: diffDays,
      label,
      colorClass: 'text-zinc-500',
      borderColorClass: 'border-zinc-700', // Default border
      bgClass: ''
    };
  }

  // Logic for active orders
  if (diffDays > 7) {
    return {
      days: diffDays,
      label,
      colorClass: 'text-red-500 font-bold',
      borderColorClass: 'border-red-500/50',
      bgClass: 'bg-red-900/10'
    };
  } else if (diffDays > 3) {
    return {
      days: diffDays,
      label,
      colorClass: 'text-amber-500 font-bold',
      borderColorClass: 'border-amber-500/50',
      bgClass: 'bg-amber-900/10'
    };
  } else {
    return {
      days: diffDays,
      label,
      colorClass: 'text-zinc-400',
      borderColorClass: 'border-zinc-700', // Default
      bgClass: ''
    };
  }
};

// Helper to normalize data to Array
const normalizeFileArray = (data: FileData[] | FileData | null | any): FileData[] => {
  if (!data) return [];
  if (Array.isArray(data)) return data;

  // Handle case where data might be a single string (legacy data issue)
  if (typeof data === 'string') {
    return [{
      name: 'File',
      type: 'unknown',
      size: 0,
      url: data
    }];
  }

  // Handle single object
  if (typeof data === 'object') return [data];

  return [];
};

// Generate Random 4-char Alphanumeric Code
export const generateOrderNo = () => {
  // Generates something like "9X2A"
  return Math.random().toString(36).substring(2, 6).toUpperCase();
};

// Helper to map DB Row (snake_case) to App State (camelCase)
export const mapRowToOrder = (row: OrderRow): Order => {
  if (!row) throw new Error("Row is undefined");

  return {
    id: row.id,
    orderNo: row.order_no || '????', // Fallback for old data
    customerId: row.customer_id,
    customerName: row.customer_name || 'Unknown Customer',
    productName: row.product_name || 'Unknown Product',
    quantity: row.quantity || 0,
    description: row.description || '',
    status: (row.status as OrderStatus) || OrderStatus.PROCESSING,
    previewImages: normalizeFileArray(row.preview_image),
    designFiles: normalizeFileArray(row.design_file),
    receiptFile: row.receipt_file || null,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
    channel: row.channel || 'ONLINE', // Default to online for old data
    recipientName: row.recipient_name || '',
    recipientPhone: row.recipient_phone || '',
    address: row.address || '',
  };
};

// --- NEW HELPER: Storage Cleanup ---
// Extracts the filename/path from a Supabase Public URL
export const getStoragePathFromUrl = (url: string): string | null => {
  try {
    if (!url) return null;
    // Assuming URL format ends with the filename in the public bucket
    // e.g., .../sablon-files/filename.jpg
    const urlObj = new URL(url);
    const parts = urlObj.pathname.split('/');
    // Get the last segment which is the filename
    return parts.length > 0 ? parts[parts.length - 1] : null;
  } catch (error) {
    return null;
  }
};

// Extracts ALL file paths associated with an order
export const getAllOrderFilePaths = (order: Order): string[] => {
  const paths: string[] = [];

  // Collect paths from arrays
  order.previewImages?.forEach(img => {
    const path = getStoragePathFromUrl(img.url);
    if (path) paths.push(path);
  });

  order.designFiles?.forEach(file => {
    const path = getStoragePathFromUrl(file.url);
    if (path) paths.push(path);
  });

  // Collect path from single object
  if (order.receiptFile) {
    const path = getStoragePathFromUrl(order.receiptFile.url);
    if (path) paths.push(path);
  }

  return paths;
};
