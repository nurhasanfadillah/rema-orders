
import React, { useEffect, useState } from 'react';
import { CheckCircleIcon, SmartphoneIcon, GlobeIcon, ZapIcon, DownloadIcon, DatabaseIcon, TrashIcon } from './icons';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
  onInstall: () => void;
  isUpdateAvailable?: boolean;
  onUpdate?: () => void;
}

export const PWAStatusModal: React.FC<Props> = ({ 
    isOpen, 
    onClose, 
    deferredPrompt, 
    onInstall, 
    isUpdateAvailable = false,
    onUpdate 
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isStandalone, setIsStandalone] = useState(false);
  const [swActive, setSwActive] = useState(false);
  const [storageEstimate, setStorageEstimate] = useState<{usage: number, quota: number} | null>(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // 1. Check Online Status
    const handleStatusChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);

    // 2. Check Display Mode (Standalone vs Browser)
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsStandalone(!!isStandaloneMode);

    // 3. Check Service Worker
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      setSwActive(true);
    }

    // 4. Check Storage
    if ('storage' in navigator && 'estimate' in navigator.storage) {
        navigator.storage.estimate().then(({usage, quota}) => {
            if(usage && quota) setStorageEstimate({ usage, quota });
        });
    }
    
    // 5. Check IOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);

    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const forceReset = async () => {
     if(!window.confirm("Aksi ini akan menghapus semua cache aplikasi dan mereload halaman. Lanjutkan?")) return;
     
     if ('serviceWorker' in navigator) {
         const registrations = await navigator.serviceWorker.getRegistrations();
         for(let registration of registrations) {
             await registration.unregister();
         }
     }
     
     if ('caches' in window) {
         const keys = await caches.keys();
         for(let key of keys) {
             await caches.delete(key);
         }
     }
     
     window.location.reload();
  };

  const StatusItem = ({ icon, label, status, subtext, isAction = false, onClick, customContent }: any) => (
     <div 
        onClick={onClick}
        className={`flex items-start gap-4 p-4 rounded-2xl border transition-all ${
        status === 'good' 
            ? 'bg-emerald-900/10 border-emerald-500/20' 
            : status === 'warn' 
                ? 'bg-amber-900/10 border-amber-500/20' 
                : status === 'alert'
                    ? 'bg-red-900/10 border-red-500/20'
                    : 'bg-zinc-800 border-zinc-700'
        } ${isAction ? 'cursor-pointer hover:bg-zinc-700/50 active:scale-[0.98]' : ''}`}
     >
        <div className={`p-2.5 rounded-xl flex-shrink-0 ${
            status === 'good' ? 'bg-emerald-500/10 text-emerald-400' : 
            status === 'warn' ? 'bg-amber-500/10 text-amber-400' : 
            status === 'alert' ? 'bg-red-500/10 text-red-400' : 'bg-zinc-700 text-zinc-400'
        }`}>
            {icon}
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
               <div>
                 <h4 className={`text-sm font-bold ${status === 'good' ? 'text-emerald-100' : 'text-zinc-200'}`}>{label}</h4>
                 <p className="text-xs text-zinc-500 mt-0.5 whitespace-pre-line">{subtext}</p>
               </div>
               {status === 'good' && <CheckCircleIcon className="w-5 h-5 text-emerald-500" />}
            </div>
            {customContent}
        </div>
     </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>
      
      <div className="glass-modal w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-6 relative z-10 animate-slide-up shadow-2xl shadow-black border-zinc-700 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
              <h3 className="text-lg font-black text-white">System Information</h3>
              <p className="text-xs text-zinc-500">Diagnosa & Status Aplikasi</p>
          </div>
          <button onClick={onClose} className="p-2 bg-zinc-800 rounded-full text-zinc-400 hover:text-white">✕</button>
        </div>

        <div className="space-y-3">
          {/* UPDATE ALERT */}
          {isUpdateAvailable && (
             <div className="p-4 bg-blue-900/20 border border-blue-500/50 rounded-2xl animate-pulse">
                <div className="flex items-center gap-3 mb-2">
                    <ZapIcon className="w-5 h-5 text-blue-400" />
                    <h4 className="font-bold text-blue-100">Update Tersedia!</h4>
                </div>
                <p className="text-xs text-blue-300 mb-3">Versi baru aplikasi siap digunakan. Tekan tombol di bawah untuk memperbarui sistem.</p>
                <button 
                    onClick={onUpdate}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-blue-500/30"
                >
                    Update Sekarang
                </button>
             </div>
          )}

          {/* 1. Network Status */}
          <StatusItem 
             icon={<GlobeIcon className="w-5 h-5" />}
             label="Koneksi Jaringan"
             subtext={isOnline ? "Terhubung ke internet" : "Offline mode aktif - Fitur terbatas"}
             status={isOnline ? 'good' : 'warn'}
          />

          {/* 2. Service Worker */}
          <StatusItem 
             icon={<ZapIcon className="w-5 h-5" />}
             label="Offline Cache"
             subtext={swActive ? "Aktif & Siap Offline" : "Memuat ulang direkomendasikan"}
             status={swActive ? 'good' : 'neutral'}
          />

          {/* 3. Display Mode & IOS Logic */}
          <StatusItem 
             icon={<SmartphoneIcon className="w-5 h-5" />}
             label="Tampilan Aplikasi"
             subtext={isStandalone ? "Terinstall (Native Mode)" : (isIOS ? "Browser Mode (iOS)" : "Browser Mode")}
             status={isStandalone ? 'good' : 'neutral'}
             customContent={
                 !isStandalone && isIOS && (
                    <div className="mt-3 p-3 bg-zinc-800 rounded-xl border border-zinc-700">
                        <p className="text-[10px] text-zinc-400 mb-2 font-bold uppercase">Cara Install di iOS:</p>
                        <ol className="text-xs text-zinc-300 space-y-1 list-decimal ml-4">
                            <li>Tekan tombol <strong>Share</strong> di bar bawah Safari</li>
                            <li>Pilih <strong>Add to Home Screen</strong></li>
                            <li>Tekan <strong>Add</strong> di pojok kanan atas</li>
                        </ol>
                    </div>
                 )
             }
          />

          {/* 4. Storage */}
          {storageEstimate && (
             <StatusItem 
                icon={<DatabaseIcon className="w-5 h-5" />}
                label="Penyimpanan Data"
                subtext={`Terpakai: ${formatBytes(storageEstimate.usage)} dari ${formatBytes(storageEstimate.quota)}`}
                status="neutral"
                customContent={
                  <div className="mt-2 h-1.5 w-full bg-zinc-700 rounded-full overflow-hidden">
                     <div 
                        className="h-full bg-primary" 
                        style={{ width: `${Math.min((storageEstimate.usage / storageEstimate.quota) * 100, 100)}%` }}
                     ></div>
                  </div>
                }
             />
          )}

          {/* 5. Install Action (Android/Desktop) */}
          {!isStandalone && !isIOS && deferredPrompt && (
             <StatusItem 
                icon={<DownloadIcon className="w-5 h-5" />}
                label="Install Aplikasi"
                subtext="Tambahkan ke layar utama HP"
                status="warn"
                isAction={true}
                onClick={() => { onInstall(); onClose(); }}
             />
          )}

          {/* TROUBLESHOOTING SECTION */}
          <div className="pt-4 mt-4 border-t border-zinc-800">
             <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1">Troubleshooting</p>
             <button 
                onClick={forceReset}
                className="w-full py-3 flex items-center justify-center gap-2 bg-red-900/10 hover:bg-red-900/20 text-red-400 rounded-xl text-xs font-bold border border-red-500/20 transition-all active:scale-[0.98]"
             >
                <TrashIcon className="w-4 h-4" />
                Reset Cache & Reload Paksa
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};
