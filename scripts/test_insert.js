const url = 'https://vxjbtekqqvljiwhpzeba.supabase.co/rest/v1';
const key = 'sb_publishable_2FqTRBHzyqmXEoskw8ZsdA_EjK6LIjw';
const crypto = require('crypto');

async function testInsert() {
  try {
    const payload = {
      id: crypto.randomUUID(),
      customer_name: 'Teste AI',
      customer_phone: null,
      status: 'NOVO',
      payment_method: 'DINHEIRO',
      delivery_type: 'BALCAO',
      table_number: null,
      total_amount: 15.50
    };

    const res = await fetch(`${url}/orders`, {
      method: 'POST',
      headers: { 
        'apikey': key, 
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Response:", data);
  } catch (err) {
    console.error(err);
  }
}

testInsert();
