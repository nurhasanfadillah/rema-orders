import React from 'react';
import { Order, OrderStatus } from '../types';
import { formatDate, getOrderAgeInfo } from '../utils';
import { StatusBadge } from './StatusBadge';
import { ImageIcon, GlobeIcon, ZapIcon } from './icons';

interface Props {
  orders: Order[];
  onRowClick: (order: Order) => void;
  isLoading: boolean;
}

export const DesktopTable: React.FC<Props> = ({ orders, onRowClick, isLoading }) => {
  return (
    <div className="w-full">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40">

        <table className="w-full text-left border-separate border-spacing-0 table-fixed">
          <thead className="bg-zinc-800/80 text-zinc-400 text-xs uppercase font-bold">
            <tr>
              <th className="p-4 border-b border-zinc-700 w-16 text-center whitespace-nowrap rounded-tl-xl">Preview</th>
              <th className="p-4 border-b border-zinc-700 whitespace-nowrap">Order No</th>
              <th className="p-4 border-b border-zinc-700 whitespace-nowrap">Customer</th>
              <th className="p-4 border-b border-zinc-700 whitespace-nowrap">Produk</th>
              <th className="p-4 border-b border-zinc-700 text-center whitespace-nowrap">Qty</th>
              <th className="p-4 border-b border-zinc-700 text-center whitespace-nowrap">Status</th>
              <th className="p-4 border-b border-zinc-700 text-center whitespace-nowrap">Channel</th>
              <th className="p-4 border-b border-zinc-700 text-right whitespace-nowrap rounded-tr-xl">Tanggal</th>
            </tr>
          </thead>



          <tbody className="divide-y divide-zinc-800">
            {isLoading ? (
               <tr>
                 <td colSpan={8} className="p-12 text-center text-zinc-500 animate-pulse">
                   Memuat Data...
                 </td>
               </tr>
            ) : orders.length === 0 ? (
               <tr>
                 <td colSpan={8} className="p-12 text-center text-zinc-500">
                   Tidak ada data ditemukan.
                 </td>
               </tr>
            ) : (
              orders.map((order) => {
                const ageInfo = getOrderAgeInfo(order.createdAt, order.status);
                
                return (
                <tr 
                  key={order.id} 
                  onClick={() => onRowClick(order)}
                  className="hover:bg-zinc-800/60 cursor-pointer transition-colors group"
                >
                  <td className="p-3 text-center">
                    {order.previewImages && order.previewImages.length > 0 ? (
                      <img 
                        src={order.previewImages[0].url} 
                        className="w-10 h-10 rounded-lg object-cover mx-auto border border-zinc-700 group-hover:border-zinc-500" 
                        alt="Img" 
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 mx-auto flex items-center justify-center text-zinc-600">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                    )}
                  </td>
                  <td className="p-4 font-mono text-sm font-bold text-primary group-hover:text-red-400">
                    #{order.orderNo}
                  </td>
                  <td className="p-4">
                    <div className="font-bold text-zinc-200">{order.customerName}</div>
                    {order.recipientName && (
                        <div className="text-[10px] text-zinc-500">To: {order.recipientName}</div>
                    )}
                  </td>
                  <td className="p-4 text-sm text-zinc-300">
                    {order.productName}
                    {order.description && (
                        <div className="text-[10px] text-zinc-500 truncate max-w-[200px] italic">"{order.description}"</div>
                    )}
                  </td>
                  <td className="p-4 text-center font-bold text-white">
                    {order.quantity}
                  </td>
                  <td className="p-4 text-center">
                    <StatusBadge status={order.status} size="sm" />
                  </td>
                  <td className="p-4 text-center">
                      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                          order.channel === 'OFFLINE' 
                          ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' 
                          : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}>
                          {order.channel === 'OFFLINE' ? <ZapIcon className="w-3 h-3" /> : <GlobeIcon className="w-3 h-3" />}
                          {order.channel || 'ONLINE'}
                      </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="text-xs text-zinc-400 font-medium">{formatDate(order.createdAt)}</div>
                    <div className={`text-[10px] font-bold mt-0.5 ${ageInfo.colorClass}`}>
                       {ageInfo.label}
                    </div>
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
