export const PREDEFINED_CATEGORIES = [
  'Maaş', 'Market', 'Kira', 'Faturalar', 'Ulaşım', 'Sağlık', 'Eğitim', 'Yatırım', 'Abonelikler', 'Diğer'
];

export const CATEGORY_COLORS = [
  'bg-emerald-100 text-emerald-700',
  'bg-orange-100 text-orange-700',
  'bg-rose-100 text-rose-700',
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-red-100 text-red-700',
  'bg-cyan-100 text-cyan-700',
  'bg-indigo-100 text-indigo-700',
  'bg-teal-100 text-teal-700',
  'bg-slate-100 text-slate-700',
  'bg-fuchsia-100 text-fuchsia-700',
  'bg-lime-100 text-lime-700',
  'bg-amber-100 text-amber-700',
  'bg-pink-100 text-pink-700',
];

export const getCategoryColor = (categoryName: string) => {
  if (!categoryName) return CATEGORY_COLORS[9];
  if (categoryName === 'Maaş') return 'bg-emerald-100 text-emerald-700';
  if (categoryName === 'Kira') return 'bg-rose-100 text-rose-700';
  if (categoryName === 'Market') return 'bg-orange-100 text-orange-700';
  if (categoryName === 'Faturalar') return 'bg-cyan-100 text-cyan-700';
  if (categoryName === 'Ulaşım') return 'bg-blue-100 text-blue-700';
  if (categoryName === 'Sağlık') return 'bg-pink-100 text-pink-700';
  if (categoryName === 'Eğitim') return 'bg-purple-100 text-purple-700';
  if (categoryName === 'Yatırım') return 'bg-indigo-100 text-indigo-700';
  if (categoryName === 'Abonelikler') return 'bg-teal-100 text-teal-700';
  if (categoryName === 'Diğer') return 'bg-slate-100 text-slate-700';

  let hash = 0;
  for (let i = 0; i < categoryName.length; i++) {
    hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % CATEGORY_COLORS.length;
  return CATEGORY_COLORS[index];
};
