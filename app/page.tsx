'use client';

import React, { useState, useEffect } from 'react';
import { ShoppingCart, IceCream, Search, Plus, X, Minus, ClipboardList, Home as HomeIcon, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

const INITIAL_CATEGORIES = ['Sorvetes', 'Lanches', 'Bebidas', 'Sobremesas'];

type Size = {
  id: number;
  name: string;
  price: number;
};

type Extra = {
  id: number;
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

const INITIAL_PRODUCTS: Product[] = [
  { 
    id: 1, 
    name: 'Taça de Morango Especial', 
    description: 'Sorvete artesanal com pedaços de morango e chantilly.', 
    price: 22.90, 
    category: 'Sorvetes', 
    image: 'https://picsum.photos/seed/icecream1/400/300',
    extras: [{ id: 'e1', name: 'Calda Extra', price: 2.50 }, { id: 'e2', name: 'Nutella', price: 4.0 }, { id: 'e3', name: 'Granulado', price: 1.5 }]
  },
  { 
    id: 3, 
    name: 'Hambúrguer Caseiro Duplo', 
    description: 'Pão brioche, 2 carnes 150g, queijo cheddar, alface e bacon.', 
    price: 32.00, 
    category: 'Lanches', 
    image: 'https://picsum.photos/seed/burger1/400/300',
    extras: [{ id: 'e4', name: 'Bacon Extra', price: 4.5 }, { id: 'e5', name: 'Queijo Extra', price: 3.0 }]
  },
  { id: 2, name: 'SorveTudo de Chocolate', description: 'Três bolas de chocolate, calda e granulado.', price: 18.50, category: 'Sorvetes', image: 'https://picsum.photos/seed/icecream2/400/300' },
  { id: 4, name: 'Smashed Burger Simples', description: 'Pão brioche, carne 90g e queijo prato.', price: 19.90, category: 'Lanches', image: 'https://picsum.photos/seed/burger2/400/300' },
  { id: 5, name: 'Milkshake de Ovomaltine', description: 'Milkshake cremoso de 500ml feito na hora.', price: 16.00, category: 'Bebidas', image: 'https://picsum.photos/seed/shake1/400/300' }
];

type CartItem = {
  cartItemId: string;
  product: Product;
  quantity: number;
  selectedExtras: Extra[];
  selectedSize?: Size;
};

type Order = {
  id: string;
  orderNumber: string;
  items: CartItem[];
  total: number;
  status: 'PREPARANDO' | 'PRONTO' | 'ENTREGUE';
  createdAt: string;
  customerName: string;
  customerPhone?: string;
  paymentMethod: 'DINHEIRO' | 'CARTAO' | 'PIX';
  deliveryType: 'BALCAO' | 'MESA';
  tableNumber?: string;
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<'menu' | 'cart' | 'orders'>('menu');
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  
  type CategoryItem = { id?: number | string, name: string };
  const [categories, setCategories] = useState<CategoryItem[]>([{ id: 'todos', name: 'Todos' }]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [orderSuccessMsg, setOrderSuccessMsg] = useState<{orderNumber: string} | null>(null);
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [tempExtras, setTempExtras] = useState<Extra[]>([]);
  const [tempSize, setTempSize] = useState<Size | undefined>(undefined);
  const [tempQuantity, setTempQuantity] = useState(1);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'DINHEIRO' | 'CARTAO' | 'PIX'>('PIX');
  const [deliveryType, setDeliveryType] = useState<'BALCAO' | 'MESA'>('BALCAO');
  const [tableNumber, setTableNumber] = useState('');
  const [storeOpen, setStoreOpen] = useState(true);
  const [storeSettings, setStoreSettings] = useState<StoreSettings>({
    bannerImage: 'https://picsum.photos/seed/icecreamhero/1200/400',
    bannerTitle: 'O Melhor Sorvete da Cidade',
    bannerDescription: 'Sabor artesanal, ingredientes frescos e muito amor na receita.'
  });

  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [isTableFromUrl, setIsTableFromUrl] = useState(false);

  useEffect(() => {
    // Capture mesa from URL
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const mesaParam = urlParams.get('mesa');
      if (mesaParam) {
        setTableNumber(mesaParam);
        setDeliveryType('MESA');
        setIsTableFromUrl(true);
      }
    } catch (e) {}

    // Hydrate states from localStorage on client mount to avoid hydration mismatch
    try {
      const savedCustomer = localStorage.getItem('sorvefood_customer');
      if (savedCustomer) {
        const parsed = JSON.parse(savedCustomer);
        if (parsed.name) setCustomerName(parsed.name);
        if (parsed.phone) setCustomerPhone(parsed.phone);
      }
    } catch (e) {}

    try {
      const savedStatus = localStorage.getItem('sorvefood_store_status');
      if (savedStatus !== null) setStoreOpen(JSON.parse(savedStatus));
    } catch (e) {}

    try {
      const savedSettings = localStorage.getItem('sorvefood_store_settings');
      if (savedSettings) setStoreSettings(JSON.parse(savedSettings));
    } catch (e) {}

    try {
      const savedOrders = localStorage.getItem('sorvefood_orders');
      if (savedOrders) setMyOrders(JSON.parse(savedOrders));
    } catch (e) {}

    async function fetchData() {
      setIsLoadingMenu(true);
      const [{ data: cats }, { data: prods }, { data: sizes }, { data: extras }] = await Promise.all([
        supabase.from('categories').select('*').order('name', { ascending: true }),
        supabase.from('products').select('*, categories(name)'),
        supabase.from('product_sizes').select('*'),
        supabase.from('product_extras').select('*')
      ]);
      
      if (cats) setCategories([{ id: 'todos', name: 'Todos' }, ...cats.map(c => ({ id: c.id, name: c.name }))]);
      if (prods) {
        setProducts(prods.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description || '',
          price: Number(p.base_price) || 0,
          category: p.categories?.name || 'Sem categoria',
          image: p.image_url || 'https://picsum.photos/seed/icecream1/400/300',
          isAvailable: p.is_available,
          isHidden: p.is_hidden,
          sizes: sizes?.filter(s => s.product_id === p.id).map(s => ({ id: s.id, name: s.name, price: Number(s.price) })) || [],
          extras: extras?.filter(e => e.product_id === p.id).map(e => ({ id: e.id, name: e.name, price: Number(e.price) })) || [],
        })));
      }
      setIsLoadingMenu(false);
    }
    fetchData();

    const handleCatsChange = (e: StorageEvent) => {
      if (e.key === 'sorvefood_store_settings') {
        const updated = localStorage.getItem('sorvefood_store_settings');
        if (updated) setStoreSettings(JSON.parse(updated));
      }
      if (e.key === 'sorvefood_store_status') {
         setStoreOpen(e.newValue ? JSON.parse(e.newValue) : true);
      }
    };
    window.addEventListener('storage', handleCatsChange);

    return () => window.removeEventListener('storage', handleCatsChange);
  }, []);

  useEffect(() => {
    async function syncOrders() {
      if (myOrders.length === 0) return;
      const ids = myOrders.map(o => o.id);
      const { data } = await supabase.from('orders').select('id, status').in('id', ids);
      if (data) {
        setMyOrders(prev => {
          let changed = false;
          const updated = prev.map(o => {
            const dbOrd = data.find(d => d.id === o.id);
            if (dbOrd && dbOrd.status !== o.status) {
              changed = true;
              return { ...o, status: dbOrd.status as 'PREPARANDO' | 'PRONTO' | 'ENTREGUE' };
            }
            return o;
          });
          if (changed) {
            localStorage.setItem('sorvefood_orders', JSON.stringify(updated));
            return updated;
          }
          return prev;
        });
      }
    }
    const interval = setInterval(syncOrders, 3000);
    return () => clearInterval(interval);
  }, [myOrders]);

  useEffect(() => {
    if (orderSuccessMsg || selectedProduct) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [orderSuccessMsg, selectedProduct]);

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotal = cartItems.reduce((acc, item) => {
    const basePrice = item.selectedSize ? item.selectedSize.price : item.product.price;
    return acc + ((basePrice + item.selectedExtras.reduce((sum, ext) => sum + ext.price, 0)) * item.quantity);
  }, 0);

  const filteredProducts = products.filter(product => {
    if (product.isHidden) return false;
    const matchesCategory = activeCategory === 'Todos' || product.category === activeCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const openProductCustomization = (product: Product) => {
    setSelectedProduct(product);
    setTempExtras([]);
    setTempSize(product.sizes && product.sizes.length > 0 ? product.sizes[0] : undefined);
    setTempQuantity(1);
  };

  const toggleTempExtra = (extra: Extra) => {
    setTempExtras(prev => {
      const exists = prev.find(e => e.id === extra.id);
      if (exists) return prev.filter(e => e.id !== extra.id);
      return [...prev, extra];
    });
  };

  const confirmAddToCart = () => {
    if (!selectedProduct) return;
    const extrasIds = tempExtras.map(e => e.id).sort().join(',');
    const sizeId = tempSize ? tempSize.id : 'base';
    const cartItemId = `${selectedProduct.id}-${sizeId}-${extrasIds}`;

    setCartItems(prev => {
      const existing = prev.find(item => item.cartItemId === cartItemId);
      if (existing) {
        return prev.map(item => item.cartItemId === cartItemId ? { ...item, quantity: item.quantity + tempQuantity } : item);
      }
      return [...prev, { cartItemId, product: selectedProduct, selectedExtras: tempExtras, selectedSize: tempSize, quantity: tempQuantity }];
    });
    setSelectedProduct(null);
  };

  const removeFromCart = (cartItemId: string) => {
    setCartItems(prev => prev.filter(item => item.cartItemId !== cartItemId));
  };

  const updateQuantity = (cartItemId: string, delta: number) => {
    setCartItems(prev => prev.map(item => {
      if (item.cartItemId === cartItemId) {
        const newQuantity = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  };

  const handleAppCheckout = async () => {
    if (cartItems.length === 0 || !customerName.trim()) return;
    if (deliveryType === 'MESA' && !tableNumber.trim()) return;

    const array = new Uint32Array(1);
    self.crypto.getRandomValues(array);
    const orderNumber = (1000 + (array[0] % 9000)).toString();
    const paymentMap: Record<string, 'DINHEIRO' | 'CARTAO' | 'PIX'> = {
      'dinheiro': 'DINHEIRO',
      'cartao': 'CARTAO',
      'cartão': 'CARTAO',
      'pix': 'PIX'
    };

    const deliveryMap: Record<string, 'MESA' | 'BALCAO' | 'ENTREGA'> = {
      'mesa': 'MESA',
      'na mesa': 'MESA',
      'balcao': 'BALCAO',
      'no balcão': 'BALCAO',
      'entrega': 'ENTREGA'
    };

    const normalizeEnum = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    const paymentMethodFormated = paymentMap[paymentMethod.toLowerCase()] || normalizeEnum(paymentMethod);
    const deliveryTypeFormated = deliveryMap[deliveryType.toLowerCase()] || normalizeEnum(deliveryType);

    const orderId = crypto.randomUUID();

    const newOrderDB = {
      id: orderId,
      customer_name: customerName.trim(),
      customer_phone: customerPhone ? customerPhone.trim() : null,
      status: 'NOVO',
      payment_method: paymentMethodFormated,
      delivery_type: deliveryTypeFormated,
      table_number: deliveryTypeFormated === 'MESA' ? tableNumber.toString() : null,
      total_amount: parseFloat(cartTotal.toFixed(2))
    };

    try {
      const { data: orderData, error: orderError } = await supabase.from('orders').insert(newOrderDB).select().single();
      if (orderError) {
         console.error("Erro orders:", orderError.message, orderError.details, orderError.hint, orderError.code);
         throw orderError;
      }

      for (const item of cartItems) {
        const { data: itemData, error: itemError } = await supabase.from('order_items').insert({
          order_id: orderId,
          product_id: item.product.id,
          size_id: item.selectedSize ? item.selectedSize.id : null,
          quantity: item.quantity,
          unit_price: parseFloat((item.selectedSize ? item.selectedSize.price : item.product.price).toFixed(2)),
          obs: null
        }).select().single();

        if (itemError) {
          console.error("Erro order_items:", itemError.message, itemError.details, itemError.hint, itemError.code);
          throw itemError;
        }

        if (item.selectedExtras.length > 0 && itemData) {
          const extrasToInsert = item.selectedExtras.map(ex => ({
             order_item_id: itemData.id,
             extra_id: Number(ex.id),
             price: parseFloat((ex.price || 0).toFixed(2))
          }));
          const { error: extError } = await supabase.from('order_item_extras').insert(extrasToInsert);
          if (extError) {
            console.error("Erro order_item_extras:", extError.message, extError.details, extError.hint, extError.code);
            throw extError;
          }
        }
      }

      const localOrder: Order = {
        id: orderId,
        orderNumber: orderId.split('-').pop()?.toUpperCase() || orderNumber,
        items: [...cartItems],
        total: cartTotal,
        status: 'NOVO',
        createdAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        paymentMethod,
        deliveryType,
        tableNumber: deliveryType === 'MESA' ? tableNumber.trim() : undefined,
      };

      localStorage.setItem('sorvefood_customer', JSON.stringify({ name: customerName.trim(), phone: customerPhone.trim() }));
      setMyOrders(prev => {
        const updated = [localOrder, ...prev];
        localStorage.setItem('sorvefood_orders', JSON.stringify(updated));
        return updated;
      });
      setOrderSuccessMsg({ orderNumber: localOrder.orderNumber });
      setCartItems([]);
      setActiveTab('orders');
    } catch (err: any) {
      console.error("Erro geral checkout:", err.message || err);
      alert(`Erro ao enviar o pedido para a cozinha: ${err.message || 'Verifique o console'}`);
    }
  };

  // Limpa o histórico local do cliente sem afetar o banco de dados
  const handleClearHistory = () => {
    setMyOrders([]);
    localStorage.removeItem('sorvefood_orders');
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 pb-28">
      {/* HEADER FIXO */}
      <header className="sticky top-0 z-30 bg-white shadow-sm border-b border-neutral-100">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-center">
          <div className="flex items-center gap-2 text-amber-500 font-bold text-2xl">
            <IceCream size={28} /> Albetigun
          </div>
        </div>
      </header>

      {/* CONTEÚDOS DAS ABAS */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        
        {/* ABA: CARDÁPIO */}
        {activeTab === 'menu' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <section className="relative rounded-3xl p-6 mb-8 text-white overflow-hidden shadow-sm min-h-[160px] flex items-center bg-amber-500">
              {/* Background Image */}
              <div className="absolute inset-0 z-0">
                <Image src={storeSettings.bannerImage} alt="Banner" fill className="object-cover" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-black/50" /> {/* Dark overlay for text readability */}
              </div>
              <div className="relative z-10">
                <h1 className="text-2xl md:text-3xl font-extrabold mb-2">{storeSettings.bannerTitle}</h1>
                <p className="text-white/90 text-sm md:text-base max-w-sm">{storeSettings.bannerDescription}</p>
              </div>
            </section>

            {/* Categorias */}
            <section className="mb-6">
              <div className="flex items-center gap-3 overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {categories.map(category => (
                  <button
                    key={category.id || category.name}
                    onClick={() => setActiveCategory(category.name)}
                    className={`flex-shrink-0 px-5 py-2.5 rounded-full font-medium transition-all text-sm ${
                      activeCategory === category.name 
                        ? 'bg-amber-500 text-white shadow-md' 
                        : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </section>

            {/* Produtos */}
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredProducts.map(product => {
                const available = product.isAvailable !== false;
                return (
                <div key={product.id} className={`bg-white rounded-3xl p-3 shadow-sm transition-shadow border flex gap-4 overflow-hidden items-center relative ${available ? 'hover:shadow-md cursor-pointer' : 'opacity-60 grayscale cursor-not-allowed'}`} onClick={() => available && openProductCustomization(product)}>
                  {!available && (
                     <div className="absolute top-2 left-2 bg-neutral-800 text-white text-[10px] font-black px-2 py-1 rounded-md tracking-wider z-10 shadow-sm">ESGOTADO</div>
                  )}
                  <div className="relative h-24 w-24 shrink-0 bg-neutral-100 rounded-2xl overflow-hidden">
                    <Image src={product.image} alt={product.name} fill className="object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex flex-col flex-1 py-1 pr-2">
                    <h3 className="font-bold text-sm leading-tight mb-1">{product.name}</h3>
                    <p className="text-neutral-500 text-xs mb-2 line-clamp-2">{product.description}</p>
                    <div className="flex justify-between items-center mt-auto">
                      <span className={`font-extrabold text-sm ${available ? 'text-neutral-900' : 'text-neutral-500'}`}>
                         {product.sizes && product.sizes.length > 0 ? `a partir de R$ ${Math.min(...product.sizes.map(s => s.price)).toFixed(2).replace('.', ',')}` : `R$ ${product.price.toFixed(2).replace('.', ',')}`}
                      </span>
                      {available && <div className="bg-amber-50 text-amber-600 p-1.5 rounded-lg"><Plus size={16} /></div>}
                    </div>
                  </div>
                </div>
              )})}
            </section>
          </div>
        )}

        {/* ABA: CARRINHO */}
        {activeTab === 'cart' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><ShoppingCart className="text-amber-500"/> Seu Carrinho</h2>
            
            <div className="space-y-4 mb-8">
               {cartItems.map(item => (
                 <div key={item.cartItemId} className="bg-white p-4 rounded-3xl shadow-sm border flex gap-4 items-center">
                   <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-neutral-100 flex-shrink-0">
                     <Image src={item.product.image} alt={item.product.name} fill className="object-cover" referrerPolicy="no-referrer" />
                   </div>
                   <div className="flex-1">
                     <div className="flex justify-between items-start mb-1">
                       <p className="font-bold text-sm leading-tight pr-2">{item.product.name}</p>
                       <button onClick={() => removeFromCart(item.cartItemId)} className="text-neutral-400 hover:text-amber-500 bg-neutral-50 rounded-full p-1">
                         <X size={14} />
                       </button>
                     </div>
                     {item.selectedSize && <p className="text-xs text-neutral-500 mb-0.5">Tamanho: {item.selectedSize.name}</p>}
                     {item.selectedExtras.length > 0 && <p className="text-xs text-neutral-500 mb-2">Com: {item.selectedExtras.map(e => e.name).join(', ')}</p>}
                     <div className="flex justify-between items-center mt-2">
                       <p className="font-bold text-amber-500 text-base">R$ {(((item.selectedSize ? item.selectedSize.price : item.product.price) + item.selectedExtras.reduce((s,e)=>s+e.price,0))*item.quantity).toFixed(2).replace('.', ',')}</p>
                       <div className="flex items-center gap-3">
                         <button onClick={() => updateQuantity(item.cartItemId, -1)} className="w-7 h-7 flex items-center justify-center rounded-xl bg-neutral-100 text-neutral-600 hover:bg-neutral-200"><Minus size={14}/></button>
                         <span className="font-bold text-sm w-4 text-center">{item.quantity}</span>
                         <button onClick={() => updateQuantity(item.cartItemId, 1)} className="w-7 h-7 flex items-center justify-center rounded-xl bg-neutral-100 text-neutral-600 hover:bg-neutral-200"><Plus size={14}/></button>
                       </div>
                     </div>
                   </div>
                 </div>
               ))}
               {cartItems.length === 0 && (
                 <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-neutral-300">
                   <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-4 text-neutral-300"><ShoppingCart size={24}/></div>
                   <p className="text-neutral-500 font-medium">Seu carrinho está vazio!</p>
                   <button onClick={() => setActiveTab('menu')} className="text-amber-500 font-bold mt-2 text-sm">Adicionar itens</button>
                 </div>
               )}
            </div>

            {cartItems.length > 0 && (
              <div className="bg-white p-6 rounded-3xl shadow-sm border">
                <div className="mb-6 space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 mb-1">Seu Nome *</label>
                    <input 
                      type="text" 
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      placeholder="Como vamos te chamar?"
                      className="w-full border border-neutral-300 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 mb-1">WhatsApp (Opcional)</label>
                    <input 
                      type="tel" 
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      placeholder="(DD) 99999-9999"
                      className="w-full border border-neutral-300 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="mb-6 space-y-4 pt-4 border-t border-neutral-100">
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 mb-2">Como vai receber?</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => setDeliveryType('BALCAO')}
                        className={`py-3 rounded-xl font-bold border-2 transition-colors ${deliveryType === 'BALCAO' ? 'bg-amber-50 text-amber-600 border-amber-500' : 'bg-white text-neutral-500 border-neutral-200 hover:border-amber-300'}`}
                      >
                        No Balcão
                      </button>
                      <button 
                        onClick={() => setDeliveryType('MESA')}
                        className={`py-3 rounded-xl font-bold border-2 transition-colors ${deliveryType === 'MESA' ? 'bg-amber-50 text-amber-600 border-amber-500' : 'bg-white text-neutral-500 border-neutral-200 hover:border-amber-300'}`}
                      >
                        Na Mesa
                      </button>
                    </div>
                  </div>
                  
                  {deliveryType === 'MESA' && (
                    <div className="animate-in slide-in-from-top-2">
                       <label className="block text-sm font-bold text-neutral-700 mb-1">
                         Número da Mesa * {isTableFromUrl && <span className="text-amber-600 font-bold text-xs ml-1 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 animate-pulse">Mesa {tableNumber} via QR Code</span>}
                       </label>
                       <input 
                         type="text" 
                         value={tableNumber}
                         onChange={e => setTableNumber(e.target.value)}
                         disabled={isTableFromUrl}
                         placeholder="Ex: 12"
                         className={`w-full border rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 ${
                           isTableFromUrl 
                             ? 'bg-neutral-100 border-neutral-200 text-neutral-500 cursor-not-allowed font-semibold' 
                             : 'bg-amber-50/50 border-neutral-300'
                         }`}
                       />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-bold text-neutral-700 mb-2">Forma de Pagamento</label>
                    <div className="grid grid-cols-3 gap-3">
                      {(['PIX', 'CARTAO', 'DINHEIRO'] as const).map(pm => (
                        <button 
                          key={pm}
                          onClick={() => setPaymentMethod(pm)}
                          className={`py-3 rounded-xl font-bold border-2 transition-colors text-sm ${paymentMethod === pm ? 'bg-green-50 text-green-700 border-green-500' : 'bg-white text-neutral-500 border-neutral-200 hover:border-green-300'}`}
                        >
                          {pm === 'CARTAO' ? 'Cartão' : pm === 'DINHEIRO' ? 'Dinheiro' : 'PIX'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center mb-6 pt-4 border-t border-neutral-100">
                  <span className="text-neutral-500 font-medium pt-1">Total do pedido</span>
                  <span className="text-2xl font-black text-neutral-900">R$ {cartTotal.toFixed(2).replace('.', ',')}</span>
                </div>
                <button 
                  onClick={handleAppCheckout} 
                  disabled={!customerName.trim() || !storeOpen || (deliveryType === 'MESA' && !tableNumber.trim())}
                  className="w-full bg-amber-500 disabled:bg-neutral-300 disabled:cursor-not-allowed disabled:shadow-none text-white hover:bg-amber-600 font-bold py-4 rounded-2xl transition-colors shadow-lg shadow-amber-500/25"
                >
                  {!storeOpen ? 'Loja Fechada' : 'Confirmar e Pedir'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ABA: HISTÓRICO DE PEDIDOS */}
        {activeTab === 'orders' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
             <div className="flex items-center justify-between mb-6">
               <h2 className="text-2xl font-bold flex items-center gap-2">
                 <ClipboardList className="text-amber-500"/> Seus Pedidos
               </h2>
               {myOrders.length > 0 && (
                 <button
                   onClick={handleClearHistory}
                   title="Limpar histórico"
                   className="flex items-center gap-1.5 text-xs font-bold text-neutral-400 hover:text-red-500 bg-neutral-100 hover:bg-red-50 border border-neutral-200 hover:border-red-200 px-3 py-1.5 rounded-full transition-all duration-200"
                 >
                   <Trash2 size={13} />
                   Limpar Histórico
                 </button>
               )}
             </div>
             <div className="space-y-4">
              {myOrders.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-neutral-300">
                   <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-4 text-neutral-300"><ClipboardList size={24}/></div>
                   <p className="text-neutral-500 font-medium">Você ainda não fez pedidos.</p>
                </div>
              ) : myOrders.map(order => (
                <div key={order.orderNumber} className="bg-white rounded-3xl p-5 shadow-sm border border-neutral-200/60">
                  <div className="flex justify-between items-center mb-4 pb-4 border-b border-neutral-100">
                    <div>
                      <span className="text-xs text-neutral-400 font-medium block">Nº DO PEDIDO</span>
                      <span className="font-black text-lg text-neutral-900">#{order.orderNumber}</span>
                    </div>
                    <span 
                      className={`text-xs px-3 py-1.5 rounded-full font-bold transition-colors ${
                        order.status === 'PREPARANDO' ? 'bg-amber-100 text-amber-600' :
                        order.status === 'PRONTO' ? 'bg-green-100 text-green-600' :
                        'bg-neutral-100 text-neutral-500'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                  
                  <div className="space-y-3 mb-4">
                    {order.items.map(item => (
                      <div key={item.cartItemId} className="flex justify-between text-sm">
                        <div className="flex items-start gap-2">
                          <span className="font-bold text-neutral-500">{item.quantity}x</span>
                          <span className="text-neutral-700 font-medium">
                            {item.product.name} {item.selectedSize && `(${item.selectedSize.name})`}
                            {item.selectedExtras.length > 0 && <span className="block text-xs text-neutral-400 font-normal">Com {item.selectedExtras.map(e => e.name).join(', ')}</span>}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-between items-center pt-4 border-t border-neutral-100">
                    <span className="text-neutral-500 text-sm">Total pago</span>
                    <span className="font-bold text-amber-500 text-lg">R$ {order.total.toFixed(2).replace('.', ',')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* FLOAT BOTTOM NAVIGATION */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-sm">
         <div className="bg-neutral-900 shadow-2xl rounded-full p-2 flex justify-between items-center border border-white/10 backdrop-blur-md">
            
            <button 
              onClick={() => setActiveTab('menu')}
              className={`flex-1 flex flex-col items-center justify-center p-2.5 rounded-full transition-all duration-300 ${activeTab === 'menu' ? 'bg-amber-500 text-white' : 'text-neutral-400 hover:text-white hover:bg-white/5'}`}
            >
               <HomeIcon size={20} className={activeTab === 'menu' ? 'mb-0.5' : ''}/>
               {activeTab === 'menu' && <span className="text-[10px] font-bold">Cardápio</span>}
            </button>
            
            <button 
              onClick={() => setActiveTab('cart')}
              className={`flex-1 flex flex-col items-center justify-center p-2.5 rounded-full transition-all duration-300 relative ${activeTab === 'cart' ? 'bg-amber-500 text-white' : 'text-neutral-400 hover:text-white hover:bg-white/5'}`}
            >
               <div className="relative">
                 <ShoppingCart size={20} className={activeTab === 'cart' ? 'mb-0.5' : ''}/>
                 {cartCount > 0 && activeTab !== 'cart' && (
                   <span className="absolute -top-1.5 -right-2 bg-amber-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-neutral-900">
                     {cartCount}
                   </span>
                 )}
               </div>
               {activeTab === 'cart' && <span className="text-[10px] font-bold">Carrinho</span>}
            </button>
            
            <button 
              onClick={() => setActiveTab('orders')}
              className={`flex-1 flex flex-col items-center justify-center p-2.5 rounded-full transition-all duration-300 relative ${activeTab === 'orders' ? 'bg-amber-500 text-white' : 'text-neutral-400 hover:text-white hover:bg-white/5'}`}
            >
               <div className="relative">
                  <ClipboardList size={20} className={activeTab === 'orders' ? 'mb-0.5' : ''}/>
                  {myOrders.filter(o => o.status !== 'ENTREGUE').length > 0 && activeTab !== 'orders' && (
                    <span className="absolute -top-1 -right-1 bg-amber-500 w-2.5 h-2.5 rounded-full border-2 border-neutral-900"></span>
                  )}
               </div>
               {activeTab === 'orders' && <span className="text-[10px] font-bold">Pedidos</span>}
            </button>
            
         </div>
      </div>

      {/* MODAL ADICIONAIS DE PRODUTO */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm" onClick={() => setSelectedProduct(null)} />
          <div className="relative bg-white w-full sm:max-w-md rounded-t-[2rem] sm:rounded-3xl max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300 overflow-hidden">
            <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 z-10 bg-white/90 p-2.5 rounded-full text-neutral-600 hover:text-black shadow-sm backdrop-blur-sm"><X size={20} strokeWidth={2.5} /></button>
            <div className="overflow-y-auto overflow-x-hidden w-full flex-1">
              <div className="relative h-48 w-full bg-neutral-100 shrink-0 overflow-hidden">
                <Image src={selectedProduct.image} alt={selectedProduct.name} fill className="object-cover" referrerPolicy="no-referrer" />
              </div>
              
              <div className="p-6">
                <h2 className="text-xl font-bold mb-1 leading-tight">{selectedProduct.name}</h2>
                <p className="text-neutral-500 text-sm mb-6">{selectedProduct.description}</p>
              
              {selectedProduct.sizes && selectedProduct.sizes.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-extrabold text-neutral-900 mb-3 text-sm uppercase tracking-wider">Escolha o Tamanho</h3>
                  <div className="space-y-2.5">
                    {selectedProduct.sizes.map(size => {
                      const isSelected = tempSize?.id === size.id;
                      return (
                        <div key={size.id} onClick={() => setTempSize(size)} className={`flex items-center justify-between p-3.5 border-2 rounded-2xl cursor-pointer transition-all ${isSelected ? 'border-amber-500 bg-amber-50/50 shadow-sm' : 'border-neutral-100 hover:border-neutral-200 bg-white'}`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 transition-colors ${isSelected ? 'border-amber-500' : 'border-neutral-300'}`}>
                              {isSelected && <div className="w-2.5 h-2.5 bg-amber-500 rounded-full" />}
                            </div>
                            <span className="font-medium text-neutral-700">{size.name}</span>
                          </div>
                          <span className={`font-bold ${isSelected ? 'text-amber-600' : 'text-neutral-500'}`}>R$ {size.price.toFixed(2).replace('.', ',')}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedProduct.extras && (
                <div className="mb-6">
                  <h3 className="font-extrabold text-neutral-900 mb-3 text-sm uppercase tracking-wider">Turbine seu pedido</h3>
                  <div className="space-y-2.5">
                    {selectedProduct.extras.map(ex => {
                      const isSelected = tempExtras.some(e => e.id === ex.id);
                      return (
                        <div key={ex.id} onClick={() => toggleTempExtra(ex)} className={`flex items-center justify-between p-3.5 border-2 rounded-2xl cursor-pointer transition-all ${isSelected ? 'border-amber-500 bg-amber-50/50 shadow-sm' : 'border-neutral-100 hover:border-neutral-200 bg-white'}`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${isSelected ? 'bg-amber-500 border-amber-500' : 'border-neutral-300'}`}>
                              {isSelected && <X size={12} className="text-white" style={{ transform: 'rotate(45deg)' }} />}
                            </div>
                            <span className="font-medium text-neutral-700">{ex.name}</span>
                          </div>
                          <span className={`font-bold ${isSelected ? 'text-amber-600' : 'text-neutral-500'}`}>+R$ {ex.price.toFixed(2).replace('.', ',')}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center p-4 bg-neutral-50 rounded-2xl border border-neutral-100 mb-2">
                <span className="font-bold text-neutral-700">Quantidade</span>
                <div className="flex items-center gap-4">
                  <button onClick={() => setTempQuantity(q => Math.max(1, q-1))} className="w-10 h-10 flex items-center justify-center border border-neutral-200 shadow-sm rounded-xl bg-white text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"><Minus size={16} strokeWidth={3}/></button>
                  <span className="w-4 text-center font-black text-lg">{tempQuantity}</span>
                  <button onClick={() => setTempQuantity(q => q+1)} className="w-10 h-10 flex items-center justify-center border border-neutral-200 shadow-sm rounded-xl bg-white text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"><Plus size={16} strokeWidth={3}/></button>
                </div>
              </div>
            </div>
            </div>
            
            <div className="p-4 border-t border-neutral-100 shrink-0 bg-white sm:rounded-b-3xl">
              <button 
                onClick={confirmAddToCart} 
                className="w-full bg-amber-500 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl shadow-lg shadow-amber-500/25 transition-colors flex items-center justify-between px-6"
                disabled={!storeOpen}
              >
                <span>{!storeOpen ? 'Fechado' : 'Adicionar'}</span>
                <span>R$ {(((tempSize ? tempSize.price : selectedProduct.price) + tempExtras.reduce((s,e)=>s+e.price,0))*tempQuantity).toFixed(2).replace('.', ',')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS MODAL (GERAÇÃO DE SENHA) */}
      {orderSuccessMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm" onClick={() => setOrderSuccessMsg(null)} />
           <div className="relative bg-white p-8 rounded-[2rem] text-center z-10 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5 text-amber-500 relative">
                 <ClipboardList size={32} />
                 <div className="absolute top-0 right-0 w-6 h-6 bg-green-500 rounded-full border-4 border-white flex items-center justify-center">
                    <span className="text-white text-xs" style={{transform: 'rotate(45deg)'}}>+</span>
                 </div>
              </div>
              <h2 className="text-2xl font-extrabold mb-2 text-neutral-900">Pedido na Cozinha!</h2>
              <p className="mb-6 text-neutral-500">Sua senha de retirada é:</p>
              
              <div className="bg-neutral-50 border-2 border-dashed border-neutral-200 rounded-3xl py-6 mb-8">
                 <h1 className="text-5xl font-black text-amber-500 tracking-wider">#{orderSuccessMsg.orderNumber}</h1>
              </div>
              
              <button 
                onClick={() => setOrderSuccessMsg(null)} 
                className="w-full bg-neutral-900 hover:bg-black text-white py-4 rounded-2xl font-bold transition-colors"
              >
                Acompanhar Pedido
              </button>
           </div>
        </div>
      )}
    </div>
  );
}
