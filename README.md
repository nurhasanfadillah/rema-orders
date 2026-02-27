<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# REMA Orders - Order Management System

A modern, Progressive Web App (PWA) for managing printing/sablon orders. Built with React, TypeScript, Vite, and Supabase.

## Features

- **Order Management**: Create, read, update, and delete orders with full CRUD operations
- **Status Tracking**: Track orders through 4 stages - Diproses (Processing), Sablon (Printing), Packing, Dikirim (Shipped)
- **File Management**: Upload and manage preview images, design files, and payment receipts
- **PWA Support**: Installable app with offline capabilities and auto-update functionality
- **Responsive Design**: Optimized for both mobile and desktop experiences
- **Search & Filter**: Advanced search across customer names, order numbers, products, and descriptions
- **Export**: Generate PDF reports and export data
- **Security**: Verification codes for sensitive operations (edit/delete) based on order status
- **Pagination**: Configurable page sizes (10, 25, 50, 100 rows)
- **Real-time Updates**: Instant status count updates and order synchronization

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Backend**: Supabase (PostgreSQL + Storage)
- **Styling**: Tailwind CSS with custom dark theme
- **PWA**: Service Worker with offline support
- **Export**: jsPDF for PDF generation, xlsx for Excel export
- **Deployment**: Netlify

## Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn
- Supabase account (for backend)

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd rema-orders
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory with your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Usage

### Creating Orders
- Click "Pesanan Baru" (New Order) to create a new order
- Fill in customer details, product information, quantity, and description
- Upload preview images and design files
- Select sales channel (Online/Offline) and add shipping details if needed

### Managing Orders
- View all orders in the dashboard with status filtering
- Click on any order to view details
- Update order status as it progresses through stages
- Edit or delete orders with verification codes (secret code or random generated)

### Search and Filter
- Use the search bar to find orders by customer, order number, product, or description
- Filter orders by status using the sidebar (desktop) or dropdown (mobile)
- Sort orders by date (ascending/descending)

### Export
- Export orders to PDF with customizable filters
- Access export functionality from the System Info menu

## PWA Features

- **Install**: Install the app on your device for native-like experience
- **Offline Support**: Basic functionality works offline with service worker caching
- **Auto-Update**: Automatic updates when new versions are available
- **Mobile Optimized**: Touch-friendly interface with mobile-specific layouts

## Deployment

This app is configured for Netlify deployment with:
- `netlify.toml` configuration
- `_redirects` for SPA routing
- Automatic PWA asset generation

To deploy:
1. Connect your repository to Netlify
2. Build command: `npm run build`
3. Publish directory: `dist`

## Project Structure

```
├── components/          # React components
│   ├── OrderForm.tsx   # Order creation/editing form
│   ├── OrderDetail.tsx # Order detail view
│   ├── DesktopTable.tsx # Desktop data table
│   └── ...
├── utils.ts            # Utility functions
├── types.ts            # TypeScript type definitions
├── supabase.ts         # Supabase client configuration
├── sw.js               # Service Worker for PWA
└── vite.config.ts      # Vite configuration
```

## License

[Add your license information here]

## Contributing

[Add contribution guidelines here]
