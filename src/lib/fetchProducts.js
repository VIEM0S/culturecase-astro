// Cache Firebase — une seule lecture partagée entre toutes les pages Astro au build
let _cache = null;

export async function fetchAllProducts() {
  if (_cache) return _cache;

  const projectId = import.meta.env.PUBLIC_FIREBASE_PROJECT_ID;
  const apiKey    = import.meta.env.PUBLIC_FIREBASE_API_KEY;
  const base      = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

  function parseValue(v) {
    if (!v) return null;
    if ('stringValue'    in v) return v.stringValue;
    if ('integerValue'   in v) return Number(v.integerValue);
    if ('doubleValue'    in v) return Number(v.doubleValue);
    if ('booleanValue'   in v) return v.booleanValue;
    if ('nullValue'      in v) return null;
    if ('timestampValue' in v) return v.timestampValue;
    if ('arrayValue'     in v) return (v.arrayValue.values || []).map(parseValue);
    if ('mapValue'       in v) return parseMap(v.mapValue.fields || {});
    return null;
  }

  function parseMap(fields) {
    const obj = {};
    for (const [k, v] of Object.entries(fields)) obj[k] = parseValue(v);
    return obj;
  }

  async function fetchDoc(path) {
    try {
      const res = await fetch(`${base}/${path}?key=${apiKey}`);
      if (!res.ok) { console.warn(`[fetch] ${path} → HTTP ${res.status}`); return null; }
      const raw = await res.json();
      return parseMap(raw.fields || {});
    } catch(e) {
      console.warn(`[fetch] ${path} erreur:`, e.message);
      return null;
    }
  }

  // 1. Document principal
  const main = await fetchDoc('data/main');
  if (!main) {
    _cache = { designs: [], stockMap: {}, models: [] };
    return _cache;
  }

  const settings = main.settings || main;

  // 2. Designs
  const rawDesigns = settings.designs || [];
  const designs = rawDesigns
    .filter(d => d.image && d.image.startsWith('http'))
    .map(d => ({
      id:    d.id,
      name:  (d.name || '').toUpperCase(),
      img:   d.image,
      story: d.description && d.description !== d.name ? d.description : '',
      cat:   (d.category || 'CULTURE').toUpperCase(),
    }));

  console.log(`[Firebase] ${designs.length} designs`);

  // 3. Chunks stock en parallèle
  const chunkCount = main._chunkCount || 5;
  const chunks = await Promise.all(
    Array.from({ length: chunkCount }, (_, i) => fetchDoc(`data/products_${i}`))
  );
  const allProducts = chunks.flatMap(c => c ? (c.products || c.items || []) : []);
  console.log(`[Firebase] ${allProducts.length} entrées stock`);

  // 4. Stock Map
  const normalize = s => (s || '').toUpperCase().trim().replace(/\s+/g, ' ');
  const stockMap  = {};
  for (const p of allProducts) {
    const dsItem = designs.find(d => d.id === p.designId) ||
                   designs.find(d => normalize(d.name) === normalize(p.design));
    if (!dsItem || !p.model) continue;
    if (!stockMap[dsItem.id]) stockMap[dsItem.id] = {};
    stockMap[dsItem.id][p.model] = typeof p.stock === 'number' ? p.stock : 0;
  }

  const models = settings.models || [];
  _cache = { designs, stockMap, models };
  return _cache;
}
