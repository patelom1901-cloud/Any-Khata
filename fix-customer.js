const fs = require('fs');
let c = fs.readFileSync('app/customer/[id].tsx', 'utf8');

c = c.replace(/const dbType: 'credit' \| 'debit' = entryType === 'payment' \? 'credit' : 'debit';/g, 
  "const dbType: 'got' | 'gave' = entryType === 'payment' ? 'got' : 'gave';");

c = c.replace(/entry\.type === 'debit'/g, "entry.type === 'gave'");
c = c.replace(/entry\.type === 'credit'/g, "entry.type === 'got'");

fs.writeFileSync('app/customer/[id].tsx', c);
