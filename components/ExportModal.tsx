


import React, { useState } from 'react';
import { supabase } from '../supabase';
import { generateOrdersPDF } from '../utils/pdfGenerator';
import { generateCSV, generateExcel } from '../utils/exportHelper';
import { OrderStatus, OrderRow } from '../types';
import { mapRowToOrder } from '../utils';
import { DownloadIcon, FileSpreadsheetIcon, FileCsvIcon, FilePdfIcon, CheckCircleIcon } from './icons';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onError: (msg: string) => void;
}

type ExportFormat = 'PDF' | 'EXCEL' | 'CSV';
type ChannelFilter = 'ALL' | 'ONLINE' | 'OFFLINE';
type DateRangePreset = 'TODAY' | 'THIS_MONTH' | 'LAST_MONTH' | 'CUSTOM';

export const ExportModal: React.FC<Props> = ({ isOpen, onClose, onError }) => {
  // --- DATE HELPER (LOCAL TIME) ---
  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayDate = new Date();
  const firstDayDate = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
  
  const [startDate, setStartDate] = useState(getLocalDateString(firstDayDate));
  const [endDate, setEndDate] = useState(getLocalDateString(todayDate));
  const [preset, setPreset] = useState<DateRangePreset>('THIS_MONTH');
  
  // Filters
  const [status, setStatus] = useState<OrderStatus | 'ALL'>('ALL');
  const [channel, setChannel] = useState<ChannelFilter>('ALL');
  const [searchKeyword, setSearchKeyword] = useState(''); 
  
  const [format, setFormat] = useState<ExportFormat>('PDF');
  const [loading, setLoading] = useState(false);

  // Quick Date Handlers
  const applyPreset = (p: DateRangePreset) => {
    setPreset(p);
    const now = new Date();
    
    if (p === 'TODAY') {
        const str = getLocalDateString(now);
        setStartDate(str);
        setEndDate(str);
    } else if (p === 'THIS_MONTH') {
        const first = new Date(now.getFullYear(), now.getMonth(), 1);
        setStartDate(getLocalDateString(first));
        setEndDate(getLocalDateString(now));
    } else if (p === 'LAST_MONTH') {
        const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const last = new Date(now.getFullYear(), now.getMonth(), 0);
        setStartDate(getLocalDateString(first));
        setEndDate(getLocalDateString(last));
    }
  };

  const handleDateChange = (type: 'start' | 'end', val: string) => {
    setPreset('CUSTOM');
    if (type === 'start') setStartDate(val);
    else setEndDate(val);
  };

  if (!isOpen) return null;

  const handleExport = async () => {
    setLoading(true);
    try {
      // 1. Build Query
      let query = supabase
        .from('orders')
        .select('*');

      // 2. Apply Date Range
      const startISO = new Date(`${startDate}T00:00:00`).toISOString();
      const endISO = new Date(`${endDate}T23:59:59.999`).toISOString();

      query = query.gte('created_at', startISO)
                   .lte('created_at', endISO);

      // 3. Filters
      if (status !== 'ALL') query = query.eq('status', status);
      if (channel !== 'ALL') query = query.eq('channel', channel);
      if (searchKeyword) {
        query = query.or(`customer_name.ilike.%${searchKeyword}%,order_no.ilike.%${searchKeyword}%,product_name.ilike.%${searchKeyword}%`);
      }

      // Limit
      const { data, error } = await query
          .order('created_at', { ascending: false })
          .limit(5000); 

      if (error) throw error;

      if (!data || data.length === 0) {
        onError("Tidak ada data ditemukan untuk periode & filter ini.");
        setLoading(false);
        return;
      }

      const orders = data.map(row => mapRowToOrder(row as OrderRow));

      if (format === 'PDF') {
          await generateOrdersPDF(orders, { startDate, endDate, status, channel, searchKeyword });
      } else if (format === 'EXCEL') {
          generateExcel(orders);
      } else if (format === 'CSV') {
          generateCSV(orders);
      }

      onClose();
    } catch (err: any) {
      console.error(err);
      onError(err.message || "Gagal mengunduh laporan.");
    } finally {
      setLoading(false);
    }
  };

  const FormatOption = ({ type, label, icon }: { type: ExportFormat, label: string, icon: React.ReactNode }) => {
     const isSelected = format === type;
     let activeClass = '';
     if (isSelected) {
         if (type === 'PDF') activeClass = 'bg-red-500/20 border-red-500 text-red-500 shadow-red-500/20 ring-1 ring-red-500';
         if (type === 'EXCEL') activeClass = 'bg-emerald-500/20 border-emerald-500 text-emerald-500 shadow-emerald-500/20 ring-1 ring-emerald-500';
         if (type === 'CSV') activeClass = 'bg-blue-500/20 border-blue-500 text-blue-500 shadow-blue-500/20 ring-1 ring-blue-500';
     } else {
         activeClass = 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200';
     }

     return (
        <button
           onClick={() => setFormat(type)}
           className={`flex-1 flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${activeClass}`}
        >
           <div className="mb-2">{icon}</div>
           <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
        </button>
     );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>
      
      <div className="glass-modal w-full max-w-md rounded-3xl p-6 relative z-10 animate-pop-in shadow-2xl shadow-black border-zinc-700 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-black text-white">Ekspor Data</h3>
            <p className="text-xs text-zinc-500">Unduh laporan pesanan</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-800 text-zinc-500 hover:text-white transition-colors">✕</button>
        </div>

        <div className="space-y-6">
          {/* Format Selection */}
          <div>
             <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Pilih Format</label>
             <div className="flex gap-3">
                 <FormatOption type="PDF" label="PDF Report" icon={<FilePdfIcon className="w-6 h-6" />} />
                 <FormatOption type="EXCEL" label="Excel (.xlsx)" icon={<FileSpreadsheetIcon className="w-6 h-6" />} />
                 <FormatOption type="CSV" label="CSV Data" icon={<FileCsvIcon className="w-6 h-6" />} />
             </div>
          </div>

          <div className="h-px bg-zinc-800 w-full"></div>

          {/* Date Range Section */}
          <div>
             <div className="flex justify-between items-center mb-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Periode Waktu</label>
                {/* Quick Buttons */}
                <div className="flex bg-zinc-800 rounded-lg p-0.5">
                    {[
                        { id: 'TODAY', label: 'Hari Ini' },
                        { id: 'THIS_MONTH', label: 'Bulan Ini' },
                        { id: 'LAST_MONTH', label: 'Bulan Lalu' }
                    ].map((p) => (
                        <button
                            key={p.id}
                            onClick={() => applyPreset(p.id as DateRangePreset)}
                            className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${
                                preset === p.id 
                                ? 'bg-zinc-600 text-white shadow-sm' 
                                : 'text-zinc-400 hover:text-zinc-200'
                            }`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
             </div>
             
             <div className="grid grid-cols-2 gap-3">
                <div className="group relative">
                    <span className="absolute top-2 left-3 text-[10px] font-bold text-zinc-500">DARI</span>
                    <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => handleDateChange('start', e.target.value)}
                    className="w-full bg-black/50 border border-zinc-700 rounded-xl px-3 pt-6 pb-2 text-zinc-200 text-sm focus:border-primary outline-none transition-colors h-[50px]"
                    />
                </div>
                <div className="group relative">
                    <span className="absolute top-2 left-3 text-[10px] font-bold text-zinc-500">SAMPAI</span>
                    <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => handleDateChange('end', e.target.value)}
                    className="w-full bg-black/50 border border-zinc-700 rounded-xl px-3 pt-6 pb-2 text-zinc-200 text-sm focus:border-primary outline-none transition-colors h-[50px]"
                    />
                </div>
             </div>
          </div>

          <div className="h-px bg-zinc-800 w-full"></div>

          {/* Advanced Filters */}
          <div className="grid grid-cols-2 gap-4">
               <div>
                   <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Status</label>
                   <select 
                        value={status}
                        onChange={(e) => setStatus(e.target.value as OrderStatus | 'ALL')}
                        className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-200 text-xs focus:border-primary outline-none h-[40px]"
                   >
                        <option value="ALL">Semua Status</option>
                        {Object.values(OrderStatus).map(s => <option key={s} value={s}>{s}</option>)}
                   </select>
               </div>
               <div>
                   <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Channel</label>
                   <select 
                        value={channel}
                        onChange={(e) => setChannel(e.target.value as ChannelFilter)}
                        className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-200 text-xs focus:border-primary outline-none h-[40px]"
                   >
                        <option value="ALL">Semua Channel</option>
                        <option value="ONLINE">Online</option>
                        <option value="OFFLINE">Offline</option>
                   </select>
               </div>
          </div>
          
          {/* Keyword Search */}
          <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Kata Kunci (Opsional)</label>
                <input 
                    type="text" 
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    placeholder="Nama pelanggan, produk, atau No Order..."
                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-200 text-xs focus:border-primary outline-none"
                />
          </div>

          <button
            onClick={handleExport}
            disabled={loading}
            className="w-full mt-6 py-4 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
                <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Memproses...</span>
                </>
            ) : (
                <>
                    <DownloadIcon className="w-5 h-5" />
                    <span>Download Laporan</span>
                </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
