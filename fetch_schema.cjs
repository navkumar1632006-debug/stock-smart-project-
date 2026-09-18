const url = 'https://dsshzxopmfxzzihhiopi.supabase.co/graphql/v1';
const apikey = 'sb_publishable_nS_gWJnmUoR1XFs-yFUqcw_NSwwgsxd';

fetch(url, {
  method: 'POST',
  headers: {
    'apikey': apikey,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    query: `
      query {
        __schema {
          types {
            name
            kind
            fields {
              name
            }
          }
        }
      }
    `
  })
})
.then(res => res.json())
.then(data => {
  const fs = require('fs');
  fs.writeFileSync('graphql_schema.json', JSON.stringify(data, null, 2));
  console.log('Schema fetched successfully');
})
.catch(err => {
  console.error('Error fetching schema:', err);
});
