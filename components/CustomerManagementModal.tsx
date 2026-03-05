import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Customer, CustomerRow } from '../types';
import { PlusIcon, SearchIcon, TrashIcon, CheckCircleIcon, GlobeIcon } from './icons';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const CustomerManagementModal: React.FC<Props> = ({ isOpen, onClose, onToast }) => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [showAddForm, setShowAddForm] = useState(false);
    const [formData, setFormData] = useState({ name: '', phone: '', contact: '' });
    const [formLoading, setFormLoading] = useState(false);
    const [linking, setLinking] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchCustomers();
        }
    }, [isOpen]);

    const fetchCustomers = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;

            const mapped = (data as CustomerRow[]).map(row => ({
                id: row.id,
                name: row.name,
                phone: row.phone,
                contact: row.contact,
                createdAt: new Date(row.created_at).getTime(),
                updatedAt: new Date(row.updated_at).getTime()
            }));
            setCustomers(mapped);
        } catch (err: any) {
            onToast('Gagal memuat pelanggan: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAddCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) return onToast('Nama pelanggan wajib diisi', 'error');

        setFormLoading(true);
        try {
            const { error } = await supabase.from('customers').insert([{
                name: formData.name.trim(),
                phone: formData.phone.trim() || null,
                contact: formData.contact.trim() || null
            }]);

            if (error) {
                if (error.code === '23505') { // Unique constraint violation
                    throw new Error('Nama pelanggan sudah ada di database.');
                }
                throw error;
            }

            onToast('Pelanggan berhasil ditambahkan', 'success');
            setShowAddForm(false);
            setFormData({ name: '', phone: '', contact: '' });
            fetchCustomers(true);
        } catch (err: any) {
            onToast(err.message, 'error');
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Hapus pelanggan "${name}"? Data pesanan yang sudah terhubung tidak akan terhapus, namun relasinya akan terputus.`)) return;

        try {
            const { error } = await supabase.from('customers').delete().eq('id', id);
            if (error) throw error;

            onToast('Pelanggan berhasil dihapus', 'success');
            fetchCustomers(true);
        } catch (err: any) {
            onToast('Gagal menghapus: ' + err.message, 'error');
        }
    };

    const handleAutoLink = async () => {
        if (!window.confirm('Cocokkan pesanan lama dengan data pelanggan? Proses ini akan mencari Orders yang namanya sama dengan data Customers lalu menghubungkannya.')) return;

        setLinking(true);
        try {
            const { data, error } = await supabase.rpc('auto_link_customers');
            if (error) throw error;

            onToast(`Auto-link berhasil! ${data.linked_orders} pesanan lama telah terhubung.`, 'success');
        } catch (err: any) {
            onToast('Gagal melakukan auto-link: ' + err.message, 'error');
        } finally {
            setLinking(false);
        }
    };

    if (!isOpen) return null;

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone?.includes(searchTerm) ||
        c.contact?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

            <div className="glass-modal w-full sm:max-w-2xl h-[90vh] sm:h-[80vh] flex flex-col rounded-t-3xl sm:rounded-3xl relative z-10 animate-slide-up shadow-2xl shadow-black border-zinc-700 overflow-hidden">
                {/* Header */}
                <div className="flex-shrink-0 flex justify-between items-center p-6 border-b border-zinc-800 bg-zinc-900/50">
                    <div>
                        <h3 className="text-lg font-black text-white">Manajemen Database Pelanggan</h3>
                        <p className="text-xs text-zinc-500">Olah data pelanggan untuk dropdown form pesanan.</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors">✕</button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Action Bar */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1 group">
                            <SearchIcon className="absolute left-3 top-3 w-5 h-5 text-zinc-500 group-focus-within:text-primary transition-colors" />
                            <input
                                type="text"
                                placeholder="Cari nama, No HP, Kontak..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-black/50 border border-zinc-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                            />
                        </div>
                        <button
                            onClick={() => setShowAddForm(!showAddForm)}
                            className="px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all active:scale-95 whitespace-nowrap"
                        >
                            <PlusIcon className="w-5 h-5" /> {showAddForm ? 'Batal Tambah' : 'Tambah Baru'}
                        </button>
                    </div>

                    {/* Add Form */}
                    {showAddForm && (
                        <form onSubmit={handleAddCustomer} className="bg-zinc-800/50 border border-zinc-700 rounded-2xl p-4 animate-slide-up space-y-4">
                            <h4 className="text-sm font-bold text-white border-b border-zinc-700 pb-2">Tambah Pelanggan Baru</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 mb-1">Nama Customer / Bisnis *</label>
                                    <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-black/50 border border-zinc-600 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-primary" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 mb-1">No. WhatsApp/HP</label>
                                    <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full bg-black/50 border border-zinc-600 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-primary" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 mb-1">Nama Kontak / PIC</label>
                                    <input type="text" value={formData.contact} onChange={e => setFormData({ ...formData, contact: e.target.value })} placeholder="Opsional jika PT/Instansi" className="w-full bg-black/50 border border-zinc-600 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-primary" />
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <button disabled={formLoading} type="submit" className="px-6 py-2 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50 text-sm">
                                    {formLoading ? 'Menyimpan...' : 'Simpan Pelanggan'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Data Table */}
                    <div className="bg-zinc-800/30 border border-zinc-700 rounded-2xl overflow-hidden">
                        {loading ? (
                            <div className="p-10 flex justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div></div>
                        ) : filteredCustomers.length === 0 ? (
                            <div className="p-10 text-center text-zinc-500 text-sm">
                                {searchTerm ? 'Tidak ada pelanggan yang cocok dengan pencarian.' : 'Belum ada data pelanggan di database.'}
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-zinc-300">
                                    <thead className="text-xs uppercase bg-zinc-800/80 text-zinc-400">
                                        <tr>
                                            <th className="px-4 py-3 font-bold">Nama Pelanggan</th>
                                            <th className="px-4 py-3 font-bold">No. HP</th>
                                            <th className="px-4 py-3 font-bold">Kontak/PIC</th>
                                            <th className="px-4 py-3 font-bold flex justify-end">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-700/50">
                                        {filteredCustomers.map(customer => (
                                            <tr key={customer.id} className="hover:bg-zinc-700/30 transition-colors">
                                                <td className="px-4 py-3 font-bold text-white">{customer.name}</td>
                                                <td className="px-4 py-3 font-mono text-zinc-400">{customer.phone || '-'}</td>
                                                <td className="px-4 py-3">{customer.contact || '-'}</td>
                                                <td className="px-4 py-3 flex justify-end">
                                                    <button onClick={() => handleDelete(customer.id, customer.name)} className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors" title="Hapus Data">
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Migration Tools */}
                    <div className="p-4 bg-primary/10 border border-primary/20 rounded-2xl">
                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-primary/20 text-primary rounded-xl">
                                <GlobeIcon className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-sm font-bold text-primary-100 mb-1">Auto-Link Migration</h4>
                                <p className="text-xs text-zinc-400 leading-relaxed mb-3">Pesanan lama secara default hanya memiliki data teks nama pelanggan tanpa relasi ID ke tabel Customers. Fitur ini akan mencari semua pesanan lama yang namanya sama persis dengan yang ada di database Customers, lalu menghubungkannya secara otomatis (Non-destruktif).</p>
                                <button onClick={handleAutoLink} disabled={linking} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-lg border border-zinc-700 transition-colors flex items-center gap-2">
                                    {linking ? 'Memproses pencocokan...' : <><CheckCircleIcon className="w-4 h-4" /> Jalankan Sinkronisasi Pesanan Lama</>}
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
