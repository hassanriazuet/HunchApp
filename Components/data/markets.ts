import { fetchMarkets as fetchMarketsFromApiClient } from "../../services/api";
import { Market } from "../../types";

/**
 * markets data layer — no mock data is exported here anymore.
 * Screens should call `fetchMarketsFromApi` to get live data. The central
 * client already handles endpoint fallbacks and returns an empty array when
 * unavailable.
 */
export async function fetchMarketsFromApi(limit = 20, offset = 0): Promise<{ cards: Market[]; eventsFetched: number }> {
  try {
    console.log(`[markets] calling central client fetchMarkets limit=${limit} offset=${offset}`);
    const res = await fetchMarketsFromApiClient(limit, offset);
    if (!res || !Array.isArray(res.cards)) {
      console.warn("[markets] central client returned unexpected shape; returning empty");
      return { cards: [], eventsFetched: 0 };
    }
    return res;
  } catch (err) {
    console.warn("[markets] fetchMarketsFromApi client failed; returning empty", err);
    return { cards: [], eventsFetched: 0 };
  }
}

export default { fetchMarketsFromApi };


