const url = 'https://vxjbtekqqvljiwhpzeba.supabase.co/rest/v1';
const key = 'sb_publishable_2FqTRBHzyqmXEoskw8ZsdA_EjK6LIjw';

async function check(t) {
  const r = await fetch(url + '/' + t + '?limit=1', {
    headers: { 'apikey': key, 'Authorization': 'Bearer ' + key }
  });
  const d = await r.json();
  if (r.ok) {
    console.log(t + ':', d.length > 0 ? Object.keys(d[0]) : 'VAZIA (sem dados)');
  } else {
    console.log(t + ': ERRO -', d.message);
  }
}

async function main() {
  await check('order_items');
  await check('order_item_extras');
  await check('product_extras');
  await check('products');
  await check('product_sizes');
}

main();
