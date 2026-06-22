import { config } from '../config.js';

export interface EntityPresence {
  googleKnowledgeGraph: boolean;
  wikidata: boolean;
  wikipedia: boolean;
  details: Record<string, string | null>;
}

/** Factual entity checks — may feed Readiness authority signals; separate from Visibility Score. */
export async function checkEntityPresence(
  brandName: string,
  domain?: string | null,
  userId?: string,
): Promise<EntityPresence> {
  const details: Record<string, string | null> = {};
  let googleKnowledgeGraph = false;
  let wikidata = false;
  let wikipedia = false;

  if (userId) {
    const { getDecryptedKey } = await import('../vault/keyStore.js');
    const kgKey = await getDecryptedKey(userId, 'google_kg');
    if (kgKey) {
      try {
        const q = encodeURIComponent(brandName);
        const res = await fetch(
          `https://kgsearch.googleapis.com/v1/entities:search?query=${q}&key=${kgKey}&limit=3`,
        );
        if (res.ok) {
          const data = (await res.json()) as { itemListElement?: { result?: { name?: string } }[] };
          const hits = data.itemListElement ?? [];
          googleKnowledgeGraph = hits.some((h) =>
            (h.result?.name ?? '').toLowerCase().includes(brandName.toLowerCase()),
          );
          details.kgTopResult = hits[0]?.result?.name ?? null;
        }
      } catch {
        details.kgError = 'lookup failed';
      }
    } else {
      details.kgError = 'Add Google Knowledge Graph key in Settings';
    }
  } else if (config.googleKgApiKey) {
    try {
      const q = encodeURIComponent(brandName);
      const res = await fetch(
        `https://kgsearch.googleapis.com/v1/entities:search?query=${q}&key=${config.googleKgApiKey}&limit=3`,
      );
      if (res.ok) {
        const data = (await res.json()) as { itemListElement?: { result?: { name?: string } }[] };
        const hits = data.itemListElement ?? [];
        googleKnowledgeGraph = hits.some((h) =>
          (h.result?.name ?? '').toLowerCase().includes(brandName.toLowerCase()),
        );
        details.kgTopResult = hits[0]?.result?.name ?? null;
      }
    } catch {
      details.kgError = 'lookup failed';
    }
  } else {
    details.kgError = 'GOOGLE_KG_API_KEY not configured';
  }

  try {
    const sparql = encodeURIComponent(
      `SELECT ?item WHERE { ?item rdfs:label "${brandName}"@en . } LIMIT 3`,
    );
    const res = await fetch(`https://query.wikidata.org/sparql?query=${sparql}&format=json`, {
      headers: { Accept: 'application/sparql-results+json', 'User-Agent': 'AI-Money-Scorecard/1.0' },
    });
    if (res.ok) {
      const data = (await res.json()) as { results?: { bindings?: unknown[] } };
      wikidata = (data.results?.bindings?.length ?? 0) > 0;
    }
  } catch {
    details.wikidataError = 'lookup failed';
  }

  try {
    const res = await fetch(
      `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(brandName)}&limit=3&format=json`,
    );
    if (res.ok) {
      const data = (await res.json()) as [string, string[]];
      wikipedia = (data[1]?.length ?? 0) > 0;
      details.wikipediaTitles = data[1]?.slice(0, 3).join(', ') ?? null;
    }
  } catch {
    details.wikipediaError = 'lookup failed';
  }

  void domain;
  return { googleKnowledgeGraph, wikidata, wikipedia, details };
}
