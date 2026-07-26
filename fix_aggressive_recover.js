import fs from 'fs';
let code = fs.readFileSync('src/context/FinanceContext.tsx', 'utf8');

const targetStr = `      const keysToScan = [...baseKeys];
      
      // Also scan for user-specific local storage keys if a user is logged in
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('_') && baseKeys.some(bk => key.startsWith(bk + '_')))) {
          if (!keysToScan.includes(key)) {
             keysToScan.push(key);
          }
        }
      }

      for (const key of keysToScan) {
        try {
          const parsed = JSON.parse(localStorage.getItem(key) || '[]');
          if (Array.isArray(parsed)) {
            parsed.forEach((item: any) => {
              if (item && typeof item === 'object') {
                const sanitizedId = isValidUUID(item.id) ? item.id : generateUUID();
                if (key.startsWith('fin_transactions')) allTxs.push({ ...item, id: sanitizedId });
                else if (key.startsWith('fin_bills')) allBills.push({ ...item, id: sanitizedId });
                else if (key.startsWith('fin_regular_incomes')) allIncomes.push({ ...item, id: sanitizedId });
                else if (key.startsWith('fin_investments')) allInvestments.push({ ...item, id: sanitizedId });
                else if (key.startsWith('fin_budgets')) allBudgets.push({ ...item, id: sanitizedId });
              }
            });
          }
        } catch (e) {}
      }`;

const replacementStr = `      // VERY AGGRESSIVE DATA RECOVERY - SCAN ALL KEYS
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        
        try {
          const raw = localStorage.getItem(key);
          if (!raw) continue;
          
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            parsed.forEach((item: any) => {
              if (item && typeof item === 'object') {
                const sanitizedId = isValidUUID(item.id) ? item.id : generateUUID();
                
                // Identify what type of item this is based on its properties
                // Transactions usually have: amount, date, category, type
                if (item.date && (item.amount !== undefined || item.value !== undefined) && (item.merchant || item.name || item.title || item.category || item.type)) {
                   // Ensure it's not a projection item which might have similar fields but has 'isOneTime' or 'recurringMonths'
                   if (item.recurringMonths === undefined && item.isOneTime === undefined) {
                       allTxs.push({ ...item, id: sanitizedId });
                   }
                } 
                // Bills usually have: dueDate, amount
                else if (item.dueDate && item.amount !== undefined) {
                   allBills.push({ ...item, id: sanitizedId });
                }
                // Regular incomes usually have: dayOfMonth, amount, source
                else if (item.dayOfMonth !== undefined && item.amount !== undefined) {
                   allIncomes.push({ ...item, id: sanitizedId });
                }
                // Investments usually have: balance/value, currentRate
                else if (item.currentRate !== undefined || item.balance !== undefined || item.totalInvested !== undefined) {
                   allInvestments.push({ ...item, id: sanitizedId });
                }
                // Budgets usually have limit/amount and category, without a date
                else if ((item.limit !== undefined || item.amount !== undefined) && item.category && !item.date) {
                   allBudgets.push({ ...item, id: sanitizedId });
                }
              }
            });
          }
        } catch (e) {}
      }`;

code = code.replace(targetStr, replacementStr);
fs.writeFileSync('src/context/FinanceContext.tsx', code);
console.log("File updated");
