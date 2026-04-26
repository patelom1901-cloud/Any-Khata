const fs = require('fs');
let c = fs.readFileSync('app/(tabs)/my-khata/[businessId]/index.tsx', 'utf8');

c = c.replace(/import \{ getDayLogsForCustomer, getPaymentsForCustomer \} from '\.\.\/\.\.\/\.\.\/\.\.\/lib\/database';/g, "import { getDayLogsForCustomer, getCustomer } from '../../../../lib/database';");
c = c.replace(/import type \{ DayLog, Payment \} from '\.\.\/\.\.\/\.\.\/\.\.\/types';/g, "import type { DayLog, Customer } from '../../../../types';");

c = c.replace(/const \[payments, setPayments\] = useState<Payment\[\]>\(\[\]\);/g, "const [customer, setCustomer] = useState<Customer | null>(null);");

c = c.replace(/const \[logs, pmts\] = await Promise\.all\(\[\s+getDayLogsForCustomer\(businessId, customerId\),\s+getPaymentsForCustomer\(businessId, customerId\),\s+\]\);\s+setDayLogs\(logs\);\s+setPayments\(pmts\);/m, `const [logs, cust] = await Promise.all([
          getDayLogsForCustomer(businessId, customerId),
          getCustomer(customerId),
        ]);
        setDayLogs(logs);
        setCustomer(cust);`);

c = c.replace(/const totalPaid = payments\.reduce\(\(sum, p\) => sum \+ p\.amount, 0\);/g, `
  let totalBilled = 0;
  let totalPaid = 0;
  dayLogs.forEach(log => {
    log.entries.forEach(entry => {
      if (entry.type === 'gave') totalBilled += entry.amount;
      if (entry.type === 'got') totalPaid += entry.amount;
    });
  });`);

c = c.replace(/const totalBilled = dayLogs\.reduce\(\(sum, log\) => sum \+ log\.dayTotal, 0\);/g, "");

fs.writeFileSync('app/(tabs)/my-khata/[businessId]/index.tsx', c);
