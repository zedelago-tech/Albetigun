'use client';

import React, { useState, useEffect } from 'react';
import { ChefHat, CheckCircle, Clock, Package, Check, Trash2 } from 'lucide-react';

type Size = {
  id: string;
  name: string;
  price: number;
};

type Extra = {
  id: string;
  name: string;
  price: number;
};

type Product = {
  id: number;
  name: string;
  category: string;
};

type CartItem = {
  cartItemId: string;
  product: Product;
  quantity: number;
  selectedExtras: Extra[];
  selectedSize?: Size;
};

type Order = {
  orderNumber: string;
  items: CartItem[];
  total: number;
  status: 'PREPARANDO' | 'PRONTO' | 'ENTREGUE';
  createdAt: string;
  id: string; // unique internal id
  customerName: string;
  customerPhone?: string;
  paymentMethod: string;
  deliveryType: string;
  tableNumber?: string;
};

export default function CozinhaPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('sorvefood_cozinha_auth') === 'true';
    }
    return false;
  });
  const [passwordInput, setPasswordInput] = useState('');
  
  const [orders, setOrders] = useState<Order[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sorvefood_orders');
      if (saved) {
        try { return JSON.parse(saved); } catch { return []; }
      }
    }
    return [];
  });
  const [soundEnabled, setSoundEnabled] = useState(false);
  const isInitialLoad = React.useRef(true);
  const prevOrderIds = React.useRef<string[]>([]);

  const playChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const playTone = (freq: number, time: number, dur: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.5, time + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
         osc.start(time);
         osc.stop(time + dur);
      };
      playTone(523.25, ctx.currentTime, 0.5); // C5
      playTone(659.25, ctx.currentTime + 0.15, 0.5); // E5
    } catch(e) {}
  };

  useEffect(() => {
    const currentIds = orders.map(o => o.id);
    if (isInitialLoad.current) {
        if (orders.length > 0) isInitialLoad.current = false;
        prevOrderIds.current = currentIds;
        return;
    }

    const hasNewOrder = currentIds.some(id => !prevOrderIds.current.includes(id));
    if (hasNewOrder && soundEnabled) {
        playChime();
    }
    prevOrderIds.current = currentIds;
  }, [orders, soundEnabled]);

  // Load from LocalStorage to sync with the customer app
  useEffect(() => {
    const loadOrders = () => {
      const saved = localStorage.getItem('sorvefood_orders');
      if (saved) {
        try {
          setOrders(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to parse orders");
        }
      }
    };

    // Listen to changes from other tabs (customer placing an order)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'sorvefood_orders') {
        loadOrders();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Fallback polling just in case we are in the same window (e.g. iframe issues)
    const interval = setInterval(loadOrders, 2000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const updateOrderStatus = (orderId: string, newStatus: 'PREPARANDO' | 'PRONTO' | 'ENTREGUE') => {
    setOrders(prev => {
      const updated = prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o);
      localStorage.setItem('sorvefood_orders', JSON.stringify(updated));
      return updated;
    });
  };

  const clearDelivered = () => {
    setOrders(prev => {
      const filtered = prev.filter(o => o.status !== 'ENTREGUE');
      localStorage.setItem('sorvefood_orders', JSON.stringify(filtered));
      return filtered;
    });
  };

  const preparingOrders = orders.filter(o => o.status === 'PREPARANDO');
  const readyOrders = orders.filter(o => o.status === 'PRONTO');
  const deliveredOrders = orders.filter(o => o.status === 'ENTREGUE');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === 'admin123') {
       setIsAuthenticated(true);
       sessionStorage.setItem('sorvefood_cozinha_auth', 'true');
    } else {
       alert('Senha incorreta (dica: admin123)');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-neutral-800 p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center border border-neutral-700">
          <div className="w-16 h-16 bg-neutral-700 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <ChefHat size={32} />
          </div>
          <h1 className="text-2xl font-bold mb-2 text-white">Painel da Cozinha</h1>
          <p className="text-neutral-400 mb-6 text-sm">Digite a senha para visualizar os pedidos e controlar a fila.</p>
          <input 
            type="password" 
            value={passwordInput}
            onChange={e => setPasswordInput(e.target.value)}
            className="w-full border-2 border-neutral-600 bg-neutral-900 text-white rounded-xl px-4 py-3 mb-4 focus:outline-none focus:border-amber-500 text-center"
            placeholder="Senha"
            autoFocus
          />
          <button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl transition-colors">
             Acessar
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-neutral-900 text-white shadow-md z-10 p-4 shrink-0">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <ChefHat size={32} className="text-amber-500" />
            <span className="text-xl font-bold tracking-wider">PAINEL DA COZINHA</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="/admin" className="text-sm font-bold text-neutral-300 hover:text-white transition-colors underline-offset-4 hover:underline">
               Gerenciar Cardápio
            </a>
            <div className="flex gap-4 text-sm font-medium">
              <button 
                onClick={() => {
                  setSoundEnabled(!soundEnabled);
                  if (!soundEnabled) playChime();
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${soundEnabled ? 'border-green-500 text-green-400 bg-green-500/10' : 'border-neutral-700 text-neutral-400 hover:text-neutral-300'}`}
              >
                  {soundEnabled ? '🔔 Som Ativado' : '🔕 Som Desativado'}
              </button>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>Ao Vivo</div>
            </div>
          </div>
        </div>
      </header>

      {/* Kanban Board */}
      <main className="flex-1 overflow-x-auto p-6">
        <div className="flex gap-6 h-full min-w-max max-w-7xl mx-auto items-start">
          
          {/* Column: PREPARANDO */}
          <div className="w-96 flex flex-col bg-neutral-200/50 rounded-2xl p-4 min-h-[500px]">
             <div className="flex items-center justify-between mb-4 px-2">
                <h2 className="font-bold text-lg flex items-center gap-2"><Clock className="text-orange-500" size={20}/> Preparando</h2>
                <span className="bg-neutral-300 text-neutral-700 text-sm font-bold px-2 py-0.5 rounded-full">{preparingOrders.length}</span>
             </div>
             <div className="space-y-4 flex-1 overflow-y-auto pr-1 pb-4">
                {preparingOrders.map(order => (
                  <div key={order.id} className="bg-white rounded-xl shadow-sm border border-orange-200 p-5 animate-in slide-in-from-top-2">
                     <div className="flex justify-between items-center border-b border-neutral-100 pb-3 mb-3">
                        <span className="font-black text-2xl">#{order.orderNumber}</span>
                        <span className="text-sm font-bold text-neutral-500">{order.createdAt}</span>
                     </div>
                     <div className="mb-4 bg-amber-50 rounded-lg p-3 border border-amber-100">
                        <p className="font-bold text-amber-900 text-sm">Cliente: {order.customerName || 'Não identificado'}</p>
                        {order.customerPhone && <p className="text-xs text-amber-700 mt-0.5">{order.customerPhone}</p>}
                        
                        <div className="flex flex-col gap-1 mt-2 pt-2 border-t border-amber-200/50">
                          <p className="text-xs font-bold text-amber-900">
                            Entrega: {order.deliveryType === 'MESA' ? `Em Mesa (${order.tableNumber})` : 'Balcão'}
                          </p>
                          <p className="text-xs font-medium text-amber-800">
                            Pagamento: {order.paymentMethod === 'CARTAO' ? 'Cartão' : order.paymentMethod === 'DINHEIRO' ? 'Dinheiro' : 'PIX'}
                          </p>
                        </div>
                     </div>
                     <div className="space-y-3 mb-5">
                       {order.items.map(item => (
                         <div key={item.cartItemId} className="flex gap-3">
                           <span className="font-black text-orange-500">{item.quantity}x</span>
                           <div>
                              <p className="font-bold text-neutral-800 leading-tight">{item.product.name}</p>
                              {item.selectedSize && (
                                <p className="text-xs font-bold text-neutral-500 mt-1 uppercase tracking-wide bg-neutral-100 inline-block px-1.5 py-0.5 rounded mr-1">
                                  {item.selectedSize.name}
                                </p>
                              )}
                              {item.selectedExtras.length > 0 && (
                                <p className="text-xs font-bold text-neutral-500 mt-1 uppercase tracking-wide bg-neutral-100 inline-block px-1.5 py-0.5 rounded">
                                  + {item.selectedExtras.map(e => e.name).join(', ')}
                                </p>
                              )}
                           </div>
                         </div>
                       ))}
                     </div>
                     <button 
                        onClick={() => updateOrderStatus(order.id, 'PRONTO')}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg transition-colors flex justify-center items-center gap-2 shadow-md"
                     >
                        <CheckCircle size={20} />
                        Marcar como Pronto
                     </button>
                  </div>
                ))}
                {preparingOrders.length === 0 && <div className="text-center text-neutral-400 py-10 font-medium">Nenhum pedido na fila.</div>}
             </div>
          </div>

          {/* Column: PRONTO PARA RETIRADA */}
          <div className="w-96 flex flex-col bg-green-50 rounded-2xl p-4 min-h-[500px] border border-green-100">
             <div className="flex items-center justify-between mb-4 px-2">
                <h2 className="font-bold text-lg flex items-center gap-2 text-green-700"><Package size={20}/> Pronto (Aguardando Retirada)</h2>
                <span className="bg-green-200 text-green-800 text-sm font-bold px-2 py-0.5 rounded-full">{readyOrders.length}</span>
             </div>
             <div className="space-y-4 flex-1 overflow-y-auto pr-1 pb-4">
                {readyOrders.map(order => (
                  <div key={order.id} className="bg-white rounded-xl shadow-sm border border-green-200 p-5">
                     <div className="flex justify-between items-center mb-3">
                        <span className="font-black text-3xl text-green-600">#{order.orderNumber}</span>
                        <span className="text-xs font-bold text-green-500 bg-green-100 px-2 py-1 rounded-md">PRONTO</span>
                     </div>
                     <div className="mb-4 bg-green-50 rounded-lg p-3 border border-green-100">
                        <p className="font-bold text-green-900 text-sm">Chamar: {order.customerName || 'Cliente'}</p>
                        <p className="text-xs font-bold text-green-800 mt-1">
                          {order.deliveryType === 'MESA' ? `Levar na Mesa ${order.tableNumber}` : 'Retirada no Balcão'}
                        </p>
                     </div>
                     <p className="text-sm text-neutral-500 mb-5 font-medium">{order.items.length} itens no pedido</p>
                     
                     <div className="flex gap-2">
                        <button 
                           onClick={() => updateOrderStatus(order.id, 'PREPARANDO')}
                           className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold py-2 rounded-lg transition-colors text-sm"
                        >
                           Voltar
                        </button>
                        <button 
                           onClick={() => updateOrderStatus(order.id, 'ENTREGUE')}
                           className="flex-[2] bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded-lg transition-colors flex justify-center items-center gap-2 shadow-md"
                        >
                           <Check size={18} />
                           Entregue
                        </button>
                     </div>
                  </div>
                ))}
                {readyOrders.length === 0 && <div className="text-center text-green-600/50 py-10 font-medium">Nenhum pedido aguardando.</div>}
             </div>
          </div>

          {/* Column: ENTREGUE (Histórico recente) */}
          <div className="w-72 flex flex-col bg-neutral-200/30 rounded-2xl p-4 min-h-[500px]">
             <div className="flex items-center justify-between mb-4 px-2">
                <h2 className="font-bold text-base flex items-center gap-2 text-neutral-500"> Entregues</h2>
                {deliveredOrders.length > 0 && (
                  <button onClick={clearDelivered} className="text-neutral-400 hover:text-red-500 transition-colors p-1" title="Limpar Histórico">
                    <Trash2 size={16} />
                  </button>
                )}
             </div>
             <div className="space-y-3 flex-1 overflow-y-auto pr-1 pb-4">
                {deliveredOrders.map(order => (
                  <div key={order.id} className="bg-neutral-100 rounded-lg border border-neutral-200 p-3 opacity-70">
                     <div className="flex gap-2 items-center justify-between mb-1">
                       <span className="font-bold text-neutral-600 text-sm">#{order.orderNumber}</span>
                       <span className="text-[10px] text-neutral-400 font-bold">{order.createdAt}</span>
                     </div>
                     <p className="text-xs font-medium text-neutral-700 mb-1">{order.customerName}</p>
                     <p className="text-xs text-neutral-500 truncate">{order.items.map(i => i.product.name).join(', ')}</p>
                  </div>
                ))}
             </div>
          </div>

        </div>
      </main>
    </div>
  );
}
