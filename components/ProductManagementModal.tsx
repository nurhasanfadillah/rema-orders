import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Product, ProductRow } from '../types';
import { PlusIcon, SearchIcon, TrashIcon, CheckCircleIcon, GlobeIcon, EditIcon, XIcon } from './icons';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const ProductManagementModal: React.FC<Props> = ({ isOpen, onClose, onToast }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [showAddForm, setShowAddForm] = useState(false);
    const [formData, setFormData] = useState({ name: '', unitPrice: '' });
    const [formLoading, setFormLoading] = useState(false);
    const [linking, setLinking] = useState(false);

    // Edit State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editFormData, setEditFormData] = useState({ name: '', unitPrice: '' });

    useEffect(() => {
        if (isOpen) {
            fetchProducts();
        }
    }, [isOpen]);

    const fetchProducts = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .order('product_name', { ascending: true });

            if (error) throw error;

            const mapped = (data as ProductRow[]).map(row => ({
                id: row.id,
                name: row.product_name,
                unitPrice: row.unit_price,
                createdAt: new Date(row.created_at).getTime(),
                updatedAt: new Date(row.updated_at).getTime()
            }));
            setProducts(mapped);
        } catch (err: any) {
            onToast('Gagal memuat produk: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAddProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) return onToast('Nama produk wajib diisi', 'error');

        setFormLoading(true);
        try {
            const price = parseFloat(formData.unitPrice);

            const { error } = await supabase.from('products').insert([{
                product_name: formData.name.trim(),
                unit_price: isNaN(price) ? 0 : price,
            }]);

            if (error) {
                if (error.code === '23505') { // Unique constraint violation
                    throw new Error('Nama produk sudah ada di database.');
                }
                throw error;
            }

            onToast('Produk berhasil ditambahkan', 'success');
            setShowAddForm(false);
            setFormData({ name: '', unitPrice: '' });
            fetchProducts(true);
        } catch (err: any) {
            onToast(err.message, 'error');
        } finally {
            setFormLoading(false);
        }
    };

    const handleUpdateProduct = async (id: string) => {
        if (!editFormData.name.trim()) return onToast('Nama produk wajib diisi', 'error');

        setFormLoading(true);
        try {
            const price = parseFloat(editFormData.unitPrice);

            const { error } = await supabase.from('products').update({
                product_name: editFormData.name.trim(),
                unit_price: isNaN(price) ? 0 : price,
                updated_at: new Date().toISOString()
            }).eq('id', id);

            if (error) {
                if (error.code === '23505') { // Unique constraint violation
                    throw new Error('Nama produk sudah ada di database.');
                }
                throw error;
            }

            onToast('Produk berhasil diperbarui', 'success');
            setEditingId(null);
            setEditFormData({ name: '', unitPrice: '' });
            fetchProducts(true);
        } catch (err: any) {
            onToast(err.message, 'error');
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Hapus produk "${name}"? Data pesanan yang sudah terhubung tidak akan terhapus, namun relasinya akan terputus.`)) return;

        try {
            const { error } = await supabase.from('products').delete().eq('id', id);
            if (error) throw error;

            onToast('Produk berhasil dihapus', 'success');
            fetchProducts(true);
        } catch (err: any) {
            onToast('Gagal menghapus: ' + err.message, 'error');
        }
    };

    const handleAutoLink = async () => {
        if (!window.confirm('Cocokkan pesanan lama dengan data produk? Proses ini akan membuat produk baru dari pesanan lama jika belum ada, lalu menghubungkannya.')) return;

        setLinking(true);
        try {
            const { data, error } = await supabase.rpc('auto_link_products');
            if (error) throw error;

            onToast(`Auto-link berhasil! ${data.inserted_products} produk baru ditambahkan dan ${data.linked_orders} pesanan lama telah terhubung.`, 'success');
            fetchProducts(true); // Refresh the list silently
        } catch (err: any) {
            onToast('Gagal melakukan auto-link: ' + err.message, 'error');
        } finally {
            setLinking(false);
        }
    };

    if (!isOpen) return null;

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

            <div className="glass-modal w-full sm:max-w-2xl h-[90vh] sm:h-[80vh] flex flex-col rounded-t-3xl sm:rounded-3xl relative z-10 animate-slide-up shadow-2xl shadow-black border-zinc-700 overflow-hidden">
                {/* Header */}
                <div className="flex-shrink-0 flex justify-between items-center p-6 border-b border-zinc-800 bg-zinc-900/50">
                    <div>
                        <h3 className="text-lg font-black text-white">Manajemen Database Produk</h3>
                        <p className="text-xs text-zinc-500">Olah data produk untuk dropdown form pesanan.</p>
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
                                placeholder="Cari nama produk..."
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
                        <form onSubmit={handleAddProduct} className="bg-zinc-800/50 border border-zinc-700 rounded-2xl p-4 animate-slide-up space-y-4">
                            <h4 className="text-sm font-bold text-white border-b border-zinc-700 pb-2">Tambah Produk Baru</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 mb-1">Nama Produk / Artikel *</label>
                                    <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-black/50 border border-zinc-600 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-primary" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 mb-1">Harga Satuan (Opsional)</label>
                                    <input type="number" min="0" value={formData.unitPrice} onChange={e => setFormData({ ...formData, unitPrice: e.target.value })} placeholder="Contoh: 50000" className="w-full bg-black/50 border border-zinc-600 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-primary font-mono" />
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <button disabled={formLoading} type="submit" className="px-6 py-2 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50 text-sm">
                                    {formLoading ? 'Menyimpan...' : 'Simpan Produk'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Data Table */}
                    <div className="bg-zinc-800/30 border border-zinc-700 rounded-2xl overflow-hidden">
                        {loading ? (
                            <div className="p-10 flex justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div></div>
                        ) : filteredProducts.length === 0 ? (
                            <div className="p-10 text-center text-zinc-500 text-sm">
                                {searchTerm ? 'Tidak ada produk yang cocok dengan pencarian.' : 'Belum ada data produk di database.'}
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-zinc-300">
                                    <thead className="text-xs uppercase bg-zinc-800/80 text-zinc-400">
                                        <tr>
                                            <th className="px-4 py-3 font-bold">Nama Produk</th>
                                            <th className="px-4 py-3 font-bold">Harga Satuan</th>
                                            <th className="px-4 py-3 font-bold flex justify-end">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-700/50">
                                        {filteredProducts.map(product => {
                                            const isEditing = editingId === product.id;
                                            return (
                                                <tr key={product.id} className="hover:bg-zinc-700/30 transition-colors">
                                                    {isEditing ? (
                                                        <>
                                                            <td className="px-4 py-3">
                                                                <input
                                                                    type="text"
                                                                    value={editFormData.name}
                                                                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                                                                    className="w-full bg-black/50 border border-zinc-600 rounded-lg px-2 py-1 text-white text-sm outline-none focus:border-primary"
                                                                />
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    value={editFormData.unitPrice}
                                                                    onChange={(e) => setEditFormData({ ...editFormData, unitPrice: e.target.value })}
                                                                    className="w-full bg-black/50 border border-zinc-600 rounded-lg px-2 py-1 text-white text-sm outline-none focus:border-primary font-mono"
                                                                    placeholder="Opsional"
                                                                />
                                                            </td>
                                                            <td className="px-4 py-3 flex justify-end gap-2">
                                                                <button disabled={formLoading} onClick={() => handleUpdateProduct(product.id)} className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-lg transition-colors disabled:opacity-50" title="Simpan Perubahan">
                                                                    {formLoading ? <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div> : <CheckCircleIcon className="w-4 h-4" />}
                                                                </button>
                                                                <button onClick={() => { setEditingId(null); setEditFormData({ name: '', unitPrice: '' }); }} className="p-2 bg-zinc-500/10 hover:bg-zinc-500/20 text-zinc-400 rounded-lg transition-colors" title="Batal Edit">
                                                                    <XIcon className="w-4 h-4" />
                                                                </button>
                                                            </td>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <td className="px-4 py-3 font-bold text-white">{product.name}</td>
                                                            <td className="px-4 py-3 font-mono text-zinc-400">
                                                                {product.unitPrice ? `Rp ${new Intl.NumberFormat('id-ID').format(product.unitPrice)}` : '-'}
                                                            </td>
                                                            <td className="px-4 py-3 flex justify-end gap-2">
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingId(product.id);
                                                                        setEditFormData({ name: product.name, unitPrice: product.unitPrice?.toString() || '' });
                                                                    }}
                                                                    className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 rounded-lg transition-colors"
                                                                    title="Edit Data"
                                                                >
                                                                    <EditIcon className="w-4 h-4" />
                                                                </button>
                                                                <button onClick={() => handleDelete(product.id, product.name)} className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors" title="Hapus Data">
                                                                    <TrashIcon className="w-4 h-4" />
                                                                </button>
                                                            </td>
                                                        </>
                                                    )}
                                                </tr>
                                            );
                                        })}
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
                                <p className="text-xs text-zinc-400 leading-relaxed mb-3">Pesanan lama secara default hanya memiliki data teks nama produk tanpa relasi ID ke tabel Products. Fitur ini akan mencari semua nama produk unik dari pesanan lama, menambahkannya ke database (jika belum ada), lalu menghubungkannya secara otomatis secara Non-destruktif.</p>
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
