// Web Search — DuckDuckGo Lite scraping + instant answers

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

async function webSearch(query, numResults = 5) {
  try {
    // Use DuckDuckGo HTML version
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const resp = await fetch(url, {
      headers: HEADERS,
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    });

    if (!resp.ok) return [];

    const html = await resp.text();
    const results = [];

    // Parse result blocks from DuckDuckGo HTML
    // Each result is in a <div class="result"> with <a class="result__a"> and <a class="result__snippet">
    const resultBlocks = html.split(/class="result(?:\s|")/);

    for (let i = 1; i < resultBlocks.length && results.length < numResults; i++) {
      const block = resultBlocks[i];

      // Extract title and URL from result link
      const linkMatch = block.match(/class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
      if (!linkMatch) continue;

      let rawUrl = linkMatch[1];
      let title = linkMatch[2].replace(/<[^>]+>/g, '').trim();

      // DuckDuckGo wraps URLs in a redirect — extract the actual URL
      const uddgMatch = rawUrl.match(/uddg=([^&]+)/);
      const actualUrl = uddgMatch ? decodeURIComponent(uddgMatch[1]) : rawUrl;

      if (!title || !actualUrl || actualUrl.startsWith('//duckduckgo.com')) continue;

      // Extract snippet
      const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i);
      const snippet = snippetMatch
        ? snippetMatch[1].replace(/<[^>]+>/g, '').trim()
        : '';

      results.push({
        title,
        url: actualUrl,
        snippet,
      });
    }

    return results;
  } catch (err) {
    console.error('Web search error:', err.message);
    return [];
  }
}

async function getInstantAnswer(query) {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': HEADERS['User-Agent'] },
      signal: AbortSignal.timeout(5000),
    });

    if (!resp.ok) return null;

    const data = await resp.json();

    if (data.Abstract) {
      return {
        title: data.Heading || query,
        abstract: data.Abstract,
        source: data.AbstractSource || '',
        url: data.AbstractURL || '',
      };
    }

    if (data.Answer) {
      return {
        title: data.Heading || query,
        abstract: data.Answer,
        source: 'DuckDuckGo',
        url: '',
      };
    }

    // Check related topics for a quick answer
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      const topic = data.RelatedTopics.find(t => t.Text);
      if (topic) {
        return {
          title: query,
          abstract: topic.Text,
          source: topic.FirstURL || 'DuckDuckGo',
          url: topic.FirstURL || '',
        };
      }
    }

    return null;
  } catch (err) {
    console.error('Instant answer error:', err.message);
    return null;
  }
}

export { webSearch, getInstantAnswer };
