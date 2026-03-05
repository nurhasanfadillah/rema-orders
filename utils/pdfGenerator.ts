

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Order, OrderStatus } from '../types';
import { formatDate } from '../utils';

interface PDFOptions {
  startDate: string;
  endDate: string;
  searchKeyword?: string;
  status: OrderStatus | 'ALL';
  channel?: 'ALL' | 'ONLINE' | 'OFFLINE';
}

// Helper to load image and get dimensions to maintain aspect ratio
const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = url;
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
  });
};

// --- A4 RECAP REPORT (PORTRAIT) ---
// Note: Function is now ASYNC to handle image loading
export const generateOrdersPDF = async (orders: Order[], options: PDFOptions) => {
  // Portrait orientation ('p')
  const doc = new jsPDF('p', 'mm', 'a4');

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Use 'as' casting for safer transpilation compatibility
  const primaryColor = [220, 38, 38] as [number, number, number]; // Red 600
  const darkColor = [24, 24, 27]; // Zinc 900
  const grayColor = [82, 82, 91]; // Zinc 600

  // --- 1. KOP SURAT (IDENTITAS PERUSAHAAN) ---
  let cursorY = 14;
  const marginLeft = 14;

  // Logo Setup
  const logoUrl = "https://lh3.googleusercontent.com/d/1wBH8a8rRBvRKdS0n4zSUxSNugsvr3GiN";

  // LOGIC: Fixed Width, Dynamic Height (Proportional)
  // REQUEST: Lebar logo diubah jadi 20mm
  const maxLogoWidth = 20;
  let usedLogoHeight = 15; // Default fallback height if load fails

  try {
    const img = await loadImage(logoUrl);
    // Calculate aspect ratio: height / width
    const ratio = img.height / img.width;
    // Set height proportional to the fixed width
    usedLogoHeight = maxLogoWidth * ratio;

    doc.addImage(img, 'PNG', marginLeft, cursorY, maxLogoWidth, usedLogoHeight);
  } catch (e) {
    console.warn("Logo failed to load inside PDF", e);
    // Fallback text if logo fails
    doc.setFontSize(10);
    doc.text("REDONE", marginLeft, cursorY + 5);
  }

  // Identity Text (Next to Logo)
  // Position text to the right of the logo with padding
  const textX = marginLeft + maxLogoWidth + 6;
  const maxTextWidth = pageWidth - textX - 14;

  // Company Name
  doc.setFontSize(18);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.setFont("helvetica", "bold");
  doc.text("PT. REDONE BERKAH MANDIRI UTAMA", textX, cursorY + 6);

  // Address
  doc.setFontSize(8);
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.setFont("helvetica", "normal");

  const address = "Jl. Raya Cileungsi-Jonggol Km. 10, Cipeucang 04/02 Cileungsi Kab. Bogor Jawa Barat 16820";
  const addressLines = doc.splitTextToSize(address, maxTextWidth);
  doc.text(addressLines, textX, cursorY + 11);

  // Determine where the header ends 
  const headerContentHeight = Math.max(usedLogoHeight, 22);
  cursorY += headerContentHeight + 4;

  // Separator Line
  doc.setDrawColor(40); // Hampir hitam
  doc.setLineWidth(0.6);
  doc.line(14, cursorY, pageWidth - 14, cursorY);

  // Garis Tipis Sekunder (Di bawahnya)
  cursorY += 1.2;
  doc.setLineWidth(0.2);
  doc.line(14, cursorY, pageWidth - 14, cursorY);


  // --- 2. JUDUL LAPORAN (CENTERED ABOVE TABLE) ---
  cursorY += 10; // Spacing after line

  // Title
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text("LAPORAN REKAPITULASI PESANAN", pageWidth / 2, cursorY, { align: 'center' });

  cursorY += 5;

  // Period & Filter Info (Centered)
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Periode: ${formatDate(options.startDate, false)} s.d ${formatDate(options.endDate, false)}`, pageWidth / 2, cursorY, { align: 'center' });

  cursorY += 4;

  // Dynamic Filter Text
  let filterText = `Status: ${options.status}`;
  if (options.channel && options.channel !== 'ALL') {
    filterText += ` | Channel: ${options.channel}`;
  }
  if (options.searchKeyword) {
    filterText += ` | Pencarian: "${options.searchKeyword}"`;
  }
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(filterText, pageWidth / 2, cursorY, { align: 'center' });

  // Print Date (Small, Right aligned just above table)
  doc.text(`Dicetak: ${formatDate(Date.now(), true)}`, pageWidth - 14, cursorY, { align: 'right' });


  // --- 3. TABLE DATA PREPARATION ---
  const tableColumn = [
    "No",
    "Order ID",
    "Tgl",
    "Channel",
    "Pelanggan",
    "Produk",
    "Qty",
    "Status",
    "Catatan"
  ];

  const tableRows = orders.map((order, index) => {
    return [
      index + 1,
      order.orderNo,
      formatDate(order.createdAt, false),
      order.channel || 'ONLINE',
      order.customerName,
      order.productName,
      order.quantity,
      order.status,
      order.description ? order.description.substring(0, 50) + (order.description.length > 50 ? '...' : '') : '-'
    ];
  });

  // --- 4. GENERATE TABLE ---
  // @ts-ignore
  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: cursorY + 6,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      fontSize: 7,
      cellPadding: 2
    },
    styles: {
      fontSize: 7,
      cellPadding: 2,
      valign: 'top',
      lineColor: 230,
      lineWidth: 0.1
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251] // Gray 50
    },
    // Portrait Width: ~182mm usable
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' }, // No
      1: { cellWidth: 15, fontStyle: 'bold' }, // Order ID
      2: { cellWidth: 18 }, // Tgl
      3: { cellWidth: 18, halign: 'center' }, // Channel
      4: { cellWidth: 24 }, // Pelanggan
      5: { cellWidth: 28 }, // Produk
      6: { cellWidth: 10, halign: 'center', fontStyle: 'bold' }, // Qty
      7: { cellWidth: 18, halign: 'center' }, // Status
      8: { cellWidth: 'auto' } // Catatan (Takes remaining space)
    },
    didParseCell: function (data: any) {
      // Status coloring
      if (data.section === 'body' && data.column.index === 7) {
        const status = data.cell.raw;
        if (status === 'Diproses') data.cell.styles.textColor = [37, 99, 235];
        if (status === 'Sablon') data.cell.styles.textColor = [217, 119, 6];
        if (status === 'Packing') data.cell.styles.textColor = [147, 51, 234];
        if (status === 'Dikirim') data.cell.styles.textColor = [5, 150, 105];
      }
    }
  });

  // --- 5. COMPREHENSIVE SUMMARY (BOTTOM) ---

  // Calculate Stats
  const totalOrders = orders.length;
  const totalQty = orders.reduce((sum, order) => sum + order.quantity, 0);

  const statusCounts = orders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const channelCounts = orders.reduce((acc, order) => {
    const ch = order.channel || 'ONLINE';
    acc[ch] = (acc[ch] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Determine Y Position for Summary
  // @ts-ignore
  let finalY = doc.lastAutoTable.finalY + 10;

  // Calculate required space for summary
  const summaryHeight = 35;
  const requiredBottomSpace = 45;

  // If not enough space at bottom, add page
  if (finalY > pageHeight - requiredBottomSpace) {
    doc.addPage();
    finalY = 20;
  }

  // Draw Summary Section
  doc.setDrawColor(200);
  doc.setLineWidth(0.1);
  doc.setFillColor(250, 250, 250); // Light Gray background

  // Outer Box
  doc.roundedRect(14, finalY, pageWidth - 28, summaryHeight, 2, 2, 'FD');

  // Title
  doc.setFontSize(9);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text("RINGKASAN", 20, finalY + 8);

  // --- COLUMN 1: GRAND TOTALS ---
  const col1X = 20;
  const rowStart = finalY + 16;

  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.setFont("helvetica", "normal");
  doc.text("Total Pesanan:", col1X, rowStart);
  doc.text("Total Item (Qty):", col1X, rowStart + 6);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text(`${totalOrders}`, col1X + 25, rowStart);
  doc.text(`${totalQty}`, col1X + 25, rowStart + 6);

  // Vertical Separator 1
  doc.setDrawColor(220);
  doc.line(60, finalY + 5, 60, finalY + summaryHeight - 5);

  // --- COLUMN 2: CHANNEL BREAKDOWN ---
  const col2X = 65;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(0);
  doc.text("Channel:", col2X, rowStart - 2);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);

  doc.text(`ONLINE: ${channelCounts['ONLINE'] || 0}`, col2X, rowStart + 4);
  doc.text(`OFFLINE: ${channelCounts['OFFLINE'] || 0}`, col2X, rowStart + 9);

  // Vertical Separator 2
  doc.setDrawColor(220);
  doc.line(105, finalY + 5, 105, finalY + summaryHeight - 5);

  // --- COLUMN 3: STATUS BREAKDOWN ---
  const col3X = 110;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(0);
  doc.text("Status:", col3X, rowStart - 2);

  const statuses = Object.values(OrderStatus);
  let statusX = col3X;
  let statusY = rowStart + 4;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);

  // Render status counts
  statuses.forEach((status, idx) => {
    const isSecondCol = idx > 1;
    const xOffset = isSecondCol ? 40 : 0;
    const yOffset = isSecondCol ? (idx - 2) * 5 : idx * 5;

    const currentX = statusX + xOffset;
    const currentY = statusY + yOffset;

    if (currentX < pageWidth - 10) {
      doc.text(`• ${status}:`, currentX, currentY);
      doc.setFont("helvetica", "bold");
      doc.text(`${statusCounts[status] || 0}`, currentX + 22, currentY);
      doc.setFont("helvetica", "normal");
    }
  });

  const fileName = `Laporan_REMA_${options.startDate}_${options.endDate}.pdf`;
  doc.save(fileName);
};


// --- HELPER: DYNAMIC TEXT WRITER ---
// Returns the Y position AFTER the written text
const writeDynamicText = (
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
  fontStyle: string = 'normal',
  align: 'left' | 'center' | 'right' = 'left',
  lineHeightFactor: number = 0.5 // Relative to font size
): number => {
  doc.setFontSize(fontSize);
  doc.setFont("helvetica", fontStyle);

  const lines = doc.splitTextToSize(text, maxWidth);
  const lineHeight = fontSize * lineHeightFactor; // mm approx based on font size

  lines.forEach((line: string, index: number) => {
    doc.text(line, x, y + (index * lineHeight), { align });
  });

  // Return new Y position (current Y + total height of lines)
  return y + (lines.length * lineHeight);
};

// --- SPK / WORK ORDER (100x150mm) ---
export const generateSPKPDF = (order: Order) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [100, 150]
  });

  const pageWidth = 100;
  const pageHeight = 150;
  const margin = 8;
  const contentWidth = pageWidth - (margin * 2);

  const headerHeight = 16;
  let cursorY = 0;

  // 1. HEADER (Black Bar)
  doc.setFillColor(0, 0, 0);
  doc.rect(0, 0, pageWidth, headerHeight, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text("WORK ORDER", margin, 11);

  doc.setFontSize(13);
  doc.text("REMA", pageWidth - margin, 11, { align: 'right' });

  cursorY = 24;

  // 2. META DATA
  // Left: Order No
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("ORDER NO :", margin, cursorY);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(22);
  doc.text(order.orderNo || '----', margin, cursorY + 9);

  // Right: Date & Badge
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.text("DATE IN :", pageWidth - margin, cursorY, { align: 'right' });

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.text(formatDate(order.createdAt, false), pageWidth - margin, cursorY + 5, { align: 'right' });

  // Badge
  const channel = (order.channel || 'ONLINE').toUpperCase();
  const badgeWidth = 26;
  const badgeHeight = 7;
  const badgeX = pageWidth - margin - badgeWidth;
  const badgeY = cursorY + 8;

  if (channel === 'OFFLINE') {
    doc.setFillColor(60, 50, 50);
  } else {
    doc.setFillColor(0, 0, 0);
  }

  doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 1.5, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(channel, badgeX + (badgeWidth / 2), badgeY + 4.8, { align: 'center' });

  cursorY += 20;

  // 3. SEPARATOR
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.8);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);

  cursorY += 6;

  // 4. CUSTOMER NAME (Revisited: Name Only, No Label)
  doc.setTextColor(0, 0, 0);
  // Using Dynamic Text to ensure long names don't overlap
  cursorY = writeDynamicText(
    doc,
    (order.customerName || "NO NAME").toUpperCase(),
    margin,
    cursorY,
    contentWidth,
    12,
    'bold',
    'left',
    0.5
  );

  cursorY += 5;

  // 5. PRODUCT & QTY
  const productStartY = cursorY;
  const qtyBoxSize = 24;

  // QTY Box
  doc.setFillColor(0, 0, 0);
  doc.rect(margin, productStartY, qtyBoxSize, qtyBoxSize, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("QTY", margin + (qtyBoxSize / 2), productStartY + 5, { align: 'center' });

  doc.setFontSize(22);
  doc.text(String(order.quantity), margin + (qtyBoxSize / 2), productStartY + 16, { align: 'center' });

  // Product Name
  const contentX = margin + qtyBoxSize + 6;

  doc.setTextColor(150, 150, 150);
  doc.setFontSize(8);
  doc.text("PRODUCT / ITEM :", contentX, productStartY + 3);

  doc.setTextColor(0, 0, 0);
  const nextYAfterProduct = writeDynamicText(
    doc,
    order.productName.toUpperCase(),
    contentX,
    productStartY + 10,
    pageWidth - contentX - margin,
    15,
    'bold',
    'left',
    0.45
  );

  const endOfQtyBox = productStartY + qtyBoxSize;
  cursorY = Math.max(endOfQtyBox, nextYAfterProduct) + 6;

  // --- FOOTER LAYOUT (Bottom-Up) ---
  const footerBottomY = pageHeight - margin;

  // 1. Signature Boxes (Compact Height 18mm)
  const boxHeight = 18;
  const boxY = footerBottomY - boxHeight;

  // 2. Checklist Area (Compact Gaps)
  const checklistHeight = 6;
  const checklistGap = 4; // Jarak antara checklist dan box
  const checklistY = boxY - checklistGap - checklistHeight;

  // 3. Separator Line
  const lineGap = 4; // Jarak antara garis dan checklist
  const lineY = checklistY - lineGap;

  // 4. Notes Section
  const notesLabelY = cursorY;

  // Draw Line Separator
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(margin, lineY, pageWidth - margin, lineY);

  // Render Notes Label
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("NOTES / SPECIFICATION :", margin, notesLabelY);

  // Render Notes Content
  const notesContentY = notesLabelY + 4; // Jarak rapat dari label

  // Hitung sisa ruang
  let availableHeight = lineY - notesContentY - 2;
  if (availableHeight < 5) availableHeight = 5;

  const descText = (order.description || "-").toUpperCase();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  const maxLines = Math.max(1, Math.floor(availableHeight / 4));
  const descLines = doc.splitTextToSize(descText, contentWidth);
  const printableLines = descLines.slice(0, maxLines);

  doc.text(printableLines, margin, notesContentY);

  // --- RENDER FOOTER ELEMENTS ---

  // Checklist Items
  const checks = ["FILE", "PRINT", "PRESS", "QC", "PACK"];
  const checkWidth = contentWidth / checks.length;

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);

  checks.forEach((item, index) => {
    const startX = margin + (index * checkWidth);
    const centerY = checklistY + (checklistHeight / 2);
    const boxSize = 3.5;

    const textW = doc.getTextWidth(item);
    const totalW = boxSize + 1.5 + textW;
    const contentX = startX + ((checkWidth - totalW) / 2);

    doc.setLineWidth(0.4);
    doc.rect(contentX, centerY - (boxSize / 2), boxSize, boxSize);
    doc.text(item, contentX + boxSize + 1.5, centerY + 1.2);
  });

  // 3 Grid Boxes (Admin, Printing, Packing)
  const roles = ["ADMIN", "PRINTING", "PACKING"];
  const boxWidth = contentWidth / 3;

  doc.setDrawColor(0);
  doc.setLineWidth(0.4);
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);

  roles.forEach((role, index) => {
    const x = margin + (index * boxWidth);
    doc.rect(x, boxY, boxWidth, boxHeight);
    doc.text(role, x + (boxWidth / 2), boxY + 5, { align: 'center' });
  });

  doc.save(`SPK-${order.orderNo}.pdf`);
};

// --- HELPER: FAUX BARCODE GENERATOR ---
const drawFauxBarcode = (doc: jsPDF, x: number, y: number, w: number, h: number) => {
  const bars = 40; // More bars for denser look
  let currentX = x;
  doc.setFillColor(0, 0, 0);

  for (let i = 0; i < bars; i++) {
    if (currentX >= x + w) break;

    // Random width logic
    const isThick = Math.random() > 0.6;
    const barWidth = isThick ? 1.2 : 0.4;
    const gapWidth = 0.5 + Math.random() * 0.5;

    if (currentX + barWidth > x + w) break;

    // The signature for rect is (x, y, w, h, style) where style is string
    doc.rect(currentX, y, barWidth, h, 'F');
    currentX += barWidth + gapWidth;
  }
};

// --- UPDATED SHIPPING LABEL (RESI) ---
export const generateShippingLabelPDF = (order: Order, senderPhone: string = '-') => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [100, 150]
  });

  const pageWidth = 100;
  const pageHeight = 150;
  const margin = 6; // Sedikit diperluas
  const contentWidth = pageWidth - (margin * 2);
  let cursorY = 0;

  // 1. HEADER AREA
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text("LOGISTICS", margin, 12);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Priority Shipping", pageWidth - margin, 12, { align: 'right' });

  // Thick Separator
  doc.setLineWidth(0.8);
  doc.setDrawColor(0);
  doc.line(margin, 16, pageWidth - margin, 16);

  // 2. META INFO & BARCODE
  cursorY = 22;

  // Date
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Tgl: ${formatDate(order.createdAt, false).split(' ')[0]}`, margin, cursorY);

  cursorY = 28;

  // Order No (Big Left)
  doc.setFontSize(26);
  doc.setFont("helvetica", "bold");
  doc.text(order.orderNo, margin, cursorY + 8);

  // Barcode (Right)
  const barcodeWidth = 45;
  const barcodeHeight = 12;
  const barcodeX = pageWidth - margin - barcodeWidth;

  drawFauxBarcode(doc, barcodeX, cursorY, barcodeWidth, barcodeHeight);

  // Small text under barcode
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(order.orderNo, barcodeX + (barcodeWidth / 2), cursorY + barcodeHeight + 3, { align: 'center' });

  cursorY += 18; // Move past barcode area

  // Separator
  doc.setLineWidth(0.4);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 5;

  // 3. SENDER (PENGIRIM)
  doc.setFontSize(7);
  doc.setTextColor(100);
  doc.setFont("helvetica", "bold");
  doc.text("PENGIRIM (FROM):", margin, cursorY);
  cursorY += 4;

  doc.setTextColor(0);
  // Name
  cursorY = writeDynamicText(doc, (order.customerName || "REMA PRODUCTION").toUpperCase(), margin, cursorY, contentWidth, 10, 'bold', 'left', 0.5);
  cursorY += 1;

  // Phone
  cursorY = writeDynamicText(doc, senderPhone || "-", margin, cursorY, contentWidth, 9, 'normal', 'left', 0.5);

  cursorY += 4;
  doc.setLineWidth(0.2);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 5;

  // 4. RECIPIENT (PENERIMA)
  doc.setFontSize(7);
  doc.setTextColor(100);
  doc.setFont("helvetica", "bold");
  doc.text("PENERIMA (TO):", margin, cursorY);
  cursorY += 4;

  doc.setTextColor(0);
  // Name (Large, allows wrapping)
  cursorY = writeDynamicText(doc, (order.recipientName || "CUSTOMER").toUpperCase(), margin, cursorY, contentWidth, 12, 'bold', 'left', 0.5);
  cursorY += 1;

  // Phone
  cursorY = writeDynamicText(doc, order.recipientPhone || "-", margin, cursorY, contentWidth, 10, 'normal', 'left', 0.5);
  cursorY += 2;

  // Address (Critical: Dynamic wrapping)
  const address = (order.address || "Alamat tidak tersedia").toUpperCase();
  cursorY = writeDynamicText(doc, address, margin, cursorY, contentWidth, 9, 'normal', 'left', 0.45);

  cursorY += 4;
  doc.setLineWidth(0.8); // Thick line to separate content
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 5;

  // 5. CONTENT & QTY
  // Layout: Content on Left (70%), QTY Box on Right (30%)
  const contentSectionStart = cursorY;
  const rightColWidth = 22;
  const leftColWidth = contentWidth - rightColWidth - 4;

  // Left: Label
  doc.setFontSize(7);
  doc.setTextColor(100);
  doc.setFont("helvetica", "bold");
  doc.text("ISI PAKET / CONTENT:", margin, cursorY);
  cursorY += 4;

  // Left: Product Name
  doc.setTextColor(0);
  cursorY = writeDynamicText(doc, String(order.productName).toUpperCase(), margin, cursorY, leftColWidth, 10, 'bold', 'left', 0.5);

  // Left: Note (Optional)
  if (order.description && order.description !== 'PESANAN POLOS') {
    cursorY += 2;
    doc.setFontSize(8);
    doc.setTextColor(80);
    cursorY = writeDynamicText(doc, `Note: ${String(order.description).substring(0, 100).toUpperCase()}`, margin, cursorY, leftColWidth, 8, 'normal', 'left', 0.4);
  }

  // Right: QTY BOX
  const qtyBoxX = pageWidth - margin - rightColWidth;
  const qtyBoxY = contentSectionStart;
  const qtyBoxH = 14;

  doc.setTextColor(0);
  doc.setDrawColor(0);
  doc.setLineWidth(0.6);
  doc.rect(qtyBoxX, qtyBoxY, rightColWidth, qtyBoxH);

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("QTY", qtyBoxX + (rightColWidth / 2), qtyBoxY + 4, { align: 'center' });

  doc.setFontSize(14);
  doc.text(String(order.quantity), qtyBoxX + (rightColWidth / 2), qtyBoxY + 11, { align: 'center' });

  const safeName = (order.recipientName || 'RESI').replace(/[^a-z0-9]/gi, '_').substring(0, 15);
  doc.save(`RESI-${order.orderNo}-${safeName}.pdf`);
};
