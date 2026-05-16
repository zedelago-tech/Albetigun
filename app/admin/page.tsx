'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Settings, Edit2, Trash2, Plus, Image as ImageIcon, Save, X, PlusCircle, Lock, Store, LayoutGrid, BarChart3, TrendingUp, DollarSign } from 'lucide-react';

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
  description: string;
  price: number;
  category: string;
  image: string;
  extras?: Extra[];
  sizes?: Size[];
  isAvailable?: boolean;
  isHidden?: boolean;
};

type StoreSettings = {
  bannerImage: string;
  bannerTitle: string;
  bannerDescription: string;
};

type Order = {
  id: string;
  orderNumber: string;
  items: any[];
  total: number;
  status: string;
  createdAt: string;
  customerName: string;
  customerPhone?: string;
  paymentMethod: string;
  deliveryType: string;
  tableNumber?: string;
};

const INITIAL_CATEGORIES = ['Sorvetes', 'Lanches', 'Bebidas', 'Sobremesas'];

export default function AdminMenuPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('sorvefood_admin_auth') === 'true';
    }
    return false;
  });
  const [passwordInput, setPasswordInput] = useState('');
  
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'stats' | 'settings'>('products');
  const [storeOpen, setStoreOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sorvefood_store_status');
      return saved !== null ? JSON.parse(saved) : true;
    }
    return true;
  });
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(() => {
    const defaultSettings = {
      bannerImage: 'https://picsum.photos/seed/icecreamhero/1200/400',
      bannerTitle: 'O Melhor Sorvete da Cidade',
      bannerDescription: 'Sabor artesanal, ingredientes frescos e muito amor na receita.'
    };
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sorvefood_store_settings');
      if (saved) {
        try { return JSON.parse(saved); } catch { return defaultSettings; }
      }
    }
    return defaultSettings;
  });

  const [products, setProducts] = useState<Product[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sorvefood_products');
      if (saved) {
        try { return JSON.parse(saved); } catch { return []; }
      }
    }
    return [];
  });
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sorvefood_categories');
      if (saved) {
        try { return JSON.parse(saved); } catch { return INITIAL_CATEGORIES; }
      }
    }
    return INITIAL_CATEGORIES;
  });
  const [orders, setOrders] = useState<Order[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sorvefood_orders');
      if (saved) {
        try { return JSON.parse(saved); } catch { return []; }
      }
    }
    return [];
  });

  useEffect(() => {
    if (!localStorage.getItem('sorvefood_categories')) {
      localStorage.setItem('sorvefood_categories', JSON.stringify(INITIAL_CATEGORIES));
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === 'admin123') {
       setIsAuthenticated(true);
       sessionStorage.setItem('sorvefood_admin_auth', 'true');
    } else {
       alert('Senha incorreta (dica: admin123)');
    }
  };

  const toggleStoreStatus = () => {
    const newState = !storeOpen;
    setStoreOpen(newState);
    localStorage.setItem('sorvefood_store_status', JSON.stringify(newState));
    window.dispatchEvent(new Event('storage'));
  };

  const addCategory = () => {
    const newCat = window.prompt("Nome da nova Categoria:");
    if (newCat && newCat.trim()) {
       const updated = [...new Set([...categories, newCat.trim()])];
       setCategories(updated);
       localStorage.setItem('sorvefood_categories', JSON.stringify(updated));
       window.dispatchEvent(new Event('storage')); // notify customer app
    }
  };

  const deleteCategory = (cat: string) => {
    if (window.confirm(`Remover categoria "${cat}"? (Produtos continuarão existindo mas sem essa categoria no filtro)`)) {
       const updated = categories.filter(c => c !== cat);
       setCategories(updated);
       localStorage.setItem('sorvefood_categories', JSON.stringify(updated));
       window.dispatchEvent(new Event('storage'));
    }
  };

  useEffect(() => {
    const loadProducts = () => {
      const saved = localStorage.getItem('sorvefood_products');
      if (saved) {
        try {
          setProducts(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to parse products");
        }
      }
    };
    loadProducts();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'sorvefood_products') {
        loadProducts();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const saveProducts = (newProducts: Product[]) => {
    setProducts(newProducts);
    localStorage.setItem('sorvefood_products', JSON.stringify(newProducts));
    
    // Simulate storage event for same-window updates
    window.dispatchEvent(new Event('storage'));
  };

  const toggleProductAvailability = (id: number) => {
    const updated = products.map(p => p.id === id ? { ...p, isAvailable: p.isAvailable === false ? true : false } : p);
    saveProducts(updated);
  };

  const toggleProductVisibility = (id: number) => {
    const updated = products.map(p => p.id === id ? { ...p, isHidden: p.isHidden === true ? false : true } : p);
    saveProducts(updated);
  };

  const handleEditClick = (product: Product) => {
    setEditingProduct({ ...product }); // deep copy if needed, but shallow is okay for primitives, note extras
    if (product.extras) {
        setEditingProduct(prev => prev ? { ...prev, extras: [...product.extras!] } : null);
    }
    if (product.sizes) {
        setEditingProduct(prev => prev ? { ...prev, sizes: [...product.sizes!] } : null);
    }
  };

  const handleDeleteClick = (id: number) => {
    if (window.confirm("Certeza que deseja remover este produto?")) {
      const updated = products.filter(p => p.id !== id);
      saveProducts(updated);
    }
  };

  const handleAddProduct = () => {
    const newProduct: Product = {
      id: Date.now(),
      name: 'Novo Produto',
      description: 'Descrição do produto',
      price: 0,
      category: 'Lanches',
      image: 'https://picsum.photos/seed/new/400/300',
      extras: [],
      sizes: [],
      isAvailable: true
    };
    setEditingProduct(newProduct);
  };

  const handleSaveModal = () => {
    if (editingProduct) {
      const exists = products.some(p => p.id === editingProduct.id);
      let updated: Product[];
      if (exists) {
        updated = products.map(p => p.id === editingProduct.id ? editingProduct : p);
      } else {
        updated = [...products, editingProduct];
      }
      saveProducts(updated);
      setEditingProduct(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock size={32} />
          </div>
          <h1 className="text-2xl font-bold mb-2">Painel Admin</h1>
          <p className="text-neutral-500 mb-6 text-sm">Digite a senha para acessar os controles da loja e cardápio.</p>
          <input 
            type="password" 
            value={passwordInput}
            onChange={e => setPasswordInput(e.target.value)}
            className="w-full border-2 border-neutral-200 rounded-xl px-4 py-3 mb-4 focus:outline-none focus:border-amber-500 text-center"
            placeholder="Senha"
            autoFocus
          />
          <button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl transition-colors">
             Entrar
          </button>
        </form>
      </div>
    );
  }

  const isClosed = !storeOpen;
  const todayOrders = orders.filter(o => o.createdAt.includes('/')); // Basic check or just use all items if we want total history 
  // actually, createdAt in this app is just "15:30" string so we can't filter by day easily without storing Date.
  // We will assume "orders" holds all history for simplicity, but let's calculate total revenue
  const totalRevenue = orders.filter(o => o.status === 'ENTREGUE').reduce((acc, o) => acc + o.total, 0);
  const pendingOrders = orders.filter(o => o.status !== 'ENTREGUE').length;

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900 font-sans pb-20">
      <header className="bg-amber-500 text-white shadow-md z-10 p-4 sticky top-0">
        <div className="flex items-center justify-between max-w-7xl mx-auto flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Settings size={28} />
            <span className="text-xl font-extrabold tracking-tight">Admin | Config</span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleStoreStatus}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-colors border-2 ${storeOpen ? 'bg-green-500 border-green-400 hover:bg-green-600' : 'bg-red-500 border-red-400 hover:bg-red-600'}`}
            >
              <Store size={16} />
              {storeOpen ? 'Loja Aberta (Pausar)' : 'Loja Pausada (Abrir)'}
            </button>
            <div className="h-6 w-px bg-amber-400 mx-2"></div>
            <div className="flex items-center gap-4 text-sm font-bold">
              <Link href="/cozinha" className="text-amber-100 hover:text-white transition-colors">Ver Cozinha</Link>
              <span className="text-amber-300">|</span>
              <Link href="/" className="text-amber-100 hover:text-white transition-colors">Ver App</Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        
        {/* TAB NAVIGATION */}
        <div className="flex gap-2 mb-8 bg-white p-2 rounded-2xl shadow-sm border border-neutral-200 inline-flex">
           <button 
             onClick={() => setActiveTab('products')} 
             className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${activeTab === 'products' ? 'bg-amber-500 text-white shadow-sm' : 'text-neutral-500 hover:bg-neutral-50'}`}
           >
             <LayoutGrid size={18} /> Produtos
           </button>
           <button 
             onClick={() => setActiveTab('categories')} 
             className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${activeTab === 'categories' ? 'bg-amber-500 text-white shadow-sm' : 'text-neutral-500 hover:bg-neutral-50'}`}
           >
             <LayoutGrid size={18} /> Categorias
           </button>
           <button 
             onClick={() => setActiveTab('stats')} 
             className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${activeTab === 'stats' ? 'bg-amber-500 text-white shadow-sm' : 'text-neutral-500 hover:bg-neutral-50'}`}
           >
             <BarChart3 size={18} /> Relatórios
           </button>
           <button 
             onClick={() => setActiveTab('settings')} 
             className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${activeTab === 'settings' ? 'bg-amber-500 text-white shadow-sm' : 'text-neutral-500 hover:bg-neutral-50'}`}
           >
             <Settings size={18} /> Loja / API
           </button>
        </div>

        {activeTab === 'settings' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 max-w-2xl">
            <h1 className="text-2xl font-bold mb-6">Configurações da Loja (Banner)</h1>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-200">
               <div className="space-y-4">
                 <div>
                   <label className="block text-sm font-bold text-neutral-700 mb-1">Título do Banner</label>
                   <input 
                     type="text" 
                     value={storeSettings.bannerTitle}
                     onChange={e => setStoreSettings({...storeSettings, bannerTitle: e.target.value})}
                     className="w-full border border-neutral-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500 text-neutral-900"
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-bold text-neutral-700 mb-1">Descrição do Banner</label>
                   <textarea 
                     value={storeSettings.bannerDescription}
                     onChange={e => setStoreSettings({...storeSettings, bannerDescription: e.target.value})}
                     className="w-full border border-neutral-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500 text-neutral-900 h-20 resize-none"
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-bold text-neutral-700 mb-1">URL da Imagem do Banner</label>
                   <input 
                     type="text" 
                     value={storeSettings.bannerImage}
                     onChange={e => setStoreSettings({...storeSettings, bannerImage: e.target.value})}
                     className="w-full border border-neutral-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500 text-neutral-900"
                   />
                 </div>
                 <button 
                   onClick={() => {
                     localStorage.setItem('sorvefood_store_settings', JSON.stringify(storeSettings));
                     window.dispatchEvent(new Event('storage'));
                     alert('Configurações salvas! Atualize a página do cliente para ver.');
                   }}
                   className="mt-4 w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 px-6 rounded-xl transition-colors shadow-sm"
                 >
                   Salvar Configurações
                 </button>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="animate-in fade-in slide-in-from-bottom-2">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold">Gerenciar Cardápio</h1>
              <button 
                onClick={handleAddProduct}
                className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 px-4 rounded-xl transition-colors flex items-center gap-2 shadow-sm"
              >
                <Plus size={18} /> Novo Produto
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 text-sm font-medium">
                      <th className="p-4 w-16">Foto</th>
                      <th className="p-4">Nome</th>
                      <th className="p-4">Categoria</th>
                      <th className="p-4">Preço</th>
                      <th className="p-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(product => (
                      <tr key={product.id} className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
                        <td className="p-4">
                          <div className="w-12 h-12 bg-neutral-200 rounded-lg overflow-hidden relative">
                             {/* eslint-disable-next-line @next/next/no-img-element */}
                             <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="font-bold text-neutral-800">{product.name}</p>
                          <p className="text-xs text-neutral-500 truncate max-w-[200px]">{product.description}</p>
                        </td>
                        <td className="p-4">
                          <span className="inline-block px-2.5 py-1 bg-amber-50 text-amber-600 rounded-md text-xs font-bold">
                            {product.category}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-neutral-800">
                          R$ {product.price.toFixed(2).replace('.', ',')}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => toggleProductAvailability(product.id)}
                              className={`p-2 rounded-lg transition-colors font-bold text-xs ${product.isAvailable === false ? 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200' : 'bg-blue-50 text-blue-500 hover:bg-blue-100'}`}
                              title={product.isAvailable === false ? 'Ativar (Descongelar)' : 'Pausar (Congelar)'}
                            >
                              {product.isAvailable === false ? 'Pausado' : 'Online'}
                            </button>
                            <button
                              onClick={() => toggleProductVisibility(product.id)}
                              className={`p-2 rounded-lg transition-colors font-bold text-xs ${product.isHidden ? 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200' : 'bg-purple-50 text-purple-600 hover:bg-purple-100'}`}
                              title={product.isHidden ? 'Mostrar no Cardápio' : 'Tirar do Cardápio'}
                            >
                              {product.isHidden ? 'Oculto' : 'Visível'}
                            </button>
                            <button 
                              onClick={() => handleEditClick(product)}
                              className="p-2 text-neutral-500 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button 
                              onClick={() => handleDeleteClick(product.id)}
                              className="p-2 text-neutral-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {products.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-neutral-500">
                          Nenhum produto cadastrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 max-w-2xl">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold">Categorias</h1>
              <button 
                onClick={addCategory}
                className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 px-4 rounded-xl transition-colors flex items-center gap-2 shadow-sm"
              >
                <Plus size={18} /> Nova Categoria
              </button>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden divide-y divide-neutral-100">
               {categories.map(cat => (
                 <div key={cat} className="p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors">
                    <span className="font-bold text-neutral-800">{cat}</span>
                    <button 
                      onClick={() => deleteCategory(cat)}
                      className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors bg-white border border-neutral-100"
                    >
                      <Trash2 size={18} />
                    </button>
                 </div>
               ))}
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="animate-in fade-in slide-in-from-bottom-2">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
               <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-200">
                  <div className="flex items-center gap-3 mb-2 text-green-600">
                     <DollarSign size={24} />
                     <h3 className="font-bold text-neutral-500">Receita Total Entregue</h3>
                  </div>
                  <p className="text-4xl font-black text-neutral-900">R$ {totalRevenue.toFixed(2).replace('.', ',')}</p>
               </div>
               <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-200">
                  <div className="flex items-center gap-3 mb-2 text-blue-500">
                     <TrendingUp size={24} />
                     <h3 className="font-bold text-neutral-500">Total de Pedidos</h3>
                  </div>
                  <p className="text-4xl font-black text-neutral-900">{orders.length}</p>
               </div>
               <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-200">
                  <div className="flex items-center gap-3 mb-2 text-amber-500">
                     <Settings size={24} />
                     <h3 className="font-bold text-neutral-500">Pedidos na Fila</h3>
                  </div>
                  <p className="text-4xl font-black text-neutral-900">{pendingOrders}</p>
               </div>
             </div>
             
             <div className="bg-white rounded-3xl shadow-sm border border-neutral-200 p-6">
                <h3 className="font-bold text-lg mb-4">Últimos Pedidos</h3>
                <div className="overflow-x-auto">
                   <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="bg-neutral-50 text-neutral-500">
                          <th className="p-3 font-medium">Pedido</th>
                          <th className="p-3 font-medium">Cliente</th>
                          <th className="p-3 font-medium">Total</th>
                          <th className="p-3 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.slice(0, 10).map(o => (
                          <tr key={o.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                            <td className="p-3 font-bold">#{o.orderNumber}</td>
                            <td className="p-3">{o.customerName}</td>
                            <td className="p-3 font-medium">R$ {o.total.toFixed(2).replace('.', ',')}</td>
                            <td className="p-3">
                              <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${o.status === 'ENTREGUE' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                {o.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                   </table>
                </div>
             </div>
          </div>
        )}
      </main>

      {/* EDIT MODAL */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm" onClick={() => setEditingProduct(null)}></div>
          <div className="relative bg-white rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 object-cover overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="flex justify-between items-center p-5 border-b border-neutral-100 shrink-0">
               <h2 className="text-xl font-bold text-neutral-800">
                 {editingProduct.id.toString().length > 6 ? 'Criar Produto' : 'Editar Produto'}
               </h2>
               <button onClick={() => setEditingProduct(null)} className="p-2 text-neutral-400 hover:text-neutral-700 bg-neutral-100 rounded-full transition-colors"><X size={20}/></button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
               {/* IMAGE BANNER */}
               <div className="flex gap-4 items-center">
                  <div className="w-24 h-24 rounded-2xl bg-neutral-100 overflow-hidden relative shrink-0 border border-neutral-200">
                     {/* eslint-disable-next-line @next/next/no-img-element */}
                     <img src={editingProduct.image} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                     <label className="block text-sm font-bold text-neutral-700 mb-1">URL da Imagem</label>
                     <input 
                       type="text" 
                       value={editingProduct.image} 
                       onChange={e => setEditingProduct({...editingProduct, image: e.target.value})}
                       className="w-full border border-neutral-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                     />
                     <span className="text-xs text-neutral-400 block mt-1">Cole aqui um link de imagem.</span>
                  </div>
               </div>

               {/* NOME E PREÇO */}
               <div className="flex gap-4">
                  <div className="flex-[2]">
                    <label className="block text-sm font-bold text-neutral-700 mb-1">Nome do Produto</label>
                    <input 
                       type="text" 
                       value={editingProduct.name} 
                       onChange={e => setEditingProduct({...editingProduct, name: e.target.value})}
                       className="w-full border border-neutral-300 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-neutral-900"
                       placeholder="Ex: Sorvete de Morango"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-bold text-neutral-700 mb-1">Preço (R$)</label>
                    <input 
                       type="number" 
                       value={editingProduct.price} 
                       onChange={e => setEditingProduct({...editingProduct, price: parseFloat(e.target.value) || 0})}
                       className="w-full border border-neutral-300 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-neutral-900"
                       step="0.01"
                    />
                  </div>
               </div>

               {/* CATEGORIA E DESCRIÇÃO */}
               <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-1">Categoria</label>
                  <div className="flex gap-2">
                    <select 
                       value={editingProduct.category}
                       onChange={e => setEditingProduct({...editingProduct, category: e.target.value})}
                       className="flex-1 border border-neutral-300 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-neutral-900 bg-white"
                    >
                       {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <button onClick={addCategory} className="bg-amber-100 hover:bg-amber-200 text-amber-700 px-3 rounded-xl font-bold transition-colors text-sm shrink-0">
                       + Nova
                    </button>
                  </div>
               </div>

               <div>
                 <label className="block text-sm font-bold text-neutral-700 mb-1">Descrição</label>
                 <textarea 
                    value={editingProduct.description} 
                    onChange={e => setEditingProduct({...editingProduct, description: e.target.value})}
                    className="w-full border border-neutral-300 rounded-xl px-3 py-2 h-20 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-neutral-900 resize-none"
                    placeholder="Descrição para atrair o cliente..."
                 />
               </div>
               
               {/* TAMANHOS */}
               <div className="border-t border-neutral-100 pt-4 mt-2">
                 <div className="flex justify-between items-center mb-2">
                   <label className="block text-sm font-bold text-neutral-700">Tamanhos / Variações</label>
                   <button 
                     onClick={() => setEditingProduct(prev => prev ? {...prev, sizes: [...(prev.sizes||[]), {id: 's'+Date.now(), name: '', price: 0}]} : prev)}
                     className="text-xs font-bold text-amber-500 hover:text-amber-600 flex items-center gap-1"
                   >
                     <PlusCircle size={14} /> Novo
                   </button>
                 </div>
                 
                 <div className="space-y-2">
                    {editingProduct.sizes?.map((size, idx) => (
                       <div key={size.id} className="flex gap-2">
                          <input 
                            type="text" 
                            value={size.name}
                            onChange={(e) => {
                              const updatedSizes = [...(editingProduct.sizes || [])];
                              updatedSizes[idx].name = e.target.value;
                              setEditingProduct({...editingProduct, sizes: updatedSizes});
                            }}
                            className="flex-[2] border border-neutral-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-amber-500" 
                            placeholder="Nome (Ex: 300ml)"
                          />
                          <input 
                            type="number" 
                            value={size.price}
                            onChange={(e) => {
                              const updatedSizes = [...(editingProduct.sizes || [])];
                              updatedSizes[idx].price = parseFloat(e.target.value) || 0;
                              setEditingProduct({...editingProduct, sizes: updatedSizes});
                            }}
                            className="flex-1 border border-neutral-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-amber-500" 
                            placeholder="Preço (Substitui base)"
                            step="0.01"
                          />
                          <button 
                            onClick={() => {
                              const updatedSizes = (editingProduct.sizes || []).filter((_, i) => i !== idx);
                              setEditingProduct({...editingProduct, sizes: updatedSizes});
                            }}
                            className="w-8 flex items-center justify-center bg-red-50 text-red-500 rounded-lg shrink-0 hover:bg-red-100"
                          >
                            <Trash2 size={14} />
                          </button>
                       </div>
                    ))}
                    {(!editingProduct.sizes || editingProduct.sizes.length === 0) && (
                       <p className="text-xs text-neutral-400 italic">Nenhum tamanho configurado (usa preço base).</p>
                    )}
                 </div>
               </div>
               
               {/* EXTRAS */}
               <div className="border-t border-neutral-100 pt-4 mt-2">
                 <div className="flex justify-between items-center mb-2">
                   <label className="block text-sm font-bold text-neutral-700">Adicionais</label>
                   <button 
                     onClick={() => setEditingProduct(prev => prev ? {...prev, extras: [...(prev.extras||[]), {id: 'e'+Date.now(), name: '', price: 0}]} : prev)}
                     className="text-xs font-bold text-amber-500 hover:text-amber-600 flex items-center gap-1"
                   >
                     <PlusCircle size={14} /> Novo
                   </button>
                 </div>
                 
                 <div className="space-y-2">
                    {editingProduct.extras?.map((extra, idx) => (
                       <div key={extra.id} className="flex gap-2">
                          <input 
                            type="text" 
                            value={extra.name}
                            onChange={(e) => {
                              const updatedExtras = [...(editingProduct.extras || [])];
                              updatedExtras[idx].name = e.target.value;
                              setEditingProduct({...editingProduct, extras: updatedExtras});
                            }}
                            className="flex-[2] border border-neutral-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-amber-500" 
                            placeholder="Nome (Ex: Chantilly)"
                          />
                          <input 
                            type="number" 
                            value={extra.price}
                            onChange={(e) => {
                              const updatedExtras = [...(editingProduct.extras || [])];
                              updatedExtras[idx].price = parseFloat(e.target.value) || 0;
                              setEditingProduct({...editingProduct, extras: updatedExtras});
                            }}
                            className="flex-1 border border-neutral-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-amber-500" 
                            placeholder="Preço"
                            step="0.01"
                          />
                          <button 
                            onClick={() => {
                              const updatedExtras = (editingProduct.extras || []).filter((_, i) => i !== idx);
                              setEditingProduct({...editingProduct, extras: updatedExtras});
                            }}
                            className="w-8 flex items-center justify-center bg-red-50 text-red-500 rounded-lg shrink-0 hover:bg-red-100"
                          >
                            <Trash2 size={14} />
                          </button>
                       </div>
                    ))}
                    {(!editingProduct.extras || editingProduct.extras.length === 0) && (
                       <p className="text-xs text-neutral-400 italic">Nenhum adicional configurado.</p>
                    )}
                 </div>
               </div>

            </div>

            <div className="p-4 border-t border-neutral-100 bg-neutral-50 shrink-0">
               <button 
                 onClick={handleSaveModal}
                 className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3.5 rounded-xl transition-colors shadow-sm text-base"
               >
                  Salvar Alterações
               </button>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
