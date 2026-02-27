
import * as XLSX from 'xlsx';
import { Order } from '../types';
import { formatDate } from '../utils';

// Helper to format data for export
const formatOrdersForExport = (orders: Order[]) => {
  return orders.map((order, index) => {
    // Get File URLs (Join all files, not just the first one)
    const previewUrl = order.previewImages && order.previewImages.length > 0 
        ? order.previewImages.map(img => img.url).join(', ')
        : '-';
    
    const designUrl = order.designFiles && order.designFiles.length > 0
        ? order.designFiles.map(file => file.url).join(', ')
        : '-';

    return {
      'No': index + 1,
      'Order No': order.orderNo || '-',
      'Tanggal': formatDate(order.createdAt, false),
      'Channel': order.channel || 'ONLINE',
      'Pelanggan': order.customerName, // Only name
      'Penerima': order.channel === 'OFFLINE' ? (order.recipientName || '-') : '-', // New separated column
      'No HP': order.channel === 'OFFLINE' ? (order.recipientPhone || '-') : '-', // New separated column
      'Alamat': order.channel === 'OFFLINE' ? (order.address || '-') : '-', // New separated column
      'Produk': order.productName,
      'Qty': order.quantity,
      'Status': order.status,
      'Deskripsi / Catatan': order.description || '-',
      'Link Preview (Gambar)': previewUrl,
      'Link File Desain': designUrl
    };
  });
};

export const generateCSV = (orders: Order[]) => {
  const data = formatOrdersForExport(orders);
  if (data.length === 0) return;

  // Manual CSV Generation to ensure full control over delimiters and quoting
  const headers = Object.keys(data[0]);
  
  const csvRows = [
    headers.join(','), // Header row
    ...data.map(row => {
      return headers.map(fieldName => {
        // @ts-ignore
        const val = row[fieldName] ? String(row[fieldName]) : '';
        // Escape quotes and wrap in quotes
        return `"${val.replace(/"/g, '""')}"`; 
      }).join(',');
    })
  ];

  const csvContent = csvRows.join('\n');
  
  // Add BOM for Excel UTF-8 compatibility
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement('a');
  const fileName = `Export_REMA_CSV_${Date.now()}.csv`;
  
  if ((navigator as any).msSaveBlob) { // IE 10+
    (navigator as any).msSaveBlob(blob, fileName);
  } else {
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const generateExcel = (orders: Order[]) => {
  const data = formatOrdersForExport(orders);
  
  // Create a new workbook
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // Adjust column widths roughly
  const colWidths = [
    { wch: 5 },  // No
    { wch: 10 }, // Order No
    { wch: 15 }, // Tanggal
    { wch: 10 }, // Channel
    { wch: 20 }, // Pelanggan (Clean name)
    { wch: 20 }, // Penerima (New)
    { wch: 15 }, // No HP (New)
    { wch: 30 }, // Alamat (New)
    { wch: 25 }, // Produk
    { wch: 8 },  // Qty
    { wch: 12 }, // Status
    { wch: 30 }, // Deskripsi
    { wch: 40 }, // Preview Link
    { wch: 40 }  // Design Link
  ];
  worksheet['!cols'] = colWidths;

  // Append worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data Pesanan");
  
  // Generate file
  XLSX.writeFile(workbook, `Export_REMA_Excel_${Date.now()}.xlsx`);
};
