const fs = require('fs');

function refactorPage() {
  const file = 'app/page.tsx';
  let content = fs.readFileSync(file, 'utf-8');

  // 1. Imports
  content = content.replace(
    "import Image from 'next/image';",
    "import Image from 'next/image';\nimport { supabase } from '@/lib/supabase';"
  );

  // 2. Initial constants and types
  content = content.replace(
    "const INITIAL_CATEGORIES = ['Sorvetes', 'Lanches', 'Bebidas', 'Sobremesas'];",
    "// INITIAL_CATEGORIES removed"
  );
  content = content.replace(/type Size = {\s*id: string;/g, "type Size = {\n  id: number;");
  content = content.replace(/type Extra = {\s*id: string;/g, "type Extra = {\n  id: number;");

  // 3. Remove INITIAL_PRODUCTS array block
  const productsStart = content.indexOf('const INITIAL_PRODUCTS: Product[] = [');
  const productsEnd = content.indexOf('];', productsStart) + 2;
  if (productsStart !== -1 && productsEnd !== -1) {
      content = content.slice(0, productsStart) + content.slice(productsEnd);
  }

  // 4. States replacement
  const catsStateRegex = /const \[categories, setCategories\] = useState<string\[\]>\(\(\) => \{[\s\S]*?\}\);/;
  content = content.replace(catsStateRegex, "const [categories, setCategories] = useState<string[]>([]);");

  const prodsStateRegex = /const \[products, setProducts\] = useState<Product\[\]>\(\(\) => \{[\s\S]*?\}\);/;
  content = content.replace(prodsStateRegex, "const [products, setProducts] = useState<Product[]>([]);");

  // 5. Replace the three useEffects starting at line 166 (sync defaults)
  const useE1Start = content.indexOf("useEffect(() => {\n    // Initial sync for defaults if not set");
  const useE3End = content.indexOf("}, []);\n\n  useEffect(() => {\n    if (orderSuccessMsg || selectedProduct)");
  
  if (useE1Start !== -1 && useE3End !== -1) {
    const supabaseUseEffects = `
  useEffect(() => {
    async function fetchData() {
      const [{ data: cats }, { data: prods }, { data: sizes }, { data: extras }] = await Promise.all([
        supabase.from('categories').select('*').order('order', { ascending: true }),
        supabase.from('products').select('*, categories(name)'),
        supabase.from('product_sizes').select('*'),
        supabase.from('product_extras').select('*')
      ]);
      
      if (cats) setCategories(cats.map(c => c.name));
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
    }
    fetchData();

    const handleCatsChange = (e) => {
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
              return { ...o, status: dbOrd.status };
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
  `;
    content = content.slice(0, useE1Start) + supabaseUseEffects + content.slice(useE3End);
  }

  // 6. Checkout function
  const checkoutStart = content.indexOf("const handleAppCheckout = () => {");
  const checkoutEnd = content.indexOf("const simulateOrderStatusChange");
  if (checkoutStart !== -1 && checkoutEnd !== -1) {
      const newCheckout = `const handleAppCheckout = async () => {
    if (cartItems.length === 0 || !customerName.trim()) return;
    if (deliveryType === 'MESA' && !tableNumber.trim()) return;

    const array = new Uint32Array(1);
    self.crypto.getRandomValues(array);
    const orderNumber = (1000 + (array[0] % 9000)).toString();
    const orderId = crypto.randomUUID().slice(0, 5).toUpperCase() + '-' + orderNumber;

    const newOrderDB = {
      id: orderId,
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim() || null,
      status: 'PREPARANDO',
      payment_method: paymentMethod,
      delivery_type: deliveryType,
      table_number: deliveryType === 'MESA' ? tableNumber.trim() : null,
      total_amount: cartTotal
    };

    try {
      const { error: orderError } = await supabase.from('orders').insert(newOrderDB);
      if (orderError) throw orderError;

      for (const item of cartItems) {
        const { data: itemData, error: itemError } = await supabase.from('order_items').insert({
          order_id: orderId,
          product_id: item.product.id,
          size_id: item.selectedSize ? item.selectedSize.id : null,
          quantity: item.quantity,
          unit_price: item.selectedSize ? item.selectedSize.price : item.product.price,
          obs: null
        }).select().single();

        if (itemError) throw itemError;

        if (item.selectedExtras.length > 0 && itemData) {
          const extrasToInsert = item.selectedExtras.map(ex => ({
             order_item_id: itemData.id,
             extra_id: ex.id,
             price: ex.price
          }));
          const { error: extError } = await supabase.from('order_item_extras').insert(extrasToInsert);
          if (extError) throw extError;
        }
      }

      const localOrder = {
        id: orderId,
        orderNumber,
        items: [...cartItems],
        total: cartTotal,
        status: 'PREPARANDO',
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
      setOrderSuccessMsg({ orderNumber });
      setCartItems([]);
      setActiveTab('orders');
    } catch (err) {
      console.error(err);
      alert('Erro ao enviar o pedido para a cozinha.');
    }
  };

  `;
      content = content.slice(0, checkoutStart) + newCheckout + content.slice(checkoutEnd);
  }

  // Also remove simulateOrderStatusChange since it's no longer used for local simulation
  const removeBtn = '<button \\n                      onClick={() => simulateOrderStatusChange(order.orderNumber)} \\n                      className={`text-xs px-3 py-1.5 rounded-full font-bold transition-colors ${\\n                        order.status === \\'PREPARANDO\\' ? \\'bg-amber-100 text-amber-600\\' :\\n                        order.status === \\'PRONTO\\' ? \\'bg-green-100 text-green-600\\' :\\n                        \\'bg-neutral-100 text-neutral-500\\'\\n                      }`}\\n                    >\\n                      {order.status}\\n                    </button>';
  
  const addBtn = '<span className={`text-xs px-3 py-1.5 rounded-full font-bold transition-colors ${order.status === \\'PREPARANDO\\' ? \\'bg-amber-100 text-amber-600\\' : order.status === \\'PRONTO\\' ? \\'bg-green-100 text-green-600\\' : \\'bg-neutral-100 text-neutral-500\\'}`}>{order.status}</span>';
  
  // A simple regex approach instead since formatting can be brittle
  content = content.replace(/<button[\s\S]*?onClick=\{\(\) => simulateOrderStatusChange\(order\.orderNumber\)\}[\s\S]*?<\/button>/, addBtn);

  fs.writeFileSync(file, content);
  console.log("app/page.tsx refactored successfully!");
}

refactorPage();
