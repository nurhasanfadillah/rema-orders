

import React, { useState } from 'react';
import { Order, OrderStatus, FileData } from '../types';
import { ChevronLeftIcon, ImageIcon, FileTextIcon, CheckCircleIcon, PlusIcon, TrashIcon, InfoIcon, GlobeIcon, ZapIcon, CopyIcon } from './icons';
import { supabase } from '../supabase';
import { getStoragePathFromUrl } from '../utils';
import { SearchableSelect } from './SearchableSelect';

// Constants for Validation
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MAX_TEXT_LENGTH = 50;
const MAX_DESC_LENGTH = 500;
const MAX_QTY = 10000;

// Modern Input Component with Error Handling
interface InputGroupProps {
  label: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
}

const InputGroup = ({ label, required, error, disabled, children }: React.PropsWithChildren<InputGroupProps>) => (
  <div className={`group mb-1 ${disabled ? 'opacity-60' : ''}`}>
    <div className="flex justify-between items-center mb-1.5 ml-1">
      <label className={`block text-xs font-bold uppercase tracking-wider transition-colors ${error ? 'text-red-500' : 'text-zinc-500 group-focus-within:text-primary'}`}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {error && <span className="text-[10px] text-red-400 font-medium animate-pulse">{error}</span>}
    </div>
    {children}
  </div>
);

// Single File Uploader (for Receipt)
const SingleFileUploader = ({ label, sublabel, file, onSelect, icon, accept, error, disabled }: any) => (
  <div className={`group ${disabled ? 'opacity-60 pointer-events-none' : ''}`}>
    <div className="flex justify-between items-center mb-1.5 ml-1">
       <label className={`block text-xs font-bold uppercase tracking-wider ${error ? 'text-red-500' : 'text-zinc-500'}`}>{label}</label>
       {error && <span className="text-[10px] text-red-400 font-medium">{error}</span>}
    </div>
    <label className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
        error ? 'bg-red-500/5 border-red-500/50' : 
        file ? 'bg-primary/10 border-primary/30' : 'bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800'
    }`}>
       <div className="flex items-center gap-3 overflow-hidden">
          <div className={`p-2 rounded-lg ${file ? 'bg-primary text-white' : 'bg-zinc-700 text-zinc-400'}`}>
             {icon}
          </div>
          <div className="min-w-0">
             <p className={`text-sm font-semibold truncate ${file ? 'text-primary' : 'text-zinc-300'}`}>
                {file ? file.name : 'Pilih File'}
             </p>
             {!file && <p className="text-[10px] text-zinc-500">{sublabel} (Max {MAX_FILE_SIZE_MB}MB)</p>}
          </div>
       </div>
       <input type="file" className="hidden" onChange={onSelect} accept={accept} disabled={disabled} />
       {!file && <span className="text-xs font-bold text-primary px-3 py-1 bg-primary/10 rounded-full">Tambah</span>}
    </label>
  </div>
);

interface Props {
  onBack: () => void;
  onSubmit: (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'orderNo'>) => Promise<void>;
  initialData?: Order;
  mode?: 'create' | 'edit';
  onError: (msg: string) => void;
}

export const OrderForm: React.FC<Props> = ({ onBack, onSubmit, initialData, mode = 'create', onError }) => {
  const [channel, setChannel] = useState<'ONLINE' | 'OFFLINE'>(initialData?.channel || 'ONLINE');
  const isCopyMode = mode === 'create' && !!initialData?.customerName;

  const [formData, setFormData] = useState({
    customerName: initialData?.customerName || '',
    productName: initialData?.productName || '',
    quantity: initialData?.quantity || 1,
    description: initialData?.description || '',
    status: initialData?.status || OrderStatus.PROCESSING,
    recipientName: initialData?.recipientName || '',
    recipientPhone: initialData?.recipientPhone || '',
    address: initialData?.address || '',
  });

  const [orderType, setOrderType] = useState<'CUSTOM' | 'PLAIN'>(
    initialData?.description === 'PESANAN POLOS' ? 'PLAIN' : 'CUSTOM'
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Arrays for multiple files
  const [previewImages, setPreviewImages] = useState<FileData[]>(initialData?.previewImages || []);
  const [designFiles, setDesignFiles] = useState<FileData[]>(initialData?.designFiles || []);
  
  // Single file for receipt
  const [receiptFile, setReceiptFile] = useState<FileData | null>(initialData?.receiptFile || null);
  
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState(0);

  // --- Policy Logic: Lock Fields if Status is SHIPPED ---
  const isLocked = mode === 'edit' && initialData?.status === OrderStatus.SHIPPED;

  // --- Logic Helpers ---
  const handleTypeChange = (type: 'CUSTOM' | 'PLAIN') => {
    if (isLocked) return;
    setOrderType(type);
    if (type === 'PLAIN') {
      setFormData(prev => ({ ...prev, description: 'PESANAN POLOS' }));
      setPreviewImages([]);
      setDesignFiles([]);
      setErrors(prev => {
        const newErrs = { ...prev };
        delete newErrs.logic;
        delete newErrs.description;
        return newErrs;
      });
    } else {
      if (formData.description === 'PESANAN POLOS') {
        setFormData(prev => ({ ...prev, description: '' }));
      }
    }
  };

  // --- Validation Logic ---
  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `File ${file.name} terlalu besar (Max ${MAX_FILE_SIZE_MB}MB)`;
    }
    return null;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    if (!formData.customerName.trim()) { newErrors.customerName = "Wajib diisi"; isValid = false; }
    else if (formData.customerName.length < 3) { newErrors.customerName = "Min 3 karakter"; isValid = false; }

    if (!formData.productName.trim()) { newErrors.productName = "Wajib diisi"; isValid = false; }

    if (!formData.quantity) { newErrors.quantity = "Wajib"; isValid = false; }
    else if (formData.quantity < 1) { newErrors.quantity = "Min 1"; isValid = false; }

    if (orderType === 'CUSTOM' && formData.description.length > MAX_DESC_LENGTH) {
       newErrors.description = `Maksimal ${MAX_DESC_LENGTH} karakter`; isValid = false;
    }

    if (orderType === 'CUSTOM') {
      if (previewImages.length === 0 && !formData.description.trim()) {
         newErrors.logic = "Wajib upload preview atau isi deskripsi"; isValid = false;
         onError("Mohon sertakan minimal satu preview desain atau deskripsi untuk pesanan custom.");
      }
    }

    if (channel === 'ONLINE') {
        if (!receiptFile) { newErrors.receipt = "Wajib upload Resi untuk pesanan Online"; isValid = false; onError("Pesanan Online wajib menyertakan resi pengiriman."); }
    } else {
        if (!formData.recipientName.trim()) { newErrors.recipientName = "Wajib diisi"; isValid = false; }
        if (!formData.recipientPhone.trim()) { newErrors.recipientPhone = "Wajib diisi"; isValid = false; }
        if (!formData.address.trim()) { newErrors.address = "Wajib diisi"; isValid = false; }
    }

    setErrors(newErrors);
    return isValid;
  };

  // --- Handlers ---
  const handleMultiFileSelect = (e: React.ChangeEvent<HTMLInputElement>, currentList: FileData[], setter: (f: FileData[]) => void) => {
    if (isLocked) return;
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      const validFiles: FileData[] = [];
      let hasError = false;

      selectedFiles.forEach((file: File) => {
         const errorMsg = validateFile(file);
         if (errorMsg) {
            onError(errorMsg);
            hasError = true;
         } else {
            validFiles.push({
               name: file.name,
               type: file.type,
               size: file.size,
               url: URL.createObjectURL(file), // Temp URL for preview
               file: file
            });
         }
      });

      if (!hasError) {
         setter([...currentList, ...validFiles]);
      }
      
      // Reset input
      e.target.value = '';
    }
  };

  const handleSingleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, setter: (f: FileData | null) => void) => {
      if (isLocked) return;
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const errorMsg = validateFile(file);
          if (errorMsg) {
              onError(errorMsg);
              e.target.value = '';
              return;
          }
          setter({
              name: file.name,
              type: file.type,
              size: file.size,
              url: URL.createObjectURL(file),
              file: file
          });
      }
  };

  const removeFile = (index: number, list: FileData[], setter: (f: FileData[]) => void) => {
    if (isLocked) return;
    const newList = [...list];
    newList.splice(index, 1);
    setter(newList);
  };

  // --- Upload to Supabase ---
  // Updated Logic: Handles Server-Side Copy for Duplicated Orders
  const uploadFiles = async (files: FileData[], bucket: string, onProgress?: () => void): Promise<FileData[]> => {
    const uploadedFiles: FileData[] = [];
    
    for (const fileData of files) {
       // CASE 1: File is a remote reference (no raw file object)
       if (!fileData.file) {
          // IMPORTANT: If we are in 'create' mode (Copy Order), we MUST duplicate this file
          // to ensure the new order has its own independent file. 
          if (mode === 'create' && fileData.url) {
             try {
                const oldPath = getStoragePathFromUrl(fileData.url);
                if (oldPath) {
                   const fileExt = fileData.name.split('.').pop() || 'png';
                   const newFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
                   
                   // Server-side Copy
                   const { error: copyError } = await supabase.storage
                      .from(bucket)
                      .copy(oldPath, newFileName);

                   if (!copyError) {
                      const { data: { publicUrl } } = supabase.storage
                         .from(bucket)
                         .getPublicUrl(newFileName);
                      
                      uploadedFiles.push({
                         name: fileData.name,
                         type: fileData.type,
                         size: fileData.size,
                         url: publicUrl // New URL
                      });
                   } else {
                      // Fallback: If copy fails, keep old reference (risk accepted) or throw
                      console.warn("Server-side copy failed, keeping reference", copyError);
                      uploadedFiles.push(fileData);
                   }
                } else {
                   uploadedFiles.push(fileData);
                }
             } catch (e) {
                console.error("Error duplicating file:", e);
                uploadedFiles.push(fileData);
             }
          } else {
             // Normal Edit mode: keep existing reference
             uploadedFiles.push(fileData);
          }
          
          if (onProgress) onProgress();
          continue;
       }

       // CASE 2: New File Upload
       const fileExt = fileData.name.split('.').pop();
       const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
       
       const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(fileName, fileData.file);

       if (uploadError) throw uploadError;

       const { data: { publicUrl } } = supabase.storage
          .from(bucket)
          .getPublicUrl(fileName);

       uploadedFiles.push({
          name: fileData.name,
          type: fileData.type,
          size: fileData.size,
          url: publicUrl
       });

       if (onProgress) onProgress();
    }
    return uploadedFiles;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
        onError("Mohon lengkapi data yang wajib diisi (bertanda merah)");
        return;
    }
    
    setLoading(true);
    setProgressPercent(0);
    setUploadProgress('Menyiapkan upload...');

    try {
        // Calculate total items to process (uploads + copies)
        const totalFiles = previewImages.length + designFiles.length + (receiptFile ? 1 : 0);
        let processedCount = 0;

        const handleProgress = () => {
            processedCount++;
            if (totalFiles > 0) {
               const pct = Math.round((processedCount / totalFiles) * 100);
               setProgressPercent(pct);
               setUploadProgress(`Memproses file ${processedCount}/${totalFiles}`);
            }
        };

        if (totalFiles === 0) setProgressPercent(100);

        // Upload/Copy All Files
        const uploadedPreviews = await uploadFiles(previewImages, 'sablon-files', handleProgress);
        const uploadedDesigns = await uploadFiles(designFiles, 'sablon-files', handleProgress);
        
        let uploadedReceipt = null;
        if (receiptFile) {
            const result = await uploadFiles([receiptFile], 'sablon-files', handleProgress);
            uploadedReceipt = result[0];
        }

        setUploadProgress('Menyimpan ke database...');
        
        // Ensure 100% visual state
        setProgressPercent(100);
        if (totalFiles > 0) {
            // Short delay for user to see 100%
            await new Promise(resolve => setTimeout(resolve, 600));
        }
        
        await onSubmit({
            ...formData,
            previewImages: uploadedPreviews,
            designFiles: uploadedDesigns,
            receiptFile: uploadedReceipt,
            channel: channel
        });

    } catch (err: any) {
        console.error(err);
        onError("Gagal memproses data: " + err.message);
        setLoading(false); // Only stop on error
    } 
  };

  // Convert Status Enum to Options
  const statusOptions = Object.values(OrderStatus).map(status => ({
     value: status,
     label: status
  }));

  return (
    <div className="flex flex-col h-full relative">
      {/* Mobile Header - Hidden on Desktop since layout handles it */}
      <div className="md:hidden glass-header sticky top-0 z-20 px-4 py-4 flex items-center gap-3">
        <button onClick={onBack} className="p-2 -ml-2 text-zinc-400 rounded-xl hover:bg-zinc-800 hover:text-white transition-all">
          <ChevronLeftIcon />
        </button>
        <h2 className="text-lg font-bold text-white tracking-tight">
          {mode === 'create' ? (isCopyMode ? 'Salin Pesanan' : 'Buat Pesanan') : 'Edit Pesanan'}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 pb-32">
        
        {/* Copy Mode Indicator */}
        {isCopyMode && (
           <div className="mb-6 bg-blue-900/20 border border-blue-500/30 p-4 rounded-xl flex items-start gap-3 animate-fade-in">
              <CopyIcon className="w-5 h-5 text-blue-400 mt-0.5" />
              <div>
                  <h3 className="text-sm font-bold text-blue-300">Mode Salin Pesanan</h3>
                  <p className="text-xs text-blue-200/70 mt-1 leading-relaxed">
                      Anda sedang membuat pesanan baru dari data yang sudah ada. 
                      File desain akan diduplikasi secara otomatis untuk pesanan baru ini.
                  </p>
              </div>
           </div>
        )}

        {/* Channel Selection */}
        <div className="flex bg-zinc-800/50 p-1 rounded-xl mb-6 border border-zinc-700">
            <button 
                onClick={() => setChannel('ONLINE')}
                disabled={isLocked}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${channel === 'ONLINE' ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
                <GlobeIcon className="w-4 h-4" /> ONLINE
            </button>
            <button 
                onClick={() => setChannel('OFFLINE')}
                disabled={isLocked}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${channel === 'OFFLINE' ? 'bg-amber-600 text-white shadow-lg' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
                <ZapIcon className="w-4 h-4" /> OFFLINE
            </button>
        </div>

        {/* Order Type Selection */}
        <div className="flex bg-zinc-800/50 p-1 rounded-xl mb-6 border border-zinc-700">
           <button 
             onClick={() => handleTypeChange('CUSTOM')}
             disabled={isLocked}
             className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${orderType === 'CUSTOM' ? 'bg-zinc-700 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}
           >
             CUSTOM ORDER
           </button>
           <button 
             onClick={() => handleTypeChange('PLAIN')}
             disabled={isLocked}
             className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${orderType === 'PLAIN' ? 'bg-zinc-700 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}
           >
             PESANAN POLOS
           </button>
        </div>

        <div className="space-y-5">
           {/* Manual Status Selection (Only in Edit Mode) - UPDATED TO SEARCHABLE SELECT */}
           {mode === 'edit' && (
              <InputGroup label="Update Status Manual" required>
                <div className="relative z-20"> {/* z-20 for dropdown overlap */}
                    <SearchableSelect 
                        options={statusOptions}
                        value={formData.status}
                        onChange={(val) => setFormData({...formData, status: val as OrderStatus})}
                        disabled={isLocked}
                        placeholder="Pilih Status..."
                    />
                </div>
              </InputGroup>
           )}

           {/* Desktop Grid Layout for Inputs */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
               {/* Customer Name */}
               <InputGroup label="Nama Pelanggan" required error={errors.customerName} disabled={isLocked}>
                    <input 
                    type="text" 
                    value={formData.customerName}
                    onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                    placeholder="Contoh: Budi Santoso"
                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    maxLength={MAX_TEXT_LENGTH}
                    />
               </InputGroup>

               {/* Product Name */}
               <InputGroup label="Nama Produk / Artikel" required error={errors.productName} disabled={isLocked}>
                    <input 
                    type="text" 
                    value={formData.productName}
                    onChange={(e) => setFormData({...formData, productName: e.target.value})}
                    placeholder="Contoh: Kaos Cotton Combed 30s"
                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    maxLength={MAX_TEXT_LENGTH}
                    />
               </InputGroup>

               {/* Quantity */}
               <InputGroup label="Jumlah (Pcs)" required error={errors.quantity} disabled={isLocked}>
                    <input 
                    type="number" 
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: Math.min(parseInt(e.target.value) || 0, MAX_QTY)})}
                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-mono"
                    min="1"
                    max={MAX_QTY}
                    />
               </InputGroup>
           </div>

           {/* Offline Specific Fields */}
           {channel === 'OFFLINE' && (
               <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-4 animate-fade-in">
                  <h3 className="text-xs font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2">
                     <ZapIcon className="w-4 h-4" /> Data Pengiriman
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                      <InputGroup label="Nama Penerima" required error={errors.recipientName} disabled={isLocked}>
                            <input 
                                type="text" 
                                value={formData.recipientName}
                                onChange={(e) => setFormData({...formData, recipientName: e.target.value})}
                                placeholder="Nama lengkap penerima"
                                className="w-full bg-black/40 border border-zinc-700/50 rounded-xl px-4 py-3 text-zinc-100 focus:border-amber-500/50 outline-none"
                            />
                      </InputGroup>
                      <InputGroup label="No. WhatsApp / HP" required error={errors.recipientPhone} disabled={isLocked}>
                            <input 
                                type="tel" 
                                value={formData.recipientPhone}
                                onChange={(e) => setFormData({...formData, recipientPhone: e.target.value})}
                                placeholder="08..."
                                className="w-full bg-black/40 border border-zinc-700/50 rounded-xl px-4 py-3 text-zinc-100 focus:border-amber-500/50 outline-none font-mono"
                            />
                      </InputGroup>
                  </div>
                  <InputGroup label="Alamat Lengkap" required error={errors.address} disabled={isLocked}>
                        <textarea 
                            value={formData.address}
                            onChange={(e) => setFormData({...formData, address: e.target.value})}
                            placeholder="Jalan, RT/RW, Kelurahan, Kecamatan, Kota, Kode Pos"
                            className="w-full bg-black/40 border border-zinc-700/50 rounded-xl px-4 py-3 text-zinc-100 focus:border-amber-500/50 outline-none min-h-[80px]"
                        />
                  </InputGroup>
               </div>
           )}

           {/* CUSTOM ORDER FIELDS */}
           {orderType === 'CUSTOM' && (
               <div className="space-y-5 animate-slide-up">
                  {/* Description */}
                  <InputGroup label="Deskripsi / Catatan Desain" error={errors.description} disabled={isLocked}>
                    <textarea 
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        placeholder="Jelaskan detail sablon, warna, posisi, dll..."
                        className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all min-h-[100px]"
                        maxLength={MAX_DESC_LENGTH}
                    />
                    <div className="flex justify-end mt-1">
                        <span className="text-[10px] text-zinc-600">{formData.description.length}/{MAX_DESC_LENGTH}</span>
                    </div>
                  </InputGroup>

                  {/* Preview Images */}
                  <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                           Preview Desain <span className="text-zinc-600 normal-case font-normal">(Gambar Jadi/Mockup)</span>
                        </label>
                      </div>
                      
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 mb-3">
                         {previewImages.map((img, idx) => (
                             <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group border border-zinc-700">
                                <img src={img.url} className="w-full h-full object-cover" alt="preview" />
                                {!isLocked && (
                                    <button 
                                        onClick={() => removeFile(idx, previewImages, setPreviewImages)}
                                        className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <TrashIcon className="w-5 h-5 text-red-500" />
                                    </button>
                                )}
                             </div>
                         ))}
                         {!isLocked && (
                            <label className={`aspect-square rounded-xl border-2 border-dashed border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/50 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${errors.logic ? 'border-red-500/50 bg-red-900/10' : ''}`}>
                                <ImageIcon className="w-6 h-6 text-zinc-500" />
                                <span className="text-[10px] font-bold text-zinc-500">Add Img</span>
                                <input type="file" multiple accept="image/*" onChange={(e) => handleMultiFileSelect(e, previewImages, setPreviewImages)} className="hidden" />
                            </label>
                         )}
                      </div>
                  </div>

                  {/* Design Files */}
                  <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                         File Mentahan <span className="text-zinc-600 normal-case font-normal">(.CDR, .AI, .PSD, .PDF, .PNG, .JPG)</span>
                      </label>
                      
                      <div className="space-y-2">
                         {designFiles.map((file, idx) => (
                             <div key={idx} className="flex items-center justify-between p-3 bg-zinc-800/30 border border-zinc-700/50 rounded-xl">
                                 <div className="flex items-center gap-3 overflow-hidden">
                                     <div className="p-2 bg-zinc-800 rounded-lg">
                                         <FileTextIcon className="w-4 h-4 text-zinc-400" />
                                     </div>
                                     <span className="text-xs text-zinc-300 truncate font-medium">{file.name}</span>
                                 </div>
                                 {!isLocked && (
                                     <button onClick={() => removeFile(idx, designFiles, setDesignFiles)} className="p-1.5 hover:bg-red-500/10 rounded-lg text-zinc-500 hover:text-red-500">
                                         <TrashIcon className="w-4 h-4" />
                                     </button>
                                 )}
                             </div>
                         ))}
                         {!isLocked && (
                             <label className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-zinc-700 hover:bg-zinc-800/30 cursor-pointer transition-all group">
                                 <PlusIcon className="w-4 h-4 text-zinc-500 group-hover:text-primary" />
                                 <span className="text-xs font-bold text-zinc-500 group-hover:text-primary">Upload File Mentahan</span>
                                 <input type="file" multiple accept=".cdr,.ai,.psd,.pdf,.png,.zip,.rar,.jpg,.jpeg" onChange={(e) => handleMultiFileSelect(e, designFiles, setDesignFiles)} className="hidden" />
                             </label>
                         )}
                      </div>
                  </div>
               </div>
           )}
           
           {/* RECEIPT UPLOAD (Conditional based on Channel) */}
           {channel === 'ONLINE' && (
               <div className="pt-4 border-t border-zinc-800">
                  <SingleFileUploader 
                     label="RESI PENGIRIMAN"
                     sublabel="PDF Only"
                     file={receiptFile}
                     onSelect={(e: any) => handleSingleFileSelect(e, setReceiptFile)}
                     icon={<CheckCircleIcon className={`w-5 h-5 ${receiptFile ? 'text-white' : 'text-zinc-500'}`} />}
                     accept="application/pdf"
                     error={errors.receipt}
                     disabled={isLocked}
                  />
               </div>
           )}

        </div>

        {/* Global Error Message */}
        {errors.logic && (
           <div className="mt-6 p-3 bg-red-900/20 border border-red-900/50 rounded-xl flex items-start gap-3">
              <InfoIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-200">{errors.logic}</p>
           </div>
        )}
      </div>

      {/* Footer Action */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/95 to-transparent z-20">
        <button
            onClick={handleSubmit}
            disabled={loading || isLocked}
            className={`w-full relative overflow-hidden py-4 rounded-2xl transition-all disabled:cursor-not-allowed flex flex-col items-center justify-center group shadow-xl ${
                loading 
                ? 'bg-zinc-800 text-zinc-300' 
                : 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-primary/20 hover:shadow-primary/40 active:scale-[0.98]'
            }`}
        >
            {loading && (
                <div 
                    className="absolute left-0 top-0 bottom-0 bg-primary/20 transition-all duration-300 ease-out border-r border-primary/50"
                    style={{ width: `${progressPercent}%` }}
                ></div>
            )}
            
            <div className="relative z-10 flex flex-col items-center justify-center">
                {loading ? (
                     <div className="flex items-center gap-3">
                         {progressPercent < 100 ? (
                            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                         ) : (
                            <CheckCircleIcon className="w-5 h-5 text-emerald-500 animate-pop-in" />
                         )}
                         <div className="flex flex-col items-start text-left">
                             <span className="text-xs font-bold text-white tracking-wide">
                                {progressPercent === 100 ? 'SUKSES!' : (isCopyMode ? 'MEMPROSES DUPLIKASI...' : 'MENGUPLOAD...')}
                             </span>
                             <span className="text-[10px] font-mono opacity-80">
                                {uploadProgress} ({progressPercent}%)
                             </span>
                         </div>
                     </div>
                ) : (
                     <span className="font-black text-base">
                        {isLocked ? 'Pesanan Selesai (Read Only)' : (mode === 'create' ? (isCopyMode ? 'DUPLIKASI PESANAN SEKARANG' : 'BUAT PESANAN SEKARANG') : 'SIMPAN PERUBAHAN')}
                     </span>
                )}
            </div>
        </button>
      </div>
    </div>
  );
};