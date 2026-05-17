'use client';

import React, { useState, useEffect } from 'react';
import { ChefHat, CheckCircle, Clock, Package, Check, Trash2, History, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

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
  status: 'NOVO' | 'PREPARANDO' | 'PRONTO' | 'ENTREGUE';
  createdAt: string;
  id: string; // unique internal id
  customerName: string;
  customerPhone?: string;
  paymentMethod: string;
  deliveryType: string;
  tableNumber?: string;
};

export default function CozinhaPanel() {
  // isMounted garante que o sessionStorage só é lido no cliente,
  // evitando o erro de hidratação causado por diferença servidor/cliente.
  const [isMounted, setIsMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [soundType, setSoundType] = useState<'suave' | 'retro' | 'classic' | 'bell'>('suave');
  const isInitialLoad = React.useRef(true);
  const prevOrderIds = React.useRef<string[]>([]);

  // IDs arquivados visualmente (persistem no localStorage, nunca deletam do Supabase)
  const [archivedIds, setArchivedIds] = useState<string[]>([]);
  // Modal do histórico completo
  const [showHistory, setShowHistory] = useState(false);
  const [historyOrders, setHistoryOrders] = useState<Order[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Executado apenas no cliente após a hidratação
  useEffect(() => {
    setIsMounted(true);
    setIsAuthenticated(
      localStorage.getItem('sorvefood_cozinha_auth') === 'true' ||
      sessionStorage.getItem('sorvefood_cozinha_auth') === 'true'
    );
    // Carrega IDs arquivados e som padrão do localStorage
    try {
      const saved = localStorage.getItem('arquivados_cozinha');
      if (saved) setArchivedIds(JSON.parse(saved));
    } catch {}
    try {
      const savedSound = localStorage.getItem('sorvefood_cozinha_sound');
      if (savedSound) setSoundType(savedSound as any);
    } catch {}
  }, []);

  const playChime = (typeOverride?: 'suave' | 'retro' | 'classic' | 'bell') => {
    try {
      const activeType = typeOverride || soundType;
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const playTone = (freq: number, time: number, dur: number, wave: 'sine' | 'triangle' | 'sawtooth' | 'square' = 'sine', vol = 0.3) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = wave;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(vol, time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
        osc.start(time);
        osc.stop(time + dur);
      };

      const now = ctx.currentTime;

      if (activeType === 'suave') {
        playTone(523.25, now, 0.6, 'sine', 0.4); // C5
        playTone(659.25, now + 0.1, 0.6, 'sine', 0.4); // E5
        playTone(783.99, now + 0.2, 0.8, 'sine', 0.4); // G5
      } else if (activeType === 'retro') {
        playTone(300, now, 0.1, 'triangle', 0.3);
        playTone(600, now + 0.05, 0.1, 'triangle', 0.3);
        playTone(900, now + 0.1, 0.1, 'triangle', 0.3);
        playTone(1200, now + 0.15, 0.3, 'triangle', 0.3);
      } else if (activeType === 'classic') {
        playTone(880, now, 0.15, 'square', 0.25);
        playTone(880, now + 0.22, 0.15, 'square', 0.25);
      } else if (activeType === 'bell') {
        // Metallic FM bell chime
        playTone(1000, now, 1.2, 'sine', 0.4);
        playTone(1500, now, 1.0, 'sine', 0.2);
        playTone(2200, now, 0.8, 'sine', 0.1);
      }
    } catch(e) {}
  };

  useEffect(() => {
    const currentIds = orders.map(o => o.id);
    if (isInitialLoad.current) {
        if (orders.length > 0) isInitialLoad.current = false;
        prevOrderIds.current = currentIds;
        return;
    }

    // Dispara o BIP apenas para pedidos novos com status 'NOVO'
    const hasNewNovoOrder = orders.some(
      o => o.status === 'NOVO' && !prevOrderIds.current.includes(o.id)
    );
    if (hasNewNovoOrder && soundEnabled) {
        playChime();
    }
    prevOrderIds.current = currentIds;
  }, [orders, soundEnabled]);

  useEffect(() => {
    async function fetchOrders() {
      if (!isAuthenticated) return;
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            quantity,
            unit_price,
            obs,
            products ( name ),
            product_sizes ( name ),
            order_item_extras ( product_extras ( name ) )
          )
        `)
        // Pedidos mais antigos primeiro (fila FIFO da cozinha)
        .order('created_at', { ascending: true });

      if (data && !error) {
         const mappedOrders: Order[] = data.map((o: any) => ({
            id: o.id,
            orderNumber: o.id.split('-').pop() || o.id,
            status: o.status,
            customerName: o.customer_name,
            customerPhone: o.customer_phone,
            paymentMethod: o.payment_method,
            deliveryType: o.delivery_type,
            tableNumber: o.table_number,
            total: Number(o.total_amount),
            createdAt: new Date(o.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            items: (o.order_items || []).map((item: any, idx: number) => ({
               cartItemId: 'item_' + idx,
               quantity: item.quantity,
               product: { name: item.products?.name ?? 'Item', category: '' },
               selectedSize: item.product_sizes ? { name: item.product_sizes.name } : undefined,
               selectedExtras: (item.order_item_extras || []).map((ex: any) => ({ name: ex.product_extras?.name ?? '' }))
            }))
         }));
         setOrders(mappedOrders);
      } else if (error) {
         console.error('Erro ao buscar pedidos:', JSON.stringify(error));
      }
    }

    if (isAuthenticated) {
       fetchOrders();
       const interval = setInterval(fetchOrders, 3000);
       return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const updateOrderStatus = async (orderId: string, newStatus: 'PREPARANDO' | 'PRONTO' | 'ENTREGUE') => {
    // Update locally instantly for UX
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    
    // Update remote
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (error) {
       console.error("Erro ao atualizar status", error);
       alert("Erro de conexão ao atualizar o status do pedido.");
    }
  };

  // Arquiva visualmente os entregues (salva IDs no localStorage, não deleta do Supabase)
  const archiveDelivered = () => {
    const visibleDeliveredIds = orders
      .filter(o => o.status === 'ENTREGUE' && !archivedIds.includes(o.id))
      .map(o => o.id);
    if (visibleDeliveredIds.length === 0) return;
    const newArchived = [...archivedIds, ...visibleDeliveredIds];
    setArchivedIds(newArchived);
    localStorage.setItem('arquivados_cozinha', JSON.stringify(newArchived));
  };

  // Busca todo o histórico de ENTREGUE direto do Supabase (ignora filtro local)
  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    setShowHistory(true);
    const { data, error } = await supabase
      .from('orders')
      .select('id, customer_name, total_amount, created_at, order_items(quantity, products(name))')
      .eq('status', 'ENTREGUE')
      .order('created_at', { ascending: false });
    if (data && !error) {
      setHistoryOrders(data.map((o: any) => ({
        id: o.id,
        orderNumber: o.id.split('-').pop() || o.id,
        status: 'ENTREGUE' as const,
        customerName: o.customer_name,
        total: Number(o.total_amount),
        createdAt: new Date(o.created_at).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }),
        items: (o.order_items || []).map((item: any, idx: number) => ({
          cartItemId: 'h_' + idx,
          quantity: item.quantity,
          product: { name: item.products?.name ?? 'Item', category: '' },
          selectedExtras: [],
        })),
        paymentMethod: '',
        deliveryType: '',
      })));
    }
    setIsLoadingHistory(false);
  };

  // 'NOVO' e 'PREPARANDO' aparecem juntos na fila da cozinha
  const preparingOrders = orders.filter(o => o.status === 'NOVO' || o.status === 'PREPARANDO');
  const readyOrders = orders.filter(o => o.status === 'PRONTO');
  // Exibe apenas entregues que ainda não foram arquivados localmente
  const deliveredOrders = orders.filter(o => o.status === 'ENTREGUE' && !archivedIds.includes(o.id));
  const archivedCount = orders.filter(o => o.status === 'ENTREGUE' && archivedIds.includes(o.id)).length;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPassword = process.env.NEXT_PUBLIC_COZINHA_PASSWORD || 'admin123';
    if (passwordInput === correctPassword) {
       setIsAuthenticated(true);
       localStorage.setItem('sorvefood_cozinha_auth', 'true');
    } else {
       alert('Senha incorreta!');
    }
  };

  // Enquanto não hidratou, não renderiza nada para evitar mismatch
  if (!isMounted) return null;

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
    <>
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
            <div className="flex gap-4 text-sm font-medium items-center">
              <div className="flex items-center gap-2">
                {soundEnabled && (
                  <select
                    value={soundType}
                    onChange={(e) => {
                      const newType = e.target.value as any;
                      setSoundType(newType);
                      localStorage.setItem('sorvefood_cozinha_sound', newType);
                      playChime(newType);
                    }}
                    className="bg-neutral-800 text-xs font-bold text-neutral-300 border border-neutral-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500 text-white"
                  >
                    <option value="suave">🎵 Campainha Suave</option>
                    <option value="retro">🎮 Alerta Retrô</option>
                    <option value="classic">🚨 Bip Duplo</option>
                    <option value="bell">🔔 Sino de Vento</option>
                  </select>
                )}
                <button 
                  onClick={() => {
                    const nextVal = !soundEnabled;
                    setSoundEnabled(nextVal);
                    if (nextVal) playChime();
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-xs font-bold ${soundEnabled ? 'border-green-500 text-green-400 bg-green-500/10' : 'border-neutral-700 text-neutral-400 hover:text-neutral-300'}`}
                >
                    {soundEnabled ? '🔔 Som Ativado' : '🔕 Som Desativado'}
                </button>
              </div>
              <div className="flex items-center gap-1.5 text-xs"><div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>Ao Vivo</div>
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
                <div className="flex items-center gap-1">
                  <button
                    onClick={fetchHistory}
                    title="Ver Histórico Completo"
                    className="flex items-center gap-1 text-[11px] font-bold text-neutral-400 hover:text-amber-500 bg-white/60 hover:bg-amber-50 border border-neutral-200 hover:border-amber-300 px-2 py-1 rounded-full transition-all"
                  >
                    <History size={13} />
                    {archivedCount > 0 && <span className="text-amber-500">{archivedCount}</span>}
                  </button>
                  {deliveredOrders.length > 0 && (
                    <button onClick={archiveDelivered} className="text-neutral-400 hover:text-red-500 transition-colors p-1" title="Ocultar da lista">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
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

    {/* MODAL: HISTÓRICO COMPLETO */}
    {showHistory && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-neutral-900/70 backdrop-blur-sm" onClick={() => setShowHistory(false)} />
        <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between p-5 border-b border-neutral-100 shrink-0">
            <div className="flex items-center gap-2 font-bold text-lg text-neutral-800">
              <History size={20} className="text-amber-500" />
              Histórico Completo de Entregues
            </div>
            <button onClick={() => setShowHistory(false)} className="p-2 rounded-full hover:bg-neutral-100 text-neutral-500 transition-colors">
              <X size={20} />
            </button>
          </div>
          <div className="overflow-y-auto flex-1 p-5 space-y-3">
            {isLoadingHistory ? (
              <div className="text-center py-10 text-neutral-400 font-medium">Carregando...</div>
            ) : historyOrders.length === 0 ? (
              <div className="text-center py-10 text-neutral-400 font-medium">Nenhum pedido entregue encontrado.</div>
            ) : historyOrders.map(order => (
              <div key={order.id} className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-black text-neutral-700">#{order.orderNumber}</span>
                  <span className="text-xs text-neutral-400 font-medium">{order.createdAt}</span>
                </div>
                <p className="text-sm font-semibold text-neutral-600 mb-1">{order.customerName}</p>
                <p className="text-xs text-neutral-400 truncate">
                  {order.items.map(i => `${i.quantity}x ${i.product.name}`).join(' • ')}
                </p>
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-neutral-100">
                  <span className="text-[10px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">ENTREGUE</span>
                  <span className="font-bold text-neutral-700 text-sm">R$ {order.total.toFixed(2).replace('.', ',')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )}
  </>
  );
}
