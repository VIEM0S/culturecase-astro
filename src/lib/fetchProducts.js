export async function fetchAllProducts() {
  const projectId = import.meta.env.PUBLIC_FIREBASE_PROJECT_ID;
  const apiKey = import.meta.env.PUBLIC_FIREBASE_API_KEY;
  const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

  // Désérialiser le format Firestore REST
  function parseValue(v) {
    if (!v) return null;
    if ("stringValue" in v) return v.stringValue;
    if ("integerValue" in v) return Number(v.integerValue);
    if ("doubleValue" in v) return Number(v.doubleValue);
    if ("booleanValue" in v) return v.booleanValue;
    if ("nullValue" in v) return null;
    if ("arrayValue" in v) return (v.arrayValue.values || []).map(parseValue);
    if ("mapValue" in v) return parseMap(v.mapValue.fields || {});
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
      console.log(`[fetchProducts] ${path} → HTTP ${res.status}`);
      if (!res.ok) {
        const err = await res.text();
        console.warn(`[fetchProducts] Erreur ${path}:`, err.slice(0, 200));
        return null;
      }
      const raw = await res.json();
      return parseMap(raw.fields || {});
    } catch (e) {
      console.warn(`[fetchProducts] fetch échoué pour ${path}:`, e.message);
      return null;
    }
  }

  // 1. Lire le document principal
  const main = await fetchDoc("data/main");
  if (!main) {
    console.warn("[fetchProducts] Impossible de lire data/main");
    return { designs: [], stockMap: {}, models: [] };
  }

  const settings = main.settings || main;

  // 2. Designs depuis settings.designs
  const rawDesigns = settings.designs || [];
  const designs = rawDesigns
    .filter((d) => d.image && d.image.startsWith("http"))
    .map((d) => ({
      id: d.id,
      name: (d.name || "").toUpperCase(),
      img: d.image,
      story: d.description || d.name || "",
      cat: (d.category || "CULTURE").toUpperCase(),
    }));

  console.log(`[fetchProducts] ${designs.length} designs trouvés`);

  // 3. Lire les chunks produits (products_0 ... products_N)
  const chunkCount = main._chunkCount || settings._chunkCount || 5;
  const allProducts = [];

  for (let i = 0; i < chunkCount; i++) {
    const chunk = await fetchDoc(`data/products_${i}`);
    if (!chunk) continue;
    const items = chunk.products || chunk.items || [];
    allProducts.push(...items);
  }

  console.log(`[fetchProducts] ${allProducts.length} entrées stock trouvées`);

  // 4. Construire le Stock Map
  const normalize = (s) => (s || "").toUpperCase().trim().replace(/\s+/g, " ");
  const stockMap = {};
  for (const p of allProducts) {
    const dsItem =
      designs.find((d) => d.id === p.designId) ||
      designs.find((d) => normalize(d.name) === normalize(p.design));
    if (!dsItem || !p.model) continue;
    if (!stockMap[dsItem.id]) stockMap[dsItem.id] = {};
    stockMap[dsItem.id][p.model] = typeof p.stock === "number" ? p.stock : 0;
  }

  // 5. Modèles
  const models = settings.models || [];

  return { designs, stockMap, models };
}
