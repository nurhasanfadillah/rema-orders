import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { ChevronLeftIcon, TrophyIcon, DatabaseIcon } from './icons';

interface RankingPageProps {
    onBack: () => void;
}

interface CustomerRank {
    name: string;
    orderCount: number;
}

interface CustomerQtyRank {
    name: string;
    totalQuantity: number;
}

export const RankingPage: React.FC<RankingPageProps> = ({ onBack }) => {
    const [loading, setLoading] = useState(true);
    const [customerRanks, setCustomerRanks] = useState<CustomerRank[]>([]);
    const [customerQtyRanks, setCustomerQtyRanks] = useState<CustomerQtyRank[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchRankingData();
    }, []);

    const fetchRankingData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Get the date 30 days ago
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const isoDate = thirtyDaysAgo.toISOString();

            // Fetch only needed columns for orders created in the last 30 days
            const { data, error: fetchError } = await supabase
                .from('orders')
                .select('customer_id, customer_name, quantity')
                .gte('created_at', isoDate);

            if (fetchError) throw fetchError;

            if (data) {
                // Aggregate customer data
                const customerOrderMap: Record<string, { name: string, count: number }> = {};
                const customerQtyMap: Record<string, { name: string, totalQty: number }> = {};

                data.forEach(order => {
                    const identifier = order.customer_id || order.customer_name?.trim() || 'Unknown';
                    const name = order.customer_name?.trim() || 'Unknown Customer';

                    if (!customerOrderMap[identifier]) {
                        customerOrderMap[identifier] = { name, count: 0 };
                    }
                    customerOrderMap[identifier].count += 1;

                    if (!customerQtyMap[identifier]) {
                        customerQtyMap[identifier] = { name, totalQty: 0 };
                    }
                    customerQtyMap[identifier].totalQty += (order.quantity || 0);
                });

                // Convert to array and sort
                const cRanks: CustomerRank[] = Object.values(customerOrderMap)
                    .map(c => ({ name: c.name, orderCount: c.count }))
                    .sort((a, b) => b.orderCount - a.orderCount)
                    .slice(0, 10); // Top 10

                const pRanks: CustomerQtyRank[] = Object.values(customerQtyMap)
                    .map(c => ({ name: c.name, totalQuantity: c.totalQty }))
                    .sort((a, b) => b.totalQuantity - a.totalQuantity)
                    .slice(0, 10); // Top 10

                setCustomerRanks(cRanks);
                setCustomerQtyRanks(pRanks);
            }
        } catch (err: any) {
            console.error("Error fetching ranking data:", err);
            setError(err.message || 'Gagal memuat data ranking');
        } finally {
            setLoading(false);
        }
    };

    const getMedalColor = (index: number) => {
        if (index === 0) return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30'; // Gold
        if (index === 1) return 'text-zinc-300 bg-zinc-300/10 border-zinc-300/30'; // Silver
        if (index === 2) return 'text-amber-600 bg-amber-600/10 border-amber-600/30'; // Bronze
        return 'text-zinc-500 bg-zinc-800/50 border-zinc-700/50';
    };

    const getRankBadgeProps = (index: number) => {
        if (index === 0) return { className: 'bg-gradient-to-br from-yellow-300 to-yellow-600 text-black shadow-lg shadow-yellow-500/20' };
        if (index === 1) return { className: 'bg-gradient-to-br from-zinc-200 to-zinc-400 text-black shadow-lg shadow-zinc-500/20' };
        if (index === 2) return { className: 'bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-lg shadow-amber-700/20' };
        return { className: 'bg-zinc-800 text-zinc-400 border border-zinc-700' };
    };

    return (
        <div className="flex flex-col h-full bg-dark overflow-hidden animate-fade-in relative">
            {/* Dynamic Background Effect */}
            <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent pointer-events-none"></div>

            <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 pb-24 relative z-10 space-y-8">
                {/* Header Section */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3">
                            <TrophyIcon className="w-8 h-8 text-yellow-500" />
                            Ranking Dashboard
                        </h1>
                        <p className="text-sm text-zinc-400 mt-1">
                            Performa pesanan berdasarkan data 30 hari terakhir
                        </p>
                    </div>
                    <button
                        onClick={onBack}
                        className="md:hidden p-2 bg-zinc-800/80 rounded-xl text-zinc-400 hover:text-white border border-zinc-700 transition-colors"
                    >
                        <ChevronLeftIcon className="w-5 h-5" />
                    </button>
                </div>

                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-sm">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                        {[1, 2].map((i) => (
                            <div key={i} className="bg-zinc-900/40 border border-zinc-800/60 rounded-3xl p-6 animate-pulse">
                                <div className="h-6 w-1/3 bg-zinc-800 rounded mb-6"></div>
                                <div className="space-y-4">
                                    {[1, 2, 3, 4, 5].map((j) => (
                                        <div key={j} className="h-16 w-full bg-zinc-800 rounded-2xl"></div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
                        {/* Top Customers Card */}
                        <div className="glass-panel overflow-hidden border border-zinc-800/80 bg-zinc-900/60 shadow-xl shadow-black/50">
                            <div className="p-5 border-b border-zinc-800/80 bg-zinc-900/50 flex justify-between items-center backdrop-blur-sm">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-blue-500/10 rounded-xl">
                                        <DatabaseIcon className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white">Pesanan Terbanyak</h2>
                                        <p className="text-xs text-zinc-500">Top 10 Pelanggan</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-3">
                                {customerRanks.length === 0 ? (
                                    <div className="text-center py-10 text-zinc-500 text-sm">
                                        Belum ada data pelanggan dalam 30 hari terakhir.
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {customerRanks.map((customer, index) => {
                                            const medalClass = getMedalColor(index);
                                            const badgeProps = getRankBadgeProps(index);

                                            return (
                                                <div
                                                    key={index}
                                                    className={`flex items-center justify-between p-3 lg:p-4 rounded-2xl transition-all hover:bg-zinc-800/50 ${index < 3 ? 'bg-zinc-800/30' : ''}`}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${badgeProps.className}`}>
                                                            {index + 1}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-zinc-200">{customer.name}</p>
                                                        </div>
                                                    </div>

                                                    <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 ${medalClass}`}>
                                                        <span className="font-bold text-sm">{customer.orderCount}</span>
                                                        <span className="text-xs opacity-80 uppercase tracking-widest font-semibold">Orders</span>
                                                        {index < 3 && <TrophyIcon className="w-4 h-4 ml-1" />}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Top Quantity Card */}
                        <div className="glass-panel overflow-hidden border border-zinc-800/80 bg-zinc-900/60 shadow-xl shadow-black/50">
                            <div className="p-5 border-b border-zinc-800/80 bg-zinc-900/50 flex justify-between items-center backdrop-blur-sm">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-emerald-500/10 rounded-xl">
                                        <DatabaseIcon className="w-5 h-5 text-emerald-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white">Qty Terbanyak</h2>
                                        <p className="text-xs text-zinc-500">Top 10 Pelanggan</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-3">
                                {customerQtyRanks.length === 0 ? (
                                    <div className="text-center py-10 text-zinc-500 text-sm">
                                        Belum ada data kuantitas pelanggan dalam 30 hari terakhir.
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {customerQtyRanks.map((customer, index) => {
                                            const medalClass = getMedalColor(index);
                                            const badgeProps = getRankBadgeProps(index);

                                            return (
                                                <div
                                                    key={index}
                                                    className={`flex items-center justify-between p-3 lg:p-4 rounded-2xl transition-all hover:bg-zinc-800/50 ${index < 3 ? 'bg-zinc-800/30' : ''}`}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${badgeProps.className}`}>
                                                            {index + 1}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-zinc-200">{customer.name}</p>
                                                        </div>
                                                    </div>

                                                    <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 ${medalClass}`}>
                                                        <span className="font-bold text-sm">{new Intl.NumberFormat('id-ID').format(customer.totalQuantity)}</span>
                                                        <span className="text-xs opacity-80 uppercase tracking-widest font-semibold">Pcs</span>
                                                        {index < 3 && <TrophyIcon className="w-4 h-4 ml-1" />}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
};
