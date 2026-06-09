export async function fetchAllPosts() {
  const projectId = import.meta.env.PUBLIC_FIREBASE_PROJECT_ID;
  const apiKey    = import.meta.env.PUBLIC_FIREBASE_API_KEY;
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/blog_posts?key=${apiKey}`;

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

  function slugifyPost(title, id) {
    return (title || '')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      + '-' + id.slice(0, 8);
  }

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn('[fetchBlog] HTTP', res.status);
      return [];
    }
    const raw = await res.json();
    const docs = raw.documents || [];

    return docs
      .map(doc => {
        const id     = doc.name.split('/').pop();
        const fields = parseMap(doc.fields || {});
        return {
          id,
          slug:      slugifyPost(fields.title, id),
          title:     fields.title     || 'Sans titre',
          excerpt:   fields.excerpt   || '',
          content:   fields.content   || '',
          cover:     fields.cover     || '',
          tags:      fields.tags      || [],
          published: fields.published ?? true,
          createdAt: fields.createdAt || doc.createTime,
          updatedAt: fields.updatedAt || doc.updateTime,
        };
      })
      .filter(p => p.published)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch(e) {
    console.warn('[fetchBlog] Erreur:', e.message);
    return [];
  }
}
