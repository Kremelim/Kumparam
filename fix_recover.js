import fs from 'fs';
let code = fs.readFileSync('src/context/FinanceContext.tsx', 'utf8');

const targetStr = `      const guestKeys = ['fin_transactions', 'fin_bills', 'fin_regular_incomes', 'fin_investments', 'fin_budgets'];

      for (const key of guestKeys) {
        try {
          const parsed = JSON.parse(localStorage.getItem(key) || '[]');
          if (Array.isArray(parsed)) {
            parsed.forEach((item: any) => {
              if (item && typeof item === 'object') {
                const sanitizedId = isValidUUID(item.id) ? item.id : generateUUID();
                if (key === 'fin_transactions') allTxs.push({ ...item, id: sanitizedId });
                else if (key === 'fin_bills') allBills.push({ ...item, id: sanitizedId });
                else if (key === 'fin_regular_incomes') allIncomes.push({ ...item, id: sanitizedId });
                else if (key === 'fin_investments') allInvestments.push({ ...item, id: sanitizedId });
                else if (key === 'fin_budgets') allBudgets.push({ ...item, id: sanitizedId });
              }
            });
          }
        } catch (e) {}
      }`;

const replacementStr = `      const baseKeys = ['fin_transactions', 'fin_bills', 'fin_regular_incomes', 'fin_investments', 'fin_budgets'];
      const keysToScan = [...baseKeys];
      
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

code = code.replace(targetStr, replacementStr);
fs.writeFileSync('src/context/FinanceContext.tsx', code);
console.log("File updated");
