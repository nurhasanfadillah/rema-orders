import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Product, ProductRow } from '../types';
import { PlusIcon, SearchIcon, TrashIcon, CheckCircleIcon, GlobeIcon, EditIcon, XIcon } from './icons';

interface Props {
    onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const ProductPage: React.FC<Props> = ({ onToast }) => {
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
        fetchProducts();
    }, []);

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

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 max-w-5xl mx-auto w-full">
            {/* Header Area (Mobile only, Desktop uses main App header typically) */}
            <div className="mb-6 md:hidden">
                <h3 className="text-xl font-black text-white">Database Produk</h3>
                <p className="text-sm text-zinc-500">Olah data produk untuk dropdown form pesanan.</p>
            </div>

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
                <form onSubmit={handleAddProduct} className="bg-zinc-800/80 border border-zinc-700 rounded-2xl p-5 animate-slide-up space-y-4 shadow-xl">
                    <h4 className="text-sm font-bold text-white border-b border-zinc-700 pb-2">Tambah Produk Baru</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-zinc-400 mb-1">Nama Produk / Artikel <span className="text-red-500">*</span></label>
                            <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-black/50 border border-zinc-600 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-primary transition-colors" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-zinc-400 mb-1">Harga Satuan (Opsional)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-zinc-500 text-sm font-mono">Rp</span>
                                <input type="number" min="0" value={formData.unitPrice} onChange={e => setFormData({ ...formData, unitPrice: e.target.value })} placeholder="50000" className="w-full bg-black/50 border border-zinc-600 rounded-xl pl-9 pr-3 py-2 text-white text-sm outline-none focus:border-primary font-mono transition-colors" />
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end pt-2">
                        <button disabled={formLoading} type="submit" className="px-6 py-2.5 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50 text-sm flex items-center gap-2">
                            {formLoading ? 'Menyimpan...' : (
                                <>
                                    <CheckCircleIcon className="w-4 h-4" /> Simpan Produk
                                </>
                            )}
                        </button>
                    </div>
                </form>
            )}

            {/* Data Table */}
            <div className="bg-zinc-800/30 border border-zinc-700 rounded-2xl overflow-hidden shadow-xl">
                {loading ? (
                    <div className="p-12 flex justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
                ) : filteredProducts.length === 0 ? (
                    <div className="p-12 text-center text-zinc-400 text-sm bg-zinc-800/20">
                        {searchTerm ? 'Tidak ada produk yang cocok dengan pencarian.' : 'Belum ada data produk di database.'}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-zinc-300">
                            <thead className="text-xs uppercase bg-zinc-800/80 text-zinc-400 border-b border-zinc-700">
                                <tr>
                                    <th className="px-6 py-4 font-bold">Nama Produk</th>
                                    <th className="px-6 py-4 font-bold">Harga Satuan</th>
                                    <th className="px-6 py-4 font-bold flex justify-end">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-700/50 bg-zinc-900/20">
                                {filteredProducts.map(product => {
                                    const isEditing = editingId === product.id;
                                    return (
                                        <tr key={product.id} className="hover:bg-zinc-800/50 transition-colors">
                                            {isEditing ? (
                                                <>
                                                    <td className="px-6 py-3">
                                                        <input
                                                            type="text"
                                                            value={editFormData.name}
                                                            onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                                                            className="w-full bg-black/50 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-primary transition-colors"
                                                            placeholder="Nama Produk"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <div className="relative">
                                                            <span className="absolute left-2.5 top-2 text-zinc-500 text-sm font-mono">Rp</span>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                value={editFormData.unitPrice}
                                                                onChange={(e) => setEditFormData({ ...editFormData, unitPrice: e.target.value })}
                                                                className="w-full bg-black/50 border border-zinc-600 rounded-lg pl-8 pr-2 py-2 text-white text-sm outline-none focus:border-primary font-mono transition-colors"
                                                                placeholder="Opsional"
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3 flex justify-end gap-2">
                                                        <button disabled={formLoading} onClick={() => handleUpdateProduct(product.id)} className="p-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-xl transition-colors disabled:opacity-50 ring-1 ring-emerald-500/20" title="Simpan Perubahan">
                                                            {formLoading ? <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div> : <CheckCircleIcon className="w-4 h-4" />}
                                                        </button>
                                                        <button onClick={() => { setEditingId(null); setEditFormData({ name: '', unitPrice: '' }); }} className="p-2.5 bg-zinc-500/10 hover:bg-zinc-500/20 text-zinc-400 rounded-xl transition-colors ring-1 ring-zinc-500/20" title="Batal Edit">
                                                            <XIcon className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="px-6 py-4 font-bold text-white">{product.name}</td>
                                                    <td className="px-6 py-4 font-mono text-zinc-400">
                                                        {product.unitPrice ? `Rp ${new Intl.NumberFormat('id-ID').format(product.unitPrice)}` : '-'}
                                                    </td>
                                                    <td className="px-6 py-4 flex justify-end gap-2">
                                                        <button
                                                            onClick={() => {
                                                                setEditingId(product.id);
                                                                setEditFormData({ name: product.name, unitPrice: product.unitPrice?.toString() || '' });
                                                            }}
                                                            className="p-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 rounded-xl transition-colors ring-1 ring-blue-500/20"
                                                            title="Edit Data"
                                                        >
                                                            <EditIcon className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => handleDelete(product.id, product.name)} className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-colors ring-1 ring-red-500/20" title="Hapus Data">
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
            <div className="p-5 bg-primary/10 border border-primary/20 rounded-2xl shadow-inner">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/20 text-primary rounded-xl shrink-0">
                        <GlobeIcon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                        <h4 className="text-base font-bold text-primary-100 mb-1.5">Auto-Link Migration</h4>
                        <p className="text-sm text-zinc-400 leading-relaxed mb-4 max-w-3xl">Pesanan lama secara default hanya memiliki data teks nama produk tanpa relasi ID ke tabel Products. Fitur ini akan mencari semua nama produk unik dari pesanan lama, menambahkannya ke database (jika belum ada), lalu menghubungkannya secara otomatis secara Non-destruktif.</p>
                        <button onClick={handleAutoLink} disabled={linking} className="px-5 py-2.5 bg-black/40 hover:bg-black/60 text-white text-sm font-bold rounded-xl border border-zinc-700 transition-colors flex items-center gap-2 w-fit">
                            {linking ? 'Memproses pencocokan...' : <><CheckCircleIcon className="w-5 h-5 text-primary" /> Jalankan Sinkronisasi Pesanan Lama</>}
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
};
