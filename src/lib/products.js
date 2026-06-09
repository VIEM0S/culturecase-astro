// Modèles iPhone — groupe 1 (3 500 FCFA), groupe 2 (5 000 FCFA)
export const MDS_G1 = [
  'iPhone 12', 'iPhone 12 Pro Max',
  'iPhone 13', 'iPhone 13 Pro', 'iPhone 13 Pro Max',
];

export const MDS_G2 = [
  'iPhone 14', 'iPhone 14 Plus', 'iPhone 14 Pro', 'iPhone 14 Pro Max',
  'iPhone 15', 'iPhone 15 Plus', 'iPhone 15 Pro', 'iPhone 15 Pro Max',
  'iPhone 16', 'iPhone 16 Plus', 'iPhone 16 Pro', 'iPhone 16 Pro Max',
  'iPhone 17', 'iPhone 17 Air', 'iPhone 17 Pro', 'iPhone 17 Pro Max',
];

export const ALL_MDS = [...MDS_G1, ...MDS_G2];

export function getPrice(model) {
  return MDS_G1.includes(model) ? 3500 : 5000;
}

export function formatPrice(amount) {
  return amount.toLocaleString('fr-FR') + ' FCFA';
}

export function getModelStock(stockMap, designId, model) {
  const entry = stockMap[designId];
  if (!entry) return -1;
  if (!(model in entry)) return -1;
  return entry[model];
}

export function slugify(name, id) {
  return (name || '')
    .toLowerCase()
    // Normaliser les accents (é→e, è→e, ê→e, à→a, etc.)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Caractères spéciaux maliens et apostrophes
    .replace(/[''ʼ`]/g, '')
    .replace(/[ŋɲɛɔ]/g, c => ({ 'ŋ':'n','ɲ':'n','ɛ':'e','ɔ':'o' }[c] || c))
    // Tout ce qui n'est pas alphanumérique → tiret
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    + '-' + id.toLowerCase();
}
