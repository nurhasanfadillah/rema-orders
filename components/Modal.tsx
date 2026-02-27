import React, { useState, useEffect } from 'react';

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  verificationText?: string; 
  hideVerificationCode?: boolean; // New prop to hide the code
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<Props> = ({ 
  isOpen, 
  title, 
  message, 
  confirmText = "Confirm", 
  cancelText = "Cancel", 
  isDanger = false, 
  verificationText,
  hideVerificationCode = false,
  onConfirm, 
  onCancel 
}) => {
  const [inputValue, setInputValue] = useState('');

  // Reset input when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setInputValue('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isConfirmDisabled = verificationText ? inputValue !== verificationText : false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onCancel}
      ></div>
      
      {/* Modal Content */}
      <div className="glass-modal w-full max-w-xs rounded-3xl p-6 relative z-10 animate-pop-in shadow-2xl shadow-black border-zinc-700">
        <div className="text-center mb-6">
          <h3 className={`text-lg font-black mb-2 ${isDanger ? 'text-red-500' : 'text-white'}`}>{title}</h3>
          <p className="text-sm text-zinc-400 leading-relaxed font-medium">{message}</p>

          {/* Verification Input Section */}
          {verificationText && (
            <div className="mt-4 animate-slide-up">
              <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest mb-2 block">
                {hideVerificationCode ? (
                  "Masukkan Kode Otorisasi"
                ) : (
                  <>Ketik <span className="text-white bg-zinc-700 px-1 rounded">{verificationText}</span> untuk konfirmasi</>
                )}
              </label>
              <input 
                type={hideVerificationCode ? "password" : "text"}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={hideVerificationCode ? "• • • • • •" : verificationText}
                className={`w-full bg-black/50 border-2 rounded-xl py-3 px-4 text-center text-xl font-bold tracking-widest text-white outline-none transition-all placeholder:text-zinc-700 ${
                  isDanger ? 'border-zinc-700 focus:border-red-500' : 'border-zinc-700 focus:border-primary'
                }`}
                autoFocus
                autoComplete="off"
              />
            </div>
          )}
        </div>
        
        <div className="flex flex-col gap-3">
          <button 
            onClick={onConfirm}
            disabled={isConfirmDisabled}
            className={`w-full py-3.5 rounded-xl text-sm font-bold text-white shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              isDanger 
                ? 'bg-red-600 hover:bg-red-700 shadow-red-600/30' 
                : 'bg-primary hover:bg-primary-dark shadow-primary/30'
            }`}
          >
            {confirmText}
          </button>
          <button 
            onClick={onCancel}
            className="w-full py-3.5 rounded-xl text-sm font-bold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 active:scale-[0.98] transition-all border border-zinc-700"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
};