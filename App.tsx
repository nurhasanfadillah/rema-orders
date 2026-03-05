
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Order, OrderStatus, ViewState, OrderRow } from './types';
import { OrderForm } from './components/OrderForm';
import { OrderDetail } from './components/OrderDetail';
import { StatusBadge } from './components/StatusBadge';
import { SearchableSelect } from './components/SearchableSelect';
import { PlusIcon, SearchIcon, ChevronLeftIcon, ChevronRightIcon, SortDescIcon, SortAscIcon, DownloadIcon, InfoIcon, DatabaseIcon, ImageIcon, GlobeIcon, ZapIcon } from './components/icons';

import { formatDate, mapRowToOrder, formatCurrency, generateOrderNo, getAllOrderFilePaths, getOrderAgeInfo } from './utils';
import { supabase } from './supabase';
import { Toast, ToastType } from './components/Toast';
import { ConfirmationModal } from './components/Modal';
import { ExportModal } from './components/ExportModal';
import { PWAStatusModal } from './components/PWAStatusModal';
import { DesktopTable } from './components/DesktopTable';
import { CustomerPage } from './components/CustomerPage';
import { ProductPage } from './components/ProductPage';

import { getOfflineQueue, dequeueOfflineAction } from './utils/offlineQueue';
import { uploadFiles } from './utils/uploadHelper';

const SECRET_CODE = "301292";

export default function App() {
  // --- Data State ---
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [qtyCounts, setQtyCounts] = useState<Record<string, number>>({}); // New state for Qty Sum

  // --- Pagination & Filter State ---
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAscending, setIsAscending] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // --- UI State ---
  const [view, setView] = useState<ViewState>('LIST');
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [loading, setLoading] = useState(false);

  const [showExportModal, setShowExportModal] = useState(false);
  const [showPwaModal, setShowPwaModal] = useState(false);

  // --- PWA State ---
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // --- Offline Sync Queue ---
  const [syncingOffline, setSyncingOffline] = useState(false);

  // --- Toast ---
  const [toast, setToast] = useState<{ show: boolean; message: string; type: ToastType }>({
    show: false,
    message: '',
    type: 'info'
  });

  const showToast = (message: string, type: ToastType) => {
    setToast({ show: true, message, type });
  };

  // --- Confirmation Modal ---
  const [modal, setModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    action: () => void;
    isDanger: boolean;
    verificationText?: string;
    hideVerificationCode?: boolean;
    confirmText?: string;
    cancelText?: string;
  }>({
    show: false,
    title: '',
    message: '',
    action: () => { },
    isDanger: false
  });

  // --- Helpers ---
  const generateVerificationCode = () => Math.floor(1000 + Math.random() * 9000).toString();

  // Helper to safely stringify errors
  const getErrorMessage = (err: any) => {
    if (!err) return 'Unknown error occurred';
    if (typeof err === 'string') return err;
    if (err instanceof Error) return err.message;
    if (err.message) return err.message;
    if (err.error_description) return err.error_description;
    if (err.details) return err.details;

    try {
      return JSON.stringify(err);
    } catch {
      return 'Non-serializable error';
    }
  };

  // --- Data Fetching ---
  const fetchStatusCounts = async () => {
    const statuses = ['ALL', ...Object.values(OrderStatus)];
    const newCounts: Record<string, number> = {};
    const newQtyCounts: Record<string, number> = {};

    // Run all count queries in parallel
    const promises = statuses.map(async (statusKey) => {
      // Build count query with filters
      let countQuery = supabase.from('orders').select('*', { count: 'exact', head: true });

      // Filter by Status (if not ALL)
      if (statusKey !== 'ALL') {
        countQuery = countQuery.eq('status', statusKey);
      }

      // Respect Search Term
      if (searchTerm) {
        countQuery = countQuery.or(`customer_name.ilike.%${searchTerm}%,order_no.ilike.%${searchTerm}%,product_name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      // Get exact count
      const { count, error: countError } = await countQuery;

      if (countError) {
        console.warn(`Error counting status ${statusKey}:`, countError);
        return { key: statusKey, count: 0, qty: 0 };
      }

      // Batch fetch all quantities in chunks of 1000 to bypass limit
      const BATCH_SIZE = 1000;
      let allQuantities: number[] = [];
      let hasMore = true;
      let offset = 0;

      // Rebuild query for quantity fetching (same filters)
      let qtyQuery = supabase.from('orders').select('quantity');

      if (statusKey !== 'ALL') {
        qtyQuery = qtyQuery.eq('status', statusKey);
      }

      if (searchTerm) {
        qtyQuery = qtyQuery.or(`customer_name.ilike.%${searchTerm}%,order_no.ilike.%${searchTerm}%,product_name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      while (hasMore) {
        const { data, error } = await qtyQuery
          .range(offset, offset + BATCH_SIZE - 1);

        if (error) {
          console.warn(`Error fetching quantities for ${statusKey}:`, error);
          break;
        }

        if (data && data.length > 0) {
          allQuantities = allQuantities.concat(data.map(item => item.quantity || 0));
          offset += data.length;
          hasMore = data.length === BATCH_SIZE;
        } else {
          hasMore = false;
        }
      }

      const totalQty = allQuantities.reduce((sum, qty) => sum + qty, 0);

      return { key: statusKey, count: count || 0, qty: totalQty };
    });

    try {
      const results = await Promise.all(promises);
      results.forEach(item => {
        newCounts[item.key] = item.count;
        newQtyCounts[item.key] = item.qty;
      });
      setStatusCounts(newCounts);
      setQtyCounts(newQtyCounts);
    } catch (error) {
      console.error("Error fetching counts:", error);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('orders')
        .select('*', { count: 'exact' });

      // Filters
      if (filterStatus !== 'ALL') {
        query = query.eq('status', filterStatus);
      }

      // Updated Search Logic
      if (searchTerm) {
        query = query.or(`customer_name.ilike.%${searchTerm}%,order_no.ilike.%${searchTerm}%,product_name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      // Sorting
      query = query.order('created_at', { ascending: isAscending });

      // Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;

      if (error) throw error;

      if (data) {
        try {
          const mappedOrders = data.map(row => mapRowToOrder(row as OrderRow));
          setOrders(mappedOrders);
          setTotalCount(count || 0);
        } catch (mapErr) {
          console.error("Mapping error:", mapErr);
          throw new Error("Failed to process data from server");
        }
      }
    } catch (err: any) {
      console.error('Fetch error details:', err);
      showToast('Gagal memuat data: ' + getErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  // --- Initialization & PWA ---

  const processOfflineQueue = useCallback(async () => {
    if (syncingOffline || !navigator.onLine) return;

    const queue = await getOfflineQueue();
    if (queue.length === 0) return;

    setSyncingOffline(true);
    showToast(`Mulai sinkronisasi ${queue.length} antrean offline...`, 'info');

    for (const item of queue) {
      try {
        const { payload, type, orderId } = item;
        const mode = type === 'CREATE' ? 'create' : 'edit';

        // Upload all files
        const uploadedPreviews = await uploadFiles(payload.previewImages || [], 'sablon-files', mode);
        const uploadedDesigns = await uploadFiles(payload.designFiles || [], 'sablon-files', mode);

        let uploadedReceipt = null;
        if (payload.receiptFile) {
          const result = await uploadFiles([payload.receiptFile], 'sablon-files', mode);
          uploadedReceipt = result[0];
        }

        // Submit to DB
        if (type === 'CREATE') {
          const { error } = await supabase.from('orders').insert([{
            order_no: generateOrderNo(),
            customer_id: payload.customerId,
            product_id: payload.productId,
            customer_name: payload.customerName,
            product_name: payload.productName,
            quantity: payload.quantity,
            description: payload.description,
            status: payload.status,
            preview_image: uploadedPreviews,
            design_file: uploadedDesigns,
            receipt_file: uploadedReceipt,
            channel: payload.channel,
            recipient_name: payload.recipientName,
            recipient_phone: payload.recipientPhone,
            address: payload.address
          }]);
          if (error) throw error;
        } else if (type === 'UPDATE' && orderId) {
          const { error } = await supabase.from('orders').update({
            customer_id: payload.customerId,
            product_id: payload.productId,
            customer_name: payload.customerName,
            product_name: payload.productName,
            quantity: payload.quantity,
            description: payload.description,
            status: payload.status,
            preview_image: uploadedPreviews,
            design_file: uploadedDesigns,
            receipt_file: uploadedReceipt,
            updated_at: new Date().toISOString(),
            channel: payload.channel,
            recipient_name: payload.recipientName,
            recipient_phone: payload.recipientPhone,
            address: payload.address
          }).eq('id', orderId);
          if (error) throw error;
        }

        // Success, remove from queue
        await dequeueOfflineAction(item.id);

      } catch (err: any) {
        console.error("Failed to sync item", item.id, err);
        showToast(`Gagal sinkron data offline: ${getErrorMessage(err)}`, 'error');
        break; // Stop syncing to prevent chain failures
      }
    }

    setSyncingOffline(false);
    fetchOrders(); // Refresh table
    fetchStatusCounts();

    const remaining = await getOfflineQueue();
    if (remaining.length === 0) {
      showToast('Sinkronisasi offline selesai!', 'success');
    }
  }, [syncingOffline]);

  const appInitialized = useRef(false);

  useEffect(() => {
    if (!appInitialized.current) {
      appInitialized.current = true;
      // Check URL params for quick actions
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('action') === 'new_order') {
        setView('FORM');
        setMode('create');
        window.history.replaceState({}, '', '/');
      }

      // Initial Fetch
      fetchOrders();
      fetchStatusCounts();

      if (navigator.onLine) {
        processOfflineQueue();
      }
    }

    // PWA Install Prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    // PWA Update Available Listener
    const handleSWUpdate = (e: CustomEvent) => {
      console.log("App detected SW update");
      setIsUpdateAvailable(true);
      setSwRegistration(e.detail);
      showToast("Versi baru aplikasi tersedia!", 'info');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('swUpdated', handleSWUpdate as EventListener);
    window.addEventListener('online', processOfflineQueue);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('swUpdated', handleSWUpdate as EventListener);
      window.removeEventListener('online', processOfflineQueue);
    };
  }, [processOfflineQueue]);

  // Fetch when filters/pagination change
  useEffect(() => {
    fetchOrders();
  }, [filterStatus, page, pageSize, isAscending]);

  // Debounced Search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page !== 1) setPage(1);
      else fetchOrders();

      // Also update counts when search changes
      fetchStatusCounts();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // --- CRUD Operations ---

  const handleCreateOrder = async (orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'orderNo'>) => {
    try {
      const { error } = await supabase.from('orders').insert([{
        order_no: generateOrderNo(),
        customer_id: orderData.customerId,
        product_id: orderData.productId,
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

      if (error) throw error;

      showToast('Pesanan berhasil dibuat!', 'success');
      setView('LIST');
      fetchOrders();
      fetchStatusCounts();
    } catch (error: any) {
      showToast(getErrorMessage(error), 'error');
    }
  };

  const handleUpdateOrder = async (orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'orderNo'>) => {
    if (!activeOrder) return;

    try {
      const { error } = await supabase
        .from('orders')
        .update({
          customer_id: orderData.customerId,
          product_id: orderData.productId,
          customer_name: orderData.customerName,
          product_name: orderData.productName,
          quantity: orderData.quantity,
          description: orderData.description,
          status: orderData.status,
          preview_image: orderData.previewImages,
          design_file: orderData.designFiles,
          receipt_file: orderData.receiptFile,
          updated_at: new Date().toISOString(),
          channel: orderData.channel,
          recipient_name: orderData.recipientName,
          recipient_phone: orderData.recipientPhone,
          address: orderData.address
        })
        .eq('id', activeOrder.id);

      if (error) throw error;

      showToast('Pesanan diperbarui!', 'success');

      // Update local state immediately for better UX
      const updatedOrder = { ...activeOrder, ...orderData, updatedAt: Date.now() };
      setOrders(orders.map(o => o.id === activeOrder.id ? updatedOrder : o));
      setActiveOrder(updatedOrder);

      fetchStatusCounts();

      // Return to detail view
      setView('DETAIL');
    } catch (error: any) {
      showToast(getErrorMessage(error), 'error');
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: OrderStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      showToast(`Status diubah ke ${newStatus}`, 'success');

      // Update list locally
      setOrders(orders.map(o => o.id === id ? { ...o, status: newStatus } : o));

      // Update detail view if active
      if (activeOrder && activeOrder.id === id) {
        setActiveOrder({ ...activeOrder, status: newStatus });
      }

      fetchStatusCounts();
    } catch (error: any) {
      showToast(getErrorMessage(error), 'error');
    }
  };

  const handleEditRequest = (order: Order) => {
    const isProcessing = order.status === OrderStatus.PROCESSING;
    // If PROCESSING -> Random Code, Else -> Secret Code
    const code = isProcessing ? generateVerificationCode() : SECRET_CODE;

    setModal({
      show: true,
      title: isProcessing ? 'Konfirmasi Edit' : 'Akses Terbatas',
      message: isProcessing
        ? 'Pesanan ini sedang diproses. Masukkan kode verifikasi acak di bawah untuk melanjutkan pengeditan.'
        : `Status pesanan "${order.status}". Diperlukan kode otorisasi supervisor untuk mengedit data ini.`,
      isDanger: false,
      verificationText: code,
      hideVerificationCode: !isProcessing, // Hide if using secret code
      confirmText: 'Verifikasi & Edit',
      action: () => {
        setModal(prev => ({ ...prev, show: false }));
        setActiveOrder(order);
        setMode('edit');
        setView('FORM');
      }
    });
  };

  const handleDeleteOrder = (id: string) => {
    const orderToDelete = orders.find(o => o.id === id);
    if (!orderToDelete) return;

    const isProcessing = orderToDelete.status === OrderStatus.PROCESSING;
    // If PROCESSING -> Random Code, Else -> Secret Code
    const verificationCode = isProcessing ? generateVerificationCode() : SECRET_CODE;

    setModal({
      show: true,
      title: 'Hapus Pesanan?',
      message: isProcessing
        ? 'Tindakan ini akan menghapus permanen data pesanan. Masukkan kode konfirmasi untuk melanjutkan.'
        : `Status pesanan "${orderToDelete.status}". Diperlukan kode otorisasi supervisor untuk menghapus data ini.`,
      isDanger: true,
      verificationText: verificationCode,
      hideVerificationCode: !isProcessing,
      confirmText: 'Hapus & Bersihkan',
      action: async () => {
        try {
          if (orderToDelete) {
            const filePaths = getAllOrderFilePaths(orderToDelete);
            if (filePaths.length > 0) {
              const { error: storageError } = await supabase.storage
                .from('sablon-files')
                .remove(filePaths);
              if (storageError) console.error("Storage cleanup warning:", storageError);
            }
          }
          const { error } = await supabase.from('orders').delete().eq('id', id);
          if (error) throw error;

          showToast('Pesanan dan file terkait telah dihapus.', 'success');
          setModal(prev => ({ ...prev, show: false }));
          setView('LIST');
          setActiveOrder(null);
          fetchOrders();
          fetchStatusCounts();
        } catch (err: any) {
          showToast(getErrorMessage(err), 'error');
        }
      }
    });
  };

  const handleCopyOrder = (order: Order) => {
    // COPY STRATEGY: 
    // We create a deep copy but explicitly reset identifiers and unique files
    const orderCopy = {
      ...order,
      id: '', // Reset ID so Form treats it as NEW
      orderNo: '', // Will be generated on save
      status: OrderStatus.PROCESSING, // Reset status
      receiptFile: null, // Always remove payment proof (must be new)
      createdAt: Date.now(),
      updatedAt: Date.now()
      // Note: previewImages and designFiles are kept as URLs.
      // OrderForm's uploadFiles logic will handle the server-side duplication of these files
      // to ensure the new order has its own independent files.
    };

    setActiveOrder(orderCopy);
    setMode('create'); // Treats as create mode with initial data
    setView('FORM');
    showToast(`Menyalin pesanan ${order.customerName}...`, 'info');
  };

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowInstallBtn(false);
    }
  };

  const handleUpdateApp = () => {
    if (swRegistration && swRegistration.waiting) {
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      // The generic 'controllerchange' in index.tsx will pick this up and reload
      setIsUpdateAvailable(false);
    }
  };

  // --- Views Renders ---

  // Common Components shared across views
  const CommonModals = () => (
    <>
      <ConfirmationModal
        isOpen={modal.show}
        title={modal.title}
        message={modal.message}
        isDanger={modal.isDanger}
        verificationText={modal.verificationText}
        hideVerificationCode={modal.hideVerificationCode}
        confirmText={modal.confirmText}
        onConfirm={modal.action}
        onCancel={() => setModal(prev => ({ ...prev, show: false }))}
      />
      <Toast isVisible={toast.show} message={toast.message} type={toast.type} onClose={() => setToast(prev => ({ ...prev, show: false }))} />
      <ExportModal isOpen={showExportModal} onClose={() => setShowExportModal(false)} onError={(msg) => showToast(msg, 'error')} />
      <PWAStatusModal
        isOpen={showPwaModal}
        onClose={() => setShowPwaModal(false)}
        deferredPrompt={deferredPrompt}
        onInstall={handleInstallPWA}
        isUpdateAvailable={isUpdateAvailable}
        onUpdate={handleUpdateApp}
        onOpenCustomers={() => { setShowPwaModal(false); setView('CUSTOMERS'); }}
        onOpenProducts={() => { setShowPwaModal(false); setView('PRODUCTS'); }}
      />
    </>
  );

  // --- MAIN LAYOUT STRUCTURE ---
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="flex flex-col md:flex-row h-screen bg-dark overflow-hidden">


      {/* --- DESKTOP SIDEBAR (Visible on md+) --- */}
      <aside className="hidden md:flex w-72 flex-col border-r border-zinc-800 bg-zinc-900/50 backdrop-blur-xl h-full overflow-y-auto">

        <div className="p-6 border-b border-zinc-800 flex items-center justify-center">
          <img
            src="https://lh3.googleusercontent.com/d/18psWwD9_5OGLeFlAZqG2-UxJgxbp3uUQ"
            alt="REMA Logo"
            className="w-52 h-auto object-contain"
          />
        </div>

        <div className="p-4 space-y-4 flex-1 overflow-y-auto">
          <button
            onClick={() => { setActiveOrder(null); setMode('create'); setView('FORM'); }}
            className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Pesanan Baru</span>
          </button>

          <div className="space-y-1 mt-6">
            <p className="px-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Filter Status</p>

            {/* ALL Button */}
            <button
              onClick={() => { setFilterStatus('ALL'); setPage(1); setView('LIST'); }}
              className={`w-full flex justify-between items-center px-4 py-3 rounded-xl text-sm font-medium transition-all group ${filterStatus === 'ALL' && view === 'LIST' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}
            >
              <span className="flex-1 text-left">Semua Pesanan</span>
              <div className="flex flex-col items-end gap-0.5">
                <span className={`text-[10px] font-bold transition-colors ${filterStatus === 'ALL' && view === 'LIST' ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
                  {new Intl.NumberFormat('id-ID').format(qtyCounts['ALL'] || 0)} pcs
                </span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${filterStatus === 'ALL' && view === 'LIST' ? 'bg-zinc-700 text-zinc-300 border-zinc-600' : 'bg-zinc-800 text-zinc-500 border-zinc-800'}`}>
                  {statusCounts['ALL'] || 0} orders
                </span>
              </div>
            </button>

            {/* Status Buttons */}
            {Object.values(OrderStatus).map((status) => (
              <button
                key={status}
                onClick={() => { setFilterStatus(status); setPage(1); setView('LIST'); }}
                className={`w-full flex justify-between items-center px-4 py-3 rounded-xl text-sm font-medium transition-all group ${filterStatus === status && view === 'LIST' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}
              >
                <div className="flex items-center gap-3">
                  {/* Status Indicator Dot */}
                  <div className={`w-2 h-2 rounded-full ${status === OrderStatus.PROCESSING ? 'bg-blue-500' :
                    status === OrderStatus.PRINTING ? 'bg-amber-500' :
                      status === OrderStatus.PACKING ? 'bg-purple-500' : 'bg-emerald-500'
                    }`}></div>
                  <span className="flex-1 text-left">{status}</span>
                </div>

                <div className="flex flex-col items-end gap-0.5">
                  <span className={`text-[10px] font-bold transition-colors ${filterStatus === status && view === 'LIST' ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
                    {new Intl.NumberFormat('id-ID').format(qtyCounts[status] || 0)} pcs
                  </span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${filterStatus === status && view === 'LIST' ? 'bg-zinc-700 text-zinc-300 border-zinc-600' : 'bg-zinc-800 text-zinc-500 border-zinc-800'}`}>
                    {statusCounts[status] || 0} orders
                  </span>
                </div>
              </button>
            ))}
          </div>

          <div className="space-y-1 mt-6 border-t border-zinc-800 pt-6">
            <p className="px-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Master Data</p>
            <button
              onClick={() => setView('CUSTOMERS')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group ${view === 'CUSTOMERS' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}
            >
              <DatabaseIcon className="w-4 h-4" />
              <span className="flex-1 text-left">Pelanggan</span>
            </button>
            <button
              onClick={() => setView('PRODUCTS')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group ${view === 'PRODUCTS' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}
            >
              <DatabaseIcon className="w-4 h-4" />
              <span className="flex-1 text-left">Produk</span>
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-zinc-800">
          <div className="flex gap-2">
            <button onClick={() => setShowPwaModal(true)} className="relative flex-1 py-2 bg-zinc-800 text-zinc-400 hover:text-white rounded-lg text-xs font-bold transition-all">
              System Info
              {isUpdateAvailable && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-zinc-900 animate-pulse"></span>}
            </button>
            <button onClick={() => setShowExportModal(true)} className="flex-1 py-2 bg-zinc-800 text-zinc-400 hover:text-white rounded-lg text-xs font-bold transition-all">Export PDF</button>
          </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 flex flex-col relative overflow-y-auto h-full">











        {/* --- DESKTOP HEADER (Visible on md+) --- */}
        <header className="hidden md:flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-md">
          <h2 className="text-xl font-bold text-white">
            {view === 'LIST' ? 'Dashboard Pesanan' : view === 'FORM' ? (mode === 'create' ? (activeOrder?.customerName ? 'Salin Pesanan' : 'Buat Pesanan Baru') : 'Edit Pesanan') : view === 'DETAIL' ? 'Detail Pesanan' : view === 'CUSTOMERS' ? 'Database Pelanggan' : 'Database Produk'}
          </h2>

          {view === 'LIST' && (
            <div className="flex items-center gap-4 w-1/2 justify-end">
              <div className="relative w-full max-w-md group">
                <SearchIcon className="absolute left-3 top-3 w-5 h-5 text-zinc-500 group-focus-within:text-primary transition-colors" />
                <input
                  type="text"
                  placeholder="Cari pesanan, pelanggan, produk..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-black/50 border border-zinc-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                />
              </div>
              <div className="flex items-center gap-2 border-l border-zinc-700 pl-4">
                <span className="text-xs text-zinc-500 font-bold uppercase mr-1">Sort</span>
                <button
                  onClick={() => setIsAscending(!isAscending)}
                  className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
                >
                  {isAscending ? <SortAscIcon className="w-5 h-5" /> : <SortDescIcon className="w-5 h-5" />}
                </button>
              </div>
            </div>
          )}
        </header>

        {/* --- MOBILE HEADER (Hidden on md+) --- */}
        <div className="md:hidden glass-header z-30 pt-4 pb-2 px-4 border-b-0">



          {/* Only show full header in LIST view, simplified for others */}
          {view === 'LIST' ? (
            <>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center">
                  <img
                    src="https://lh3.googleusercontent.com/d/18psWwD9_5OGLeFlAZqG2-UxJgxbp3uUQ"
                    alt="REMA Logo"
                    className="h-14 w-auto object-contain"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowPwaModal(true)}
                    className={`relative p-2 rounded-xl transition-all ${showInstallBtn ? 'bg-primary/20 text-primary animate-pulse' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
                  >
                    <InfoIcon />
                    {isUpdateAvailable && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-zinc-900"></span>}
                  </button>
                  <button onClick={() => setShowExportModal(true)} className="p-2 bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-all">
                    <DownloadIcon />
                  </button>
                </div>
              </div>

              <button
                onClick={() => { setActiveOrder(null); setMode('create'); setView('FORM'); }}
                className="w-full mb-4 py-4 rounded-2xl bg-gradient-to-r from-primary to-primary-dark text-white font-black text-lg shadow-xl shadow-primary/20 flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
              >
                <PlusIcon className="w-6 h-6" />
                <span className="tracking-wide">BUAT PESANAN BARU</span>
              </button>

              <div className="relative mb-2">
                <SearchIcon className="absolute left-3 top-3.5 w-5 h-5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Cari..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-zinc-900/80 border border-zinc-700 rounded-2xl pl-10 pr-10 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
                <button
                  onClick={() => setIsAscending(!isAscending)}
                  className="absolute right-2 top-2 p-1.5 text-zinc-500 hover:text-white rounded-lg transition-colors"
                >
                  {isAscending ? <SortAscIcon className="w-5 h-5" /> : <SortDescIcon className="w-5 h-5" />}
                </button>
              </div>
            </>
          ) : null}
        </div>

        {/* --- MOBILE STATUS DROPDOWN (Hidden on md+) --- */}
        {view === 'LIST' && (
          <div className="md:hidden z-20 bg-dark/95 backdrop-blur-md border-b border-white/5 shadow-2xl shadow-black/50 px-4 py-3">
            <SearchableSelect
              options={[
                { value: 'ALL', label: `Semua Pesanan (${new Intl.NumberFormat('id-ID').format(qtyCounts['ALL'] || 0)} pcs, ${statusCounts['ALL'] || 0} orders)` },
                ...Object.values(OrderStatus).map((status) => ({
                  value: status,
                  label: `${status} (${new Intl.NumberFormat('id-ID').format(qtyCounts[status] || 0)} pcs, ${statusCounts[status] || 0} orders)`
                }))
              ]}
              value={filterStatus}
              onChange={(val) => { setFilterStatus(val as OrderStatus | 'ALL'); setPage(1); }}
              placeholder="Pilih Status"
            />
          </div>
        )}


        {/* --- VIEW CONTENT --- */}
        <div className="bg-dark/50 p-0 sm:p-0 md:p-6 relative flex-1">











          {view === 'FORM' && (
            <div className="w-full h-full md:max-w-4xl md:mx-auto">
              <OrderForm
                onBack={() => setView('LIST')}
                onSubmit={mode === 'create' ? handleCreateOrder : handleUpdateOrder}
                initialData={mode === 'edit' && activeOrder ? activeOrder : (mode === 'create' && activeOrder ? activeOrder : undefined)}
                mode={mode}
                onError={(msg) => showToast(msg, 'error')}
                onOfflineQueued={() => {
                  setView('LIST');
                  showToast('Sedang offline. Pesanan disimpan di antrean dan akan dikirim saat online', 'info');
                }}
              />
            </div>
          )}

          {view === 'DETAIL' && activeOrder && (
            <div className="w-full h-full md:max-w-6xl md:mx-auto">
              <OrderDetail
                order={activeOrder}
                onBack={() => setView('LIST')}
                onUpdateStatus={handleUpdateStatus}
                onDelete={handleDeleteOrder}
                onEdit={handleEditRequest}
                onCopy={handleCopyOrder}
              />
            </div>
          )}

          {view === 'CUSTOMERS' && (
            <CustomerPage onToast={showToast} />
          )}

          {view === 'PRODUCTS' && (
            <ProductPage onToast={showToast} />
          )}

          {view === 'LIST' && (
            <>
              {/* MOBILE LIST VIEW */}
              <div className="md:hidden p-4 space-y-3">



                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20 opacity-50 space-y-4">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xs text-zinc-500 font-mono animate-pulse">Memuat Data...</p>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
                    <DatabaseIcon className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-sm font-medium">Tidak ada pesanan ditemukan</p>
                  </div>
                ) : (
                  orders.map((order, idx) => {
                    const ageInfo = getOrderAgeInfo(order.createdAt, order.status);

                    return (
                      <div
                        key={order.id}
                        onClick={() => { setActiveOrder(order); setView('DETAIL'); }}
                        className={`glass-card rounded-2xl p-4 active:scale-[0.98] transition-transform animate-slide-up border ${ageInfo.borderColorClass} ${ageInfo.bgClass}`}
                        style={{ animationDelay: `${idx * 0.05}s` }}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex gap-3 items-center">
                            {order.previewImages && order.previewImages.length > 0 ? (
                              <img src={order.previewImages[0].url} className="w-12 h-12 rounded-lg object-cover bg-zinc-800 border border-zinc-700" alt="Preview" />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-600">
                                <ImageIcon className="w-5 h-5" />
                              </div>
                            )}
                            <div>
                              <h3 className="font-bold text-zinc-100 line-clamp-1">{order.customerName}</h3>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">#{order.orderNo}</span>
                                <span className={`text-[10px] ${ageInfo.colorClass}`}>
                                  {ageInfo.label}
                                </span>
                              </div>
                            </div>
                          </div>
                          <StatusBadge status={order.status} size="sm" />
                        </div>
                        <div className="flex justify-between items-start border-t border-white/5 pt-3 gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Produk</p>
                            <p className="text-sm font-bold text-zinc-200 break-words leading-snug">{order.productName}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Qty</p>
                            <p className="text-sm font-black text-white">{order.quantity} pcs</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* MOBILE PAGINATION - At end of content */}
                <div className="mt-6 pt-4 pb-8 border-t border-white/10 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium text-zinc-500">
                      Showing <span className="text-zinc-300">{(page - 1) * pageSize + 1}</span> - <span className="text-zinc-300">{Math.min(page * pageSize, totalCount)}</span> of <span className="text-zinc-300">{totalCount}</span>
                    </span>
                    <select
                      value={pageSize}
                      onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                      className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded-lg px-2 py-1 outline-none focus:border-primary"
                    >
                      <option value={10}>10 Baris</option>
                      <option value={25}>25 Baris</option>
                      <option value={50}>50 Baris</option>
                      <option value={100}>100 Baris</option>
                    </select>
                  </div>

                  <div className="flex gap-3 items-center justify-center">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="h-10 px-4 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl disabled:opacity-30 disabled:cursor-not-allowed border border-zinc-700"
                    >
                      <ChevronLeftIcon className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-bold text-white">Page {page} / {totalPages || 1}</span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="h-10 px-4 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl disabled:opacity-30 disabled:cursor-not-allowed border border-zinc-700"
                    >
                      <ChevronRightIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* DESKTOP TABLE VIEW */}

              <div className="hidden md:block">
                <DesktopTable
                  orders={orders}
                  onRowClick={(order) => { setActiveOrder(order); setView('DETAIL'); }}
                  isLoading={loading}
                />
              </div>

            </>
          )}
        </div>

        {/* DESKTOP PAGINATION (Flow below content - only visible on md+) */}
        {view === 'LIST' && (
          <div className="hidden md:flex bg-zinc-900/90 backdrop-blur-xl border-t border-white/10 pb-6 pt-3 px-4 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] flex-col sm:flex-row justify-between items-center gap-3 mt-6">




            <div className="flex items-center gap-3 w-full sm:w-auto justify-between">
              <span className="text-[10px] font-medium text-zinc-500">
                Showing <span className="text-zinc-300">{(page - 1) * pageSize + 1}</span> - <span className="text-zinc-300">{Math.min(page * pageSize, totalCount)}</span> of <span className="text-zinc-300">{totalCount}</span>
              </span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded-lg px-2 py-1 outline-none focus:border-primary"
              >
                <option value={10}>10 Baris</option>
                <option value={25}>25 Baris</option>
                <option value={50}>50 Baris</option>
                <option value={100}>100 Baris</option>
              </select>
            </div>

            <div className="flex gap-3 items-center w-full sm:w-auto">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-10 px-4 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl disabled:opacity-30 disabled:cursor-not-allowed border border-zinc-700"
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
              <span className="text-sm font-bold text-white">Page {page} / {totalPages || 1}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="h-10 px-4 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl disabled:opacity-30 disabled:cursor-not-allowed border border-zinc-700"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </main>

      <CommonModals />
    </div>
  );
}
