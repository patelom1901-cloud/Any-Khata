const fs = require('fs');
let c = fs.readFileSync('app/customer/[id].tsx', 'utf8');
c = c.replace(/type: 'credit',/g, "type: 'got',");
c = c.replace(/type: 'debit',/g, "type: 'gave',");
c = c.replace(/entry\.type === 'debit'/g, "entry.type === 'gave'");
c = c.replace(/entry\.type === 'credit'/g, "entry.type === 'got'");
fs.writeFileSync('app/customer/[id].tsx', c);
