const url = 'https://vxjbtekqqvljiwhpzeba.supabase.co/rest/v1';
const key = 'sb_publishable_2FqTRBHzyqmXEoskw8ZsdA_EjK6LIjw';

async function checkProductsSchema() {
  try {
    const res = await fetch(`${url}/products?limit=1`, {
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    if (res.ok) {
      const data = await res.json();
      console.log("--- products columns ---");
      if (data.length > 0) {
        console.log(Object.keys(data[0]));
        console.log("Sample product row:", data[0]);
      } else {
        console.log("Products table is empty!");
      }
    } else {
      const err = await res.json();
      console.error("Error fetching schema:", err);
    }
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}

checkProductsSchema();
