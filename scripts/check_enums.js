const url = 'https://vxjbtekqqvljiwhpzeba.supabase.co/rest/v1';
const key = 'sb_publishable_2FqTRBHzyqmXEoskw8ZsdA_EjK6LIjw';

async function getEnums() {
  const resOpt = await fetch(`${url}/orders`, {
    method: 'OPTIONS',
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  const swagger = await resOpt.json();
  const props = swagger.definitions.orders.properties;
  console.log("STATUS ENUM:", props.status.enum);
  console.log("PAYMENT ENUM:", props.payment_method.enum);
  console.log("DELIVERY ENUM:", props.delivery_type.enum);
  console.log("TOTAL AMOUNT TYPE:", props.total_amount.type, props.total_amount.format);
}

getEnums();
