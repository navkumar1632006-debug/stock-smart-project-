
require('dotenv').config();

const url = process.env.VITE_SUPABASE_URL + '/graphql/v1';
const apikey = process.env.VITE_SUPABASE_ANON_KEY;

async function checkCatalog() {
  const query = `
    query {
      __schema {
        types {
          name
          kind
          fields {
            name
            type {
              name
              kind
              ofType {
                name
                kind
              }
            }
          }
        }
      }
    }
  `;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': apikey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
    });
    const data = await res.json();
    const invoicesType = data.data.__schema.types.find(t => t.name === 'invoices');
    const salesType = data.data.__schema.types.find(t => t.name === 'sales');
    console.log('--- INVOICES COLUMNS ---');
    if (invoicesType && invoicesType.fields) {
      invoicesType.fields.forEach(f => {
        const typeStr = f.type.name || (f.type.ofType && f.type.ofType.name);
        console.log(f.name, typeStr);
      });
    } else {
      console.log('invoices table not found in graphql');
    }

    console.log('\n--- SALES COLUMNS ---');
    if (salesType && salesType.fields) {
      salesType.fields.forEach(f => {
        if (f.name === 'invoice_id' || f.name === 'invoices') {
          const typeStr = f.type.name || (f.type.ofType && f.type.ofType.name);
          console.log(f.name, typeStr);
        }
      });
    }
  } catch (err) {
    console.error(err);
  }
}
checkCatalog();
