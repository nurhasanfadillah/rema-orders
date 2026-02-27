
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, SearchIcon, CheckCircleIcon } from './icons';

interface Option {
  value: string;
  label: string;
}

interface Props {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const SearchableSelect: React.FC<Props> = ({ options, value, onChange, placeholder = "Pilih...", disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter options based on search
  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = options.find(opt => opt.value === value);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearchTerm(''); // Reset search
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer transition-all hover:bg-zinc-800 ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${isOpen ? 'ring-1 ring-primary border-primary' : ''}`}
      >
        <span className={`text-sm ${selectedOption ? 'text-zinc-100 font-medium' : 'text-zinc-500'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDownIcon className={`w-4 h-4 text-zinc-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden animate-slide-down origin-top">
          {/* Search Input */}
          <div className="p-2 border-b border-zinc-800">
             <div className="relative">
                <SearchIcon className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                <input 
                   ref={inputRef}
                   type="text"
                   autoFocus
                   placeholder="Cari..."
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="w-full bg-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-primary/50"
                />
             </div>
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
             {filteredOptions.length > 0 ? (
                filteredOptions.map((opt) => (
                  <div 
                     key={opt.value}
                     onClick={() => handleSelect(opt.value)}
                     className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${opt.value === value ? 'bg-primary/20 text-primary' : 'text-zinc-300 hover:bg-zinc-800'}`}
                  >
                     <span className="text-sm font-medium">{opt.label}</span>
                     {opt.value === value && <CheckCircleIcon className="w-4 h-4" />}
                  </div>
                ))
             ) : (
                <div className="px-4 py-8 text-center text-zinc-500 text-xs">
                   Tidak ada hasil ditemukan.
                </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
};
