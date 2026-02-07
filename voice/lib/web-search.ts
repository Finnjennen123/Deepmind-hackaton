
export interface SearchResult {
  title: string;
  url: string;
  snippets: string[];
}

export const searchWeb = async (query: string, count = 5): Promise<SearchResult[]> => {
  const apiKey = process.env.YDC_API_KEY || process.env.YOU_API_KEY;
  if (!apiKey) {
    console.warn('⚠️ YDC_API_KEY or YOU_API_KEY not found in environment. Skipping web search.');
    return [];
  }

  try {
    const response = await fetch(
      `https://ydc-index.io/v1/search?query=${encodeURIComponent(query)}&count=${count}`,
      {
        headers: {
          "X-API-Key": apiKey
        }
      }
    );

    if (!response.ok) {
      console.error(`Status: ${response.status}`);
      const text = await response.text();
      console.error(`Response: ${text}`);
      return [];
    }

    const data = await response.json();

    if (!data.results?.web) return [];

    // Extract just the useful parts: title, url, and snippets
    return data.results.web.map((result: any) => ({
      title: result.title,
      url: result.url,
      snippets: result.snippets
    }));
  } catch (error) {
    console.error('Error in web search:', error);
    return [];
  }
};
