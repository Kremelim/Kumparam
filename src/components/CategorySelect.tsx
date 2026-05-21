import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { PREDEFINED_CATEGORIES } from '../lib/categories';

interface CategorySelectProps {
  value: string;
  onChange: (val: string) => void;
  className?: string;
}

export const CategorySelect: React.FC<CategorySelectProps> = ({ value, onChange, className = '' }) => {
  const { customCategories, addCustomCategory } = useFinance();
  const [isAdding, setIsAdding] = useState(false);
  const [newCategory, setNewCategory] = useState('');

  const allCategories = Array.from(new Set([...PREDEFINED_CATEGORIES, ...customCategories]));

  const handleAddNew = () => {
    const trimmed = newCategory.trim();
    if (trimmed && !allCategories.includes(trimmed)) {
      addCustomCategory(trimmed);
      onChange(trimmed);
    } else if (trimmed && allCategories.includes(trimmed)) {
      onChange(trimmed);
    }
    setIsAdding(false);
    setNewCategory('');
  };

  if (isAdding) {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        <div className="flex gap-2">
          <input
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Yeni Kategori"
            className="flex-1 text-xs border border-slate-200 rounded p-2 focus:outline-none focus:border-indigo-500"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleAddNew()}
          />
          <button
            type="button"
            onClick={handleAddNew}
            className="bg-indigo-600 text-white px-3 py-2 rounded text-xs hover:bg-indigo-700 font-medium disabled:opacity-50"
            disabled={!newCategory.trim()}
          >
            Ekle
          </button>
          <button
            type="button"
            onClick={() => setIsAdding(false)}
            className="bg-slate-200 text-slate-700 px-3 py-2 rounded text-xs font-medium"
          >
            İptal
          </button>
        </div>
      </div>
    );
  }

  return (
    <select
      value={value}
      onChange={(e) => {
        if (e.target.value === 'ADD_NEW') {
          setIsAdding(true);
        } else {
          onChange(e.target.value);
        }
      }}
      className={`text-xs border border-slate-200 rounded p-2 focus:outline-none focus:border-indigo-500 bg-white ${className}`}
    >
      <option value="" disabled>Kategori Seçin</option>
      {allCategories.map(cat => (
        <option key={cat} value={cat}>{cat}</option>
      ))}
      <option value="ADD_NEW" className="font-bold">+ Yeni Ekle...</option>
    </select>
  );
};
