
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, CheckCircleIcon } from './icons';


interface Option {
  value: string;
  label: string;
}

interface Props {
  options: Option[];
  value: string;
  onChange: (value: string, label?: string) => void;
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean; // New prop
  onSearch?: (searchTerm: string) => void; // New prop
  loading?: boolean; // New prop
  allowAdd?: boolean; // New prop
  onAdd?: (searchTerm: string) => void; // New prop
  addLabel?: string; // New prop
}

export const SearchableSelect: React.FC<Props> = ({
  options,
  value,
  onChange,
  placeholder = "Pilih...",
  disabled = false,
  searchable = false,
  onSearch,
  loading = false,
  allowAdd = false,
  onAdd,
  addLabel = "+ Tambah baru"
}) => {
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

  // When opening, reset search and focus input if searchable
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      if (onSearch) onSearch('');
      if (searchable && inputRef.current) {
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    }
  }, [isOpen, searchable, onSearch]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    if (onSearch) onSearch(val);
  };

  const filteredOptions = searchable && !onSearch
    ? options.filter(opt => opt.label.toLowerCase().includes(searchTerm.toLowerCase()))
    : options;

  const selectedOption = options.find(opt => opt.value === value);

  const handleSelect = (val: string, label: string) => {
    onChange(val, label);
    setIsOpen(false);
  };

  const handleAdd = () => {
    if (onAdd && searchTerm.trim()) {
      onAdd(searchTerm.trim());
      setIsOpen(false);
    }
  };

  const showAddOption = allowAdd && searchTerm.trim().length > 0 &&
    !options.some(opt => opt.label.toLowerCase() === searchTerm.trim().toLowerCase());

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

          {searchable && (
            <div className="p-2 border-b border-zinc-700/50">
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Cari..."
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              />
            </div>
          )}

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
            {loading ? (
              <div className="px-4 py-4 text-center text-zinc-500 text-xs flex justify-center items-center gap-2">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                Memuat...
              </div>
            ) : filteredOptions.length > 0 ? (
              <>
                {filteredOptions.map((opt) => (
                  <div
                    key={opt.value}
                    onClick={() => handleSelect(opt.value, opt.label)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${opt.value === value ? 'bg-primary/20 text-primary' : 'text-zinc-300 hover:bg-zinc-800'}`}
                  >
                    <span className="text-sm font-medium">{opt.label}</span>
                    {opt.value === value && <CheckCircleIcon className="w-4 h-4" />}
                  </div>
                ))}
                {showAddOption && (
                  <div
                    onClick={handleAdd}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-primary bg-primary/10 hover:bg-primary/20 mt-1"
                  >
                    <span className="text-sm font-medium">{addLabel} "{searchTerm.trim()}"</span>
                  </div>
                )}
              </>
            ) : (
              <>
                {showAddOption ? (
                  <div
                    onClick={handleAdd}
                    className="flex items-center justify-between px-3 py-2.5 m-1 rounded-lg cursor-pointer transition-colors text-primary bg-primary/10 hover:bg-primary/20"
                  >
                    <span className="text-sm font-medium">{addLabel} "{searchTerm.trim()}"</span>
                  </div>
                ) : (
                  <div className="px-4 py-8 text-center text-zinc-500 text-xs">
                    Tidak ada hasil ditemukan.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
