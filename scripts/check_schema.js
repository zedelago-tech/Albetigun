const url = 'https://vxjbtekqqvljiwhpzeba.supabase.co/rest/v1';
const key = 'sb_publishable_2FqTRBHzyqmXEoskw8ZsdA_EjK6LIjw';

async function checkTable(tableName) {
  try {
    const res = await fetch(`${url}/${tableName}?limit=1`, {
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    const data = await res.json();
    console.log(`--- ${tableName} ---`);
    if (res.ok) {
      if (data.length > 0) {
        console.log(Object.keys(data[0]));
      } else {
        console.log("Table is empty, trying OPTIONS to get schema...");
        const resOpt = await fetch(`${url}/${tableName}`, {
          method: 'OPTIONS',
          headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
        });
        // OPTIONS returns an OpenAPI swagger doc!
        const swagger = await resOpt.json();
        const props = swagger.definitions[tableName]?.properties;
        if (props) {
          console.log(Object.keys(props));
        } else {
          console.log("Could not find properties in OPTIONS");
        }
      }
    } else {
      console.log("Error:", data);
    }
  } catch (err) {
    console.error(err);
  }
}

async function main() {
  await checkTable('pedidos');
  await checkTable('itens_do_pedido');
  await checkTable('itens_extras_do_pedido');
  await checkTable('orders');
}

main();
