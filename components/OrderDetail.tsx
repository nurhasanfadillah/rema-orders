
import React, { useState, useRef, useEffect } from 'react';
import { Order, OrderStatus, FileData } from '../types';
import { formatDate } from '../utils';
import { generateSPKPDF, generateShippingLabelPDF } from '../utils/pdfGenerator';
import { ChevronLeftIcon, ChevronRightIcon, DownloadIcon, FileTextIcon, TrashIcon, CheckCircleIcon, CopyIcon, MaximizeIcon, XIcon, GlobeIcon, ZapIcon, PrinterIcon, TruckIcon, EditIcon, MoreHorizontalIcon, ShareIcon, ImageIcon } from './icons';
import { StatusBadge } from './StatusBadge';

interface Props {
  order: Order;
  onBack: () => void;
  onUpdateStatus: (id: string, status: OrderStatus) => void;
  onDelete: (id: string) => void;
  onEdit: (order: Order) => void;
  onCopy: (order: Order) => void;
}

export const OrderDetail: React.FC<Props> = ({ order, onBack, onUpdateStatus, onDelete, onEdit, onCopy }) => {
  const [activePreviewIdx, setActivePreviewIdx] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showLabelInput, setShowLabelInput] = useState(false);
  const [senderPhoneInput, setSenderPhoneInput] = useState('');
  const [scrollPosition, setScrollPosition] = useState(0);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Status Progression Logic
  const statusSteps = [OrderStatus.PROCESSING, OrderStatus.PRINTING, OrderStatus.PACKING, OrderStatus.SHIPPED];
  const currentStatusIdx = statusSteps.indexOf(order.status);
  
  const nextStatusMap: Record<string, OrderStatus> = {
    [OrderStatus.PROCESSING]: OrderStatus.PRINTING,
    [OrderStatus.PRINTING]: OrderStatus.PACKING,
    [OrderStatus.PACKING]: OrderStatus.SHIPPED,
  };
  const nextStatus = nextStatusMap[order.status];
  
  const hasPreviews = order.previewImages && order.previewImages.length > 0;
  const currentImage = hasPreviews ? order.previewImages[activePreviewIdx] : null;

  // Handle scroll effect for mobile header
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollPosition(e.currentTarget.scrollTop);
  };

  const handleDownload = (file: FileData) => {
    window.open(file.url, '_blank');
  };
  
  const handlePrintSPK = () => {
    generateSPKPDF(order);
    setShowMenu(false);
  };

  const initiatePrintLabel = () => {
    setSenderPhoneInput('');
    setShowLabelInput(true);
    setShowMenu(false);
  };

  const confirmPrintLabel = () => {
    generateShippingLabelPDF(order, senderPhoneInput);
    setShowLabelInput(false);
  };

  // --- UI COMPONENTS ---

  const ProgressBar = () => (
    <div className="w-full mb-6 px-1">
        <div className="flex justify-between items-center mb-2">
            {statusSteps.map((step, idx) => {
                const isActive = idx <= currentStatusIdx;
                const isCurrent = idx === currentStatusIdx;
                return (
                    <div key={step} className="flex flex-col items-center flex-1 relative z-10">
                        <div className={`w-3 h-3 md:w-4 md:h-4 rounded-full transition-all duration-500 border-2 ${isActive ? 'bg-primary border-primary' : 'bg-zinc-800 border-zinc-600'} ${isCurrent ? 'ring-4 ring-primary/20 scale-125' : ''}`}></div>
                        <span className={`text-[9px] md:text-[10px] mt-2 font-bold uppercase tracking-wider transition-colors text-center ${isActive ? 'text-zinc-200' : 'text-zinc-600'}`}>
                            {step}
                        </span>
                    </div>
                );
            })}
        </div>
        <div className="relative h-1 bg-zinc-800 rounded-full -mt-7 mx-4 md:mx-6 z-0">
            <div 
                className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all duration-700 ease-out"
                style={{ width: `${(currentStatusIdx / (statusSteps.length - 1)) * 100}%` }}
            ></div>
        </div>
    </div>
  );

  const MobileHero = () => (
    <div className="relative w-full h-[40vh] md:hidden bg-zinc-900 shrink-0">
        {hasPreviews ? (
            <img 
                src={order.previewImages[0].url} 
                className="w-full h-full object-cover"
                alt="Main Preview"
                onClick={() => setIsLightboxOpen(true)}
            />
        ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-800 text-zinc-600">
                <ImageIcon className="w-16 h-16 opacity-30" />
                <span className="text-xs font-bold mt-2 opacity-50">NO PREVIEW</span>
            </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-dark"></div>
        
        {/* Mobile Header Overlay */}
        <div className={`absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20 transition-all duration-300 ${scrollPosition > 50 ? 'bg-dark/90 backdrop-blur-md shadow-lg py-3' : 'bg-transparent'}`}>
             <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm text-white border border-white/10 active:scale-95 transition-transform">
                 <ChevronLeftIcon className="w-6 h-6" />
             </button>
             <div className={`transition-opacity duration-300 flex flex-col items-center ${scrollPosition > 50 ? 'opacity-100' : 'opacity-0'}`}>
                 <span className="text-xs font-bold text-zinc-400">Order #{order.orderNo}</span>
                 <span className="text-sm font-bold text-white truncate max-w-[150px]">{order.customerName}</span>
             </div>
             <button onClick={() => setShowMenu(true)} className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm text-white border border-white/10 active:scale-95 transition-transform">
                 <MoreHorizontalIcon className="w-6 h-6" />
             </button>
        </div>

        {/* Hero Content (Bottom) */}
        <div className="absolute bottom-4 left-4 right-4 z-10">
             <div className="flex justify-between items-end">
                 <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1 bg-black/50 backdrop-blur-sm ${order.channel === 'OFFLINE' ? 'text-amber-400 border-amber-500/30' : 'text-blue-400 border-blue-500/30'}`}>
                            {order.channel === 'OFFLINE' ? <ZapIcon className="w-3 h-3" /> : <GlobeIcon className="w-3 h-3" />}
                            {order.channel}
                        </span>
                        <StatusBadge status={order.status} size="sm" />
                    </div>
                    <h1 className="text-2xl font-black text-white drop-shadow-md leading-tight line-clamp-2">{order.customerName}</h1>
                    <p className="text-zinc-300 text-sm font-medium drop-shadow-md">{order.productName}</p>
                 </div>
                 {hasPreviews && (
                     <button onClick={() => setIsLightboxOpen(true)} className="p-2 bg-black/50 backdrop-blur-md rounded-full text-white border border-white/20">
                         <MaximizeIcon className="w-5 h-5" />
                     </button>
                 )}
             </div>
        </div>
    </div>
  );

  const DesktopGallery = () => (
    <div className="relative w-full group hidden md:block">
       {hasPreviews && currentImage ? (
          <>
            <div 
              className="relative aspect-[4/3] w-full bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 cursor-zoom-in"
              onClick={() => setIsLightboxOpen(true)}
            >
               <img 
                  src={currentImage.url} 
                  alt="Preview" 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
               />
               <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 bg-black/50 backdrop-blur-sm p-3 rounded-full text-white transition-all transform translate-y-4 group-hover:translate-y-0">
                     <MaximizeIcon className="w-6 h-6" />
                  </div>
               </div>
            </div>
            {order.previewImages.length > 1 && (
               <div className="flex gap-3 overflow-x-auto pb-2 mt-4 no-scrollbar">
                  {order.previewImages.map((img, idx) => (
                    <button 
                      key={idx}
                      onClick={() => setActivePreviewIdx(idx)}
                      className={`relative h-16 w-16 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all ${idx === activePreviewIdx ? 'border-primary ring-2 ring-primary/30' : 'border-zinc-700 opacity-60 hover:opacity-100'}`}
                    >
                        <img src={img.url} className="w-full h-full object-cover" />
                    </button>
                  ))}
               </div>
            )}
          </>
       ) : (
          <div className="aspect-[4/3] w-full bg-zinc-800/50 rounded-2xl border border-zinc-700 border-dashed flex flex-col items-center justify-center text-zinc-500 gap-3">
             <div className="p-4 bg-zinc-800 rounded-full">
                <FileTextIcon className="w-8 h-8 opacity-50" />
             </div>
             <span className="text-sm font-medium">Tidak ada preview</span>
          </div>
       )}
    </div>
  );

  return (
    <>
      <div className="flex flex-col h-full bg-dark relative animate-fade-in overflow-hidden">
        
        {/* --- DESKTOP HEADER (MD+) --- */}
        <div className="hidden md:flex glass-header px-8 py-5 items-center justify-between sticky top-0 z-30">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 -ml-2 text-zinc-400 rounded-xl hover:bg-zinc-800 hover:text-white transition-all border border-transparent hover:border-zinc-700">
                    <ChevronLeftIcon />
                </button>
                <div className="h-6 w-px bg-zinc-800"></div>
                <div>
                   <h1 className="text-lg font-bold text-white flex items-center gap-2">
                      #{order.orderNo} 
                      <span className="text-zinc-500 font-normal">/</span> 
                      <span className="truncate max-w-[200px]">{order.customerName}</span>
                   </h1>
                </div>
            </div>
            
            <div className="flex gap-2">
                {order.channel === 'OFFLINE' && (
                    <button onClick={initiatePrintLabel} className="flex items-center gap-2 px-3 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg text-xs font-bold border border-zinc-800 transition-all">
                        <TruckIcon className="w-4 h-4" /> Label
                    </button>
                )}
                <button onClick={handlePrintSPK} className="flex items-center gap-2 px-3 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg text-xs font-bold border border-zinc-800 transition-all">
                    <PrinterIcon className="w-4 h-4" /> SPK
                </button>
                <div className="h-8 w-px bg-zinc-800 mx-1"></div>
                
                <button onClick={() => onDelete(order.id)} className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all border border-transparent hover:border-red-900/30" title="Hapus">
                    <TrashIcon className="w-5 h-5" />
                </button>
                
                <button onClick={() => onCopy(order)} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-all" title="Copy">
                    <CopyIcon className="w-5 h-5" />
                </button>
                <button onClick={() => onEdit(order)} className="px-4 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg text-xs font-bold transition-all">
                    EDIT
                </button>
            </div>
        </div>

        {/* --- MAIN SCROLL CONTAINER --- */}
        <div 
            ref={contentRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto pb-32 md:p-8"
        >
            {/* Mobile Hero Image */}
            <MobileHero />

            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 px-4 py-6 md:p-0">
                
                {/* --- LEFT COLUMN (Visuals & Files) --- */}
                <div className="md:col-span-5 space-y-6">
                    <DesktopGallery />
                    
                    {/* Files Section (Unified) */}
                    <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 shadow-sm">
                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2 mb-4">
                           <FileTextIcon className="w-4 h-4" /> File Lampiran
                        </h3>
                        <div className="space-y-2">
                            {order.designFiles?.map((file, idx) => (
                                <FileRow 
                                    key={idx}
                                    file={file} 
                                    label={`File Mentahan ${idx + 1}`}
                                    icon={<FileTextIcon className="w-5 h-5 text-primary" />}
                                    color="primary"
                                    onClick={() => handleDownload(file)}
                                />
                            ))}
                            {order.receiptFile && (
                                <FileRow 
                                  file={order.receiptFile} 
                                  label="Bukti Pembayaran" 
                                  icon={<CheckCircleIcon className="w-5 h-5 text-emerald-500" />}
                                  color="emerald"
                                  onClick={() => handleDownload(order.receiptFile!)}
                                />
                            )}
                            {(!order.designFiles?.length && !order.receiptFile) && (
                              <div className="text-center py-6 border border-dashed border-zinc-800 rounded-xl text-zinc-600 text-xs">
                                  Tidak ada file lampiran.
                              </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- RIGHT COLUMN (Details) --- */}
                <div className="md:col-span-7 space-y-6">
                    
                    {/* Progress Card */}
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Status Pesanan</h2>
                            <span className="font-mono text-xs text-zinc-500">{formatDate(order.createdAt)}</span>
                        </div>
                        <ProgressBar />
                        
                        {/* Metrics */}
                        <div className="grid grid-cols-2 gap-4 mt-6">
                             <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Jumlah (Qty)</p>
                                <p className="text-2xl font-black text-white">{order.quantity} <span className="text-sm font-medium text-zinc-500">pcs</span></p>
                             </div>
                             <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Nama Produk</p>
                                <p className="text-xl font-bold text-zinc-200 break-words whitespace-pre-wrap">{order.productName}</p>
                             </div>
                        </div>

                        {/* Desktop Inline Action */}
                        <div className="hidden md:block mt-6">
                            {nextStatus ? (
                                <button
                                    onClick={() => onUpdateStatus(order.id, nextStatus)}
                                    className="w-full py-4 rounded-xl shadow-lg shadow-primary/10 text-sm font-bold text-white bg-gradient-to-r from-primary to-primary-dark hover:shadow-primary/30 active:scale-[0.98] transition-all flex justify-center items-center gap-2"
                                >
                                    <span>Lanjut ke {nextStatus}</span>
                                    <ChevronRightIcon className="w-4 h-4" />
                                </button>
                                ) : (
                                <div className="w-full py-4 rounded-xl bg-emerald-900/20 border border-emerald-500/20 flex items-center justify-center text-emerald-400 gap-2 font-bold">
                                    <CheckCircleIcon className="w-5 h-5" /> Pesanan Selesai
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Description */}
                    <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6">
                         <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500"></span>
                            Catatan Produksi
                         </h3>
                         <div className="prose prose-invert max-w-none text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                            {order.description || <span className="italic text-zinc-600">Tidak ada deskripsi tambahan.</span>}
                         </div>
                    </div>

                    {/* Shipping Info */}
                    {order.channel === 'OFFLINE' && (
                        <div className="bg-amber-900/10 border border-amber-500/20 rounded-2xl p-6">
                            <h3 className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <TruckIcon className="w-4 h-4" /> Data Pengiriman
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-[10px] text-amber-500/70 uppercase font-bold mb-1">Penerima</p>
                                    <p className="text-zinc-200 font-semibold">{order.recipientName}</p>
                                    <p className="text-zinc-400 font-mono text-xs">{order.recipientPhone}</p>
                                </div>
                                <div className="pt-3 border-t border-amber-500/10">
                                    <p className="text-[10px] text-amber-500/70 uppercase font-bold mb-1">Alamat</p>
                                    <p className="text-zinc-300 text-sm">{order.address}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* --- MOBILE STICKY ACTION BUTTON --- */}
        <div className="md:hidden absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-dark via-dark/95 to-transparent z-30 pb-safe-bottom">
          {nextStatus ? (
            <button
              onClick={() => onUpdateStatus(order.id, nextStatus)}
              className="w-full py-4 rounded-2xl shadow-xl shadow-primary/20 text-sm font-black text-white bg-gradient-to-r from-primary to-primary-dark active:scale-[0.98] transition-all flex items-center justify-center gap-3"
            >
              <div className="flex flex-col items-start leading-none">
                  <span className="text-[10px] opacity-80 font-normal uppercase">Langkah Berikutnya</span>
                  <span>Proses ke {nextStatus}</span>
              </div>
              <ChevronRightIcon className="w-5 h-5 animate-pulse" />
            </button>
          ) : (
            <div className="w-full py-4 rounded-2xl bg-emerald-900/30 border border-emerald-500/30 text-emerald-400 font-bold flex justify-center items-center shadow-lg shadow-emerald-500/10 gap-2">
              <CheckCircleIcon className="w-5 h-5" />
              Pesanan Selesai
            </div>
          )}
        </div>

        {/* --- MOBILE ACTION MENU (BOTTOM SHEET) --- */}
        {showMenu && (
            <div className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in md:hidden">
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowMenu(false)}></div>
                <div className="relative w-full bg-zinc-900 rounded-t-3xl border-t border-zinc-700 p-6 animate-slide-up pb-10">
                    <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mb-6"></div>
                    <div className="grid grid-cols-4 gap-4 mb-6">
                        <MenuButton icon={<PrinterIcon />} label="SPK" onClick={handlePrintSPK} />
                        {order.channel === 'OFFLINE' && <MenuButton icon={<TruckIcon />} label="Label" onClick={initiatePrintLabel} />}
                        <MenuButton icon={<EditIcon />} label="Edit" onClick={() => { onEdit(order); setShowMenu(false); }} />
                        <MenuButton icon={<CopyIcon />} label="Salin" onClick={() => { onCopy(order); setShowMenu(false); }} />
                    </div>
                    <button 
                        onClick={() => { onDelete(order.id); setShowMenu(false); }}
                        className="w-full py-3 flex items-center justify-center gap-2 text-red-400 bg-red-900/10 rounded-xl font-bold text-sm border border-red-900/30"
                    >
                        <TrashIcon className="w-4 h-4" /> Hapus Pesanan
                    </button>
                </div>
            </div>
        )}

      </div>

      {/* Lightbox */}
      {isLightboxOpen && (
         <div 
           className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center animate-fade-in"
           onClick={() => setIsLightboxOpen(false)}
         >
            <button 
               onClick={() => setIsLightboxOpen(false)}
               className="absolute top-6 right-6 p-3 bg-zinc-800 rounded-full text-white hover:bg-zinc-700 transition-colors z-50 shadow-xl"
            >
               <XIcon className="w-6 h-6" />
            </button>
            
            {hasPreviews ? (
                <img 
                src={order.previewImages[activePreviewIdx]?.url} 
                alt="Full Preview" 
                className="max-w-[100vw] max-h-[80vh] object-contain p-2 animate-pop-in" 
                />
            ) : null}

            {order.previewImages.length > 1 && (
                <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-2 p-4 overflow-x-auto" onClick={(e) => e.stopPropagation()}>
                    {order.previewImages.map((img, idx) => (
                        <button
                            key={idx}
                            onClick={() => setActivePreviewIdx(idx)}
                            className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${idx === activePreviewIdx ? 'border-primary scale-110' : 'border-transparent opacity-50'}`}
                        >
                            <img src={img.url} className="w-full h-full object-cover" />
                        </button>
                    ))}
                </div>
            )}
         </div>
      )}

      {/* Label Modal */}
      {showLabelInput && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
           <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowLabelInput(false)}></div>
           <div className="glass-modal w-full max-w-xs rounded-3xl p-6 relative z-10 animate-pop-in shadow-2xl">
              <h3 className="text-lg font-black text-white mb-2">Cetak Label</h3>
              <p className="text-sm text-zinc-400 mb-4">Masukkan nomor HP Pengirim:</p>
              
              <div className="mb-6">
                 <input 
                    type="tel"
                    value={senderPhoneInput}
                    onChange={(e) => setSenderPhoneInput(e.target.value)}
                    placeholder="Contoh: 0812..."
                    className="w-full bg-black/50 border border-zinc-700 rounded-xl py-3 px-4 text-white outline-none focus:border-primary transition-all font-mono"
                    autoFocus
                 />
              </div>

              <div className="flex gap-3">
                 <button 
                    onClick={confirmPrintLabel}
                    className="flex-1 py-3 rounded-xl bg-primary text-white font-bold"
                 >
                    Cetak
                 </button>
                 <button 
                    onClick={() => setShowLabelInput(false)}
                    className="flex-1 py-3 rounded-xl bg-zinc-800 text-zinc-300 font-bold border border-zinc-700"
                 >
                    Batal
                 </button>
              </div>
           </div>
        </div>
      )}
    </>
  );
};

// Helper Components
const FileRow = ({ file, label, icon, color, onClick }: any) => {
    if (!file) return null;
    const colorClasses: Record<string, string> = {
        primary: 'bg-zinc-800/50 hover:bg-zinc-800 border-zinc-700/50 text-zinc-300',
        emerald: 'bg-emerald-900/10 hover:bg-emerald-900/20 border-emerald-500/20 text-emerald-300'
    };
    return (
        <div 
            onClick={onClick}
            className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all active:scale-[0.99] group ${colorClasses[color] || 'bg-zinc-800 border-zinc-700 text-zinc-300'}`}
        >
            <div className="flex items-center gap-3 overflow-hidden">
                <div className={`p-2 rounded-lg shadow-sm ${color === 'emerald' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-900 text-zinc-400'}`}>
                    {icon}
                </div>
                <div className="min-w-0">
                    <p className="text-[10px] font-bold opacity-50 uppercase tracking-wider mb-0.5">{label}</p>
                    <p className="font-semibold truncate text-xs group-hover:text-white transition-colors">{file.name}</p>
                </div>
            </div>
            <div className="p-2 text-zinc-500 group-hover:text-primary transition-colors">
                <DownloadIcon className="w-4 h-4" />
            </div>
        </div>
    );
};

const MenuButton = ({ icon, label, onClick }: any) => (
    <button onClick={onClick} className="flex flex-col items-center gap-2 p-2 active:scale-95 transition-transform group">
        <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-white group-hover:bg-zinc-700 border border-zinc-700 transition-colors">
            {React.cloneElement(icon, { className: "w-6 h-6" })}
        </div>
        <span className="text-xs font-medium text-zinc-400">{label}</span>
    </button>
);
