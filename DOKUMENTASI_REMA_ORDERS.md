# 📦 Dokumentasi Lengkap REMA Orders

## Aplikasi Manajemen Pesanan Sablon Digital

---

## 📋 Daftar Isi

1. [Gambaran Umum](#-gambaran-umum)
2. [Fitur Utama](#-fitur-utama)
3. [Struktur Aplikasi](#-struktur-aplikasi)
4. [Panduan Pengguna](#-panduan-pengguna)
5. [Dokumentasi Teknis](#-dokumentasi-teknis)
6. [Referensi API](#-referensi-api)

---

## 🎯 Gambaran Umum

**REMA Orders** adalah aplikasi web modern untuk manajemen pesanan sablon yang dibangun dengan React, TypeScript, dan Supabase. Aplikasi ini dirancang untuk membantu bisnis sablon dalam mengelola alur kerja produksi dari penerimaan pesanan hingga pengiriman.

### Informasi Proyek

| Atribut | Detail |
|---------|--------|
| **Nama** | REMA Orders |
| **Versi** | 0.0.0 |
| **Teknologi** | React 19, TypeScript, Vite, Supabase |
| **Platform** | Web (PWA Support) |
| **Database** | Supabase PostgreSQL |
| **Storage** | Supabase Storage |

### Arsitektur Sistem

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Supabase      │────▶│   PostgreSQL    │
│   (React/Vite)  │     │   (API/Auth)    │     │   Database      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │
         │              ┌────────┴────────┐
         │              │  Supabase       │
         └─────────────▶│  Storage        │
                        │  (Files)        │
                        └─────────────────┘
```

---

## ✨ Fitur Utama

### 1. Manajemen Pesanan (Order Management)

| Fitur | Deskripsi |
|-------|-----------|
| **Create Order** | Membuat pesanan baru dengan nomor unik otomatis |
| **Edit Order** | Mengedit pesanan dengan verifikasi keamanan |
| **Copy Order** | Menduplikasi pesanan dengan file yang sama |
| **Delete Order** | Menghapus pesanan dan file terkait |
| **Status Tracking** | Melacak status: Diproses → Sablon → Packing → Dikirim |

### 2. Jenis Pesanan

- **Custom Order**: Pesanan dengan desain kustom, mendukung upload file mentah dan preview
- **Plain Order**: Pesanan polos tanpa desain khusus

### 3. Channel Pesanan

| Channel | Karakteristik | Validasi |
|---------|---------------|----------|
| **ONLINE** | Pesanan dari marketplace/e-commerce | Wajib upload resi pengiriman |
| **OFFLINE** | Pesanan langsung/walk-in | Wajib data penerima lengkap |

### 4. Manajemen File

| Tipe File | Format | Maksimal |
|-----------|--------|----------|
| Preview Images | JPG, PNG | 5 MB per file |
| Design Files | CDR, AI, PSD, PDF, PNG, ZIP | 5 MB per file |
| Receipt File | PDF | 5 MB |

### 5. Sistem Keamanan

- **Verifikasi Kode**: Kode acak 4 digit untuk pesanan dengan status "Diproses"
- **Secret Code**: Kode supervisor (301292) untuk pesanan dengan status lain
- **File Isolation**: Setiap pesanan memiliki file yang terpisah (tidak berbagi file)

### 6. Export & Laporan

| Format | Fitur |
|--------|-------|
| **PDF Report** | Laporan rekapitulasi dengan kop surat perusahaan |
| **Excel (.xlsx)** | Data lengkap dengan kolom terpisah |
| **CSV** | Data mentah untuk import ke sistem lain |

### 7. Cetak Dokumen

- **SPK (Surat Perintah Kerja)**: Format 100x150mm untuk produksi
- **Label Pengiriman**: Format 100x150mm dengan barcode faux

### 8. Progressive Web App (PWA)

| Fitur PWA | Deskripsi |
|-----------|-----------|
| **Installable** | Bisa diinstall di HP/desktop |
| **Offline Cache** | Service worker untuk akses offline |
| **Auto Update** | Notifikasi update aplikasi |
| **Storage Management** | Monitoring penggunaan storage |

---

## 🏗️ Struktur Aplikasi

### Struktur Folder

```
rema-orders/
├── components/           # Komponen React
│   ├── DesktopTable.tsx      # Tabel desktop
│   ├── ExportModal.tsx         # Modal export data
│   ├── icons.tsx               # Icon SVG components
│   ├── Modal.tsx               # Modal konfirmasi
│   ├── OrderDetail.tsx         # Detail pesanan
│   ├── OrderForm.tsx           # Form pesanan
│   ├── PWAStatusModal.tsx      # Status PWA
│   ├── SearchableSelect.tsx    # Dropdown searchable
│   ├── StatusBadge.tsx         # Badge status
│   └── Toast.tsx               # Notifikasi toast
├── utils/               # Utility functions
│   ├── exportHelper.ts         # Helper export Excel/CSV
│   └── pdfGenerator.ts         # Generator PDF
├── App.tsx              # Komponen utama
├── types.ts             # TypeScript definitions
├── supabase.ts          # Konfigurasi Supabase
├── utils.ts             # Utility functions umum
├── index.tsx            # Entry point
├── index.html           # HTML template
├── vite.config.ts       # Konfigurasi Vite
├── sw.js                # Service Worker
└── package.json         # Dependencies
```

### Skema Database (Supabase)

#### Tabel: `orders`

| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| `id` | UUID | Primary key |
| `order_no` | VARCHAR(4) | Nomor pesanan unik (format: 9X2A) |
| `customer_name` | VARCHAR(50) | Nama pelanggan |
| `product_name` | VARCHAR(50) | Nama produk |
| `quantity` | INTEGER | Jumlah pesanan |
| `description` | TEXT | Deskripsi/catatan |
| `preview_image` | JSONB | Array file preview |
| `design_file` | JSONB | Array file desain |
| `receipt_file` | JSONB | Object file resi |
| `status` | VARCHAR(20) | Status pesanan |
| `channel` | VARCHAR(10) | ONLINE/OFFLINE |
| `recipient_name` | VARCHAR(50) | Nama penerima (offline) |
| `recipient_phone` | VARCHAR(20) | No HP penerima (offline) |
| `address` | TEXT | Alamat pengiriman (offline) |
| `created_at` | TIMESTAMP | Waktu pembuatan |
| `updated_at` | TIMESTAMP | Waktu update terakhir |

#### Storage Bucket: `sablon-files`

- **Public Access**: Ya
- **File Structure**: Flat (semua file di root)
- **Naming Convention**: `{timestamp}-{random}.{ext}`

---

## 📱 Panduan Pengguna

### 1. Membuat Pesanan Baru

1. Klik tombol **"Pesanan Baru"** di sidebar atau header
2. Pilih **Channel**:
   - **ONLINE**: Untuk pesanan dari marketplace
   - **OFFLINE**: Untuk pesanan walk-in
3. Pilih **Jenis Pesanan**:
   - **CUSTOM ORDER**: Upload desain dan preview
   - **PLAIN ORDER**: Pesanan polos tanpa desain
4. Isi data pelanggan:
   - Nama Pelanggan (wajib)
   - Nama Produk (wajib)
   - Jumlah/Qty (wajib)
5. Untuk pesanan CUSTOM:
   - Upload preview gambar (opsional tapi direkomendasikan)
   - Upload file mentahan desain (CDR, AI, PSD, dll)
   - Isi deskripsi/detail sablon
6. Untuk pesanan ONLINE: Upload resi pengiriman (PDF)
7. Untuk pesanan OFFLINE: Isi data pengiriman lengkap
8. Klik **"BUAT PESANAN SEKARANG"**

### 2. Mengubah Status Pesanan

1. Buka detail pesanan dengan klik pada item di daftar
2. Lihat progress bar status saat ini
3. Klik tombol **"Proses ke [Status Berikutnya]"**
4. Status akan berubah secara otomatis:
   - Diproses → Sablon → Packing → Dikirim

### 3. Mengedit Pesanan

1. Buka detail pesanan
2. Klik tombol **EDIT** (desktop) atau icon edit di menu (mobile)
3. Masukkan kode verifikasi:
   - Jika status "Diproses": Kode acak 4 digit yang ditampilkan
   - Jika status lain: Kode supervisor (301292)
4. Lakukan perubahan data
5. Klik **"SIMPAN PERUBAHAN"**

### 4. Menyalin Pesanan

1. Buka detail pesanan yang ingin disalin
2. Klik tombol **Copy/Salin**
3. Sistem akan membuat duplikat dengan:
   - Nomor pesanan baru
   - File desain yang diduplikasi
   - Status reset ke "Diproses"
   - Resi pembayaran dihapus (harus upload ulang)

### 5. Mencetak Dokumen

#### Cetak SPK (Surat Perintah Kerja)
1. Buka detail pesanan
2. Klik tombol **SPK** (desktop) atau pilih dari menu (mobile)
3. File PDF SPK akan diunduh (format 100x150mm)

#### Cetak Label Pengiriman
1. Buka detail pesanan OFFLINE
2. Klik tombol **Label**
3. Masukkan nomor HP pengirim
4. File PDF label akan diunduh dengan barcode faux

### 6. Export Data

1. Klik tombol **"Export PDF"** di sidebar
2. Pilih format: PDF, Excel, atau CSV
3. Atur rentang tanggal:
   - Hari Ini
   - Bulan Ini
   - Bulan Lalu
   - Custom Range
4. Pilih filter tambahan (opsional):
   - Status pesanan
   - Channel (Online/Offline)
   - Kata kunci pencarian
5. Klik **"Download Laporan"**

### 7. Menggunakan Filter

#### Filter Status (Sidebar Desktop)
- Klik status di sidebar untuk melihat pesanan dengan status tertentu
- Counter menampilkan jumlah pesanan dan total qty

#### Pencarian
- Ketik di kotak pencarian untuk mencari:
  - Nama pelanggan
  - Nomor pesanan
  - Nama produk
  - Deskripsi

### 8. Install Aplikasi (PWA)

#### Android/Chrome Desktop
1. Klik tombol **System Info** di sidebar
2. Jika muncul opsi "Install Aplikasi", klik untuk install
3. Aplikasi akan muncul di home screen/desktop

#### iOS (Safari)
1. Buka aplikasi di Safari
2. Tap tombol **Share** (kotak dengan panah ke atas)
3. Pilih **"Add to Home Screen"**
4. Tap **"Add"**

---

## 🔧 Dokumentasi Teknis

### Teknologi Stack

| Kategori | Teknologi |
|----------|-----------|
| **Framework** | React 19.2.3 |
| **Language** | TypeScript 5.8.2 |
| **Build Tool** | Vite 6.2.0 |
| **Styling** | Tailwind CSS (via CDN) |
| **Database** | Supabase (PostgreSQL) |
| **Storage** | Supabase Storage |
| **PDF Generation** | jsPDF + jspdf-autotable |
| **Excel/CSV** | xlsx (SheetJS) |

### State Management

Aplikasi menggunakan **React Hooks** untuk state management:

```typescript
// Data State
const [orders, setOrders] = useState<Order[]>([]);
const [activeOrder, setActiveOrder] = useState<Order | null>(null);
const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
const [qtyCounts, setQtyCounts] = useState<Record<string, number>>({});

// UI State
const [view, setView] = useState<ViewState>('LIST');
const [mode, setMode] = useState<'create' | 'edit'>('create');
const [loading, setLoading] = useState(false);

// Filter State
const [filterStatus, setFilterStatus] = useState<OrderStatus | 'ALL'>('ALL');
const [searchTerm, setSearchTerm] = useState('');
const [page, setPage] = useState(1);
const [pageSize, setPageSize] = useState(10);
```

### Alur Data

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   User      │────▶│   React     │────▶│  Supabase   │
│  Action     │     │   State     │     │   Client    │
└─────────────┘     └─────────────┘     └──────┬──────┘
       ▲                                       │
       │                                       ▼
       │                              ┌─────────────┐
       │                              │  PostgreSQL │
       │                              │   Storage   │
       │                              └──────┬──────┘
       │                                     │
       └─────────────────────────────────────┘
                    (Real-time Update)
```

### Security Implementation

#### 1. Verifikasi Edit/Delete

```typescript
const SECRET_CODE = "301292";

const handleEditRequest = (order: Order) => {
  const isProcessing = order.status === OrderStatus.PROCESSING;
  const code = isProcessing ? generateVerificationCode() : SECRET_CODE;
  
  // Show modal with verification
  setModal({
    verificationText: code,
    hideVerificationCode: !isProcessing,
    // ...
  });
};
```

#### 2. File Upload Security

- **Size Limit**: 5 MB per file
- **Type Validation**: Sesuai ekstensi file yang diizinkan
- **Naming**: Randomized filename dengan timestamp
- **Storage**: Public bucket dengan URL unik

### Responsive Design

| Breakpoint | Layout |
|------------|--------|
| **Mobile (< 768px)** | Single column, card-based list, bottom sheet menu |
| **Desktop (≥ 768px)** | Sidebar + main content, data table, inline actions |

### Performance Optimizations

1. **Pagination**: Data di-fetch per halaman (10/25/50/100 items)
2. **Debounced Search**: Pencarian dengan delay 500ms
3. **Lazy Loading**: Gambar di-load on-demand
4. **Service Worker**: Caching untuk akses offline
5. **Batch Processing**: Upload file secara sequential dengan progress indicator

---

## 📚 Referensi API

### Supabase Client

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://gbmwlowxdpwnqwvcwttk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
);
```

### Database Operations

#### Fetch Orders with Pagination

```typescript
const fetchOrders = async () => {
  let query = supabase
    .from('orders')
    .select('*', { count: 'exact' });

  // Filters
  if (filterStatus !== 'ALL') {
    query = query.eq('status', filterStatus);
  }

  if (searchTerm) {
    query = query.or(`
      customer_name.ilike.%${searchTerm}%,
      order_no.ilike.%${searchTerm}%,
      product_name.ilike.%${searchTerm}%,
      description.ilike.%${searchTerm}%
    `);
  }

  // Sorting
  query = query.order('created_at', { ascending: isAscending });

  // Pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, count, error } = await query;
  // Handle response...
};
```

#### Create Order

```typescript
const handleCreateOrder = async (orderData) => {
  const { error } = await supabase.from('orders').insert([{
    order_no: generateOrderNo(), // Random 4-char code
    customer_name: orderData.customerName,
    product_name: orderData.productName,
    quantity: orderData.quantity,
    description: orderData.description,
    status: orderData.status,
    preview_image: orderData.previewImages,
    design_file: orderData.designFiles,
    receipt_file: orderData.receiptFile,
    channel: orderData.channel,
    recipient_name: orderData.recipientName,
    recipient_phone: orderData.recipientPhone,
    address: orderData.address
  }]);
  // Handle response...
};
```

#### File Upload

```typescript
const uploadFile = async (fileData, bucket) => {
  const fileExt = fileData.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
  
  const { error } = await supabase.storage
    .from(bucket)
    .upload(fileName, fileData.file);

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName);

  return {
    name: fileData.name,
    type: fileData.type,
    size: fileData.size,
    url: publicUrl
  };
};
```

### Type Definitions

```typescript
// Order Status Enum
export enum OrderStatus {
  PROCESSING = 'Diproses',
  PRINTING = 'Sablon',
  PACKING = 'Packing',
  SHIPPED = 'Dikirim'
}

// File Data Structure
export interface FileData {
  name: string;
  type: string;
  size: number;
  url: string;
  file?: File; // For upload process
}

// Order Interface
export interface Order {
  id: string;
  orderNo: string;
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
  channel: 'ONLINE' | 'OFFLINE';
  recipientName?: string;
  recipientPhone?: string;
  address?: string;
}
```

---

## 🚀 Deployment

### Environment Variables

```bash
# .env
VITE_SUPABASE_URL=https://gbmwlowxdpwnqwvcwttk.supabase.co
VITE_SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Build Commands

```bash
# Development
npm run dev

# Production Build
npm run build

# Preview Build
npm run preview
```

### Netlify Configuration

```toml
# netlify.toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

---

## 📞 Informasi Kontak & Support

### Perusahaan
**PT. REDONE BERKAH MANDIRI UTAMA**
- Alamat: Jl. Raya Cileungsi-Jonggol Km. 10, Cipeucang 04/02 Cileungsi Kab. Bogor Jawa Barat 16820

### Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Aplikasi tidak update | Buka System Info → Update Sekarang |
| Cache penuh | System Info → Reset Cache & Reload |
| File tidak upload | Periksa ukuran file (max 5MB) |
| Data tidak muncul | Periksa koneksi internet |

---

## 📝 Changelog

### Versi Saat Ini (0.0.0)

- ✅ Manajemen pesanan lengkap (CRUD)
- ✅ Sistem status dengan progress tracking
- ✅ Upload file multi-tipe
- ✅ Export PDF, Excel, CSV
- ✅ Cetak SPK dan Label
- ✅ PWA dengan offline support
- ✅ Responsive design (mobile & desktop)
- ✅ Sistem verifikasi keamanan
- ✅ Copy/duplicate order

---

**Dokumentasi ini terakhir diperbarui:** 2024  
**Dibuat dengan ❤️ oleh Tim REMA**
