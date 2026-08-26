// AI Chat Engine — TF-IDF + n-gram + co-occurrence + web search + app context
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { tokenize, computeTF, computeTFIDF, cosineSimilarity } from './nlp.js';
import { webSearch, getInstantAnswer } from './web-search.js';
import { searchAppContext } from './app-context.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TRAINED_FILE = join(__dirname, 'knowledge-trained.json');
const INTENTS_FILE = join(__dirname, 'knowledge.json');

let kb = null;
let dbRef = null;
let kbLoaded = false;

function loadKnowledge() {
  if (kbLoaded && kb) return true; // already loaded — don't re-read disk
  const file = existsSync(TRAINED_FILE) ? TRAINED_FILE : INTENTS_FILE;
  try {
    kb = JSON.parse(readFileSync(file, 'utf8'));
    kbLoaded = true;
    return true;
  } catch {
    return false;
  }
}

function setDb(db) {
  dbRef = db;
}

// ─── N-gram aware document search ───
function searchDocuments(query, topK = 3) {
  if (!kb || !kb.documents || !kb.docTfIdfs || kb.docTfIdfs.length === 0) return [];

  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const idf = kb.idf;
  if (!idf) return [];

  // Standard TF-IDF search
  const queryTF = computeTF(queryTokens);
  const queryTfIdf = computeTFIDF(queryTF, idf);

  let results = kb.docTfIdfs.map((docTf, i) => ({
    document: kb.documents[i],
    score: cosineSimilarity(queryTfIdf, computeTFIDF(docTf, idf)),
    index: i,
  }));

  // Boost results that share bigrams with query
  if (kb.bigrams && queryTokens.length >= 2) {
    for (let ti = 0; ti < queryTokens.length - 1; ti++) {
      const bg = queryTokens[ti] + '_' + queryTokens[ti + 1];
      if (kb.bigrams[bg]) {
        for (const docIdx of kb.bigrams[bg]) {
          const existing = results.find(r => r.index === docIdx);
          if (existing) existing.score *= 1.3; // 30% boost for bigram match
        }
      }
    }
  }

  // Boost results that share trigrams with query
  if (kb.trigrams && queryTokens.length >= 3) {
    for (let ti = 0; ti < queryTokens.length - 2; ti++) {
      const tg = queryTokens[ti] + '_' + queryTokens[ti+1] + '_' + queryTokens[ti+2];
      if (kb.trigrams[tg]) {
        for (const docIdx of kb.trigrams[tg]) {
          const existing = results.find(r => r.index === docIdx);
          if (existing) existing.score *= 1.5; // 50% boost for trigram match
        }
      }
    }
  }

  // Boost results from query expansion matches
  if (kb.queryExpansions) {
    const expansionQuery = queryTokens.join(' ');
    for (let di = 0; di < results.length; di++) {
      const expansions = kb.queryExpansions[results[di].index];
      if (expansions) {
        for (const exp of expansions) {
          if (exp.includes(expansionQuery) || expansionQuery.includes(exp)) {
            results[di].score *= 1.2;
            break;
          }
        }
      }
    }
  }

  return results
    .filter(r => r.score > 0.05)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

// ─── Intent Matching (raw phrase + TF-IDF) ───
function matchIntent(query) {
  if (!kb || !kb.intents) return null;

  const queryLower = query.toLowerCase().trim();

  // 1. Direct raw phrase match (catches "who are you" etc. where all words are stop words)
  for (const intent of kb.intents) {
    for (const pattern of intent.patterns) {
      const p = pattern.toLowerCase();
      // Exact match or query starts with the pattern
      if (queryLower === p || queryLower.startsWith(p + ' ') || queryLower.endsWith(' ' + p)) {
        return intent;
      }
    }
  }

  // 2. Tokenized TF-IDF matching
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return null;

  let bestIntent = null;
  let bestScore = 0;

  for (const intent of kb.intents) {
    const patternTokens = [];
    for (const pattern of intent.patterns) {
      patternTokens.push(...tokenize(pattern));
    }
    if (patternTokens.length === 0) continue;

    const querySet = new Set(queryTokens);
    const patternSet = new Set(patternTokens);
    const overlap = [...querySet].filter(t => patternSet.has(t)).length;
    let score = overlap / Math.max(querySet.size, 1);

    if (intent.expansions) {
      for (const exp of intent.expansions) {
        const expTokens = new Set(exp.split(' '));
        const expOverlap = queryTokens.filter(t => expTokens.has(t)).length;
        if (expOverlap > overlap) score *= 1.2;
      }
    }

    if (kb.cooccurrence && queryTokens.length >= 2) {
      for (let i = 0; i < queryTokens.length - 1; i++) {
        const pair = [queryTokens[i], queryTokens[i+1]].sort().join('__');
        if (kb.cooccurrence[pair] && kb.cooccurrence[pair].strength > 0.3) {
          const patternHasBoth = patternSet.has(queryTokens[i]) && patternSet.has(queryTokens[i+1]);
          if (patternHasBoth) score *= 1.15;
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent;
    }
  }

  if (queryTokens.length <= 2) {
    return bestScore > 0.6 ? bestIntent : null;
  }
  return bestScore > 0.45 ? bestIntent : null;
}

// ─── Time/date formatting ───
function processTimePlaceholders(text) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  return text.replace(/\{\{CURRENT_TIME\}\}/g, timeStr).replace(/\{\{CURRENT_DATE\}\}/g, dateStr);
}

// ─── Build answer from document search results ───
function buildDocumentAnswer(results, query) {
  if (results.length === 0) return null;

  const top = results[0];
  let answer = top.document.content;

  if (results.length > 1 && results[1].score > 0.15) {
    answer += '\n\nAdditionally: ' + results[1].document.content;
  }

  return {
    text: answer,
    sources: results.map(r => ({
      title: r.document.title,
      score: Math.round(r.score * 100),
      type: r.document.category || 'knowledge',
    })),
  };
}

// ─── Main async chat ───
async function chatAsync(input, role, context, userId) {
  if (!kb) loadKnowledge();

  const trimmed = input.trim();
  if (!trimmed) {
    return { response: "Please type a message so I can help you.", actions: [], intent: 'empty' };
  }

  // 1. Search app context
  let appResults = [];
  if (dbRef && userId) {
    appResults = searchAppContext(trimmed, dbRef, userId, role);
  }
  if (appResults.length > 0 && appResults[0].score > 0.5) {
    const top = appResults[0];
    let response = `I found something in your account:\n\n**${top.title}**\n${top.content}`;
    if (appResults.length > 1) {
      response += '\n\nOther results: ' + appResults.slice(1).map(r => r.title).join(', ');
    }
    return { response, actions: [], intent: 'app_context', sources: appResults.map(r => r.type) };
  }

  // 2. Intent matching
  const intent = matchIntent(trimmed);
  if (intent && intent.responses) {
    const response = intent.responses[Math.floor(Math.random() * intent.responses.length)];
    return {
      response: processTimePlaceholders(response),
      actions: intent.actions || [],
      intent: intent.name,
    };
  }

  // 3. Check if question → web search (only for truly external questions)
  const questionWords = ['what', 'how', 'why', 'when', 'where', 'who', 'which', 'can', 'could', 'tell', 'explain', 'define'];
  const isQuestion = questionWords.some(w => trimmed.toLowerCase().startsWith(w)) || trimmed.includes('?');

  // 4. TF-IDF + n-gram document search
  const docResults = searchDocuments(trimmed, 3);
  const hasGoodDocResult = docResults.length > 0 && docResults[0].score > 0.15;

  // Only web-search if: it's a question AND no good doc match AND query is long enough
  // Short questions (< 4 words) should be handled by intents, not web search
  const wordCount = trimmed.split(/\s+/).length;
  if (isQuestion && !hasGoodDocResult && wordCount >= 4) {
    try {
      const [webResults, instantAnswer] = await Promise.all([
        webSearch(trimmed, 3),
        getInstantAnswer(trimmed),
      ]);
      let response = '';
      if (instantAnswer && instantAnswer.abstract) {
        response = `**${instantAnswer.title}**\n\n${instantAnswer.abstract}`;
        if (instantAnswer.source) response += `\n\nSource: ${instantAnswer.source}`;
      } else if (webResults.length > 0) {
        response = "Here's what I found:\n\n";
        for (const result of webResults.slice(0, 3)) {
          response += `**${result.title}**\n${result.snippet}\n\n`;
        }
      }
      if (response) {
        return {
          response: response.trim(),
          actions: [],
          intent: 'web_search',
          sources: webResults.map(r => ({ title: r.title, url: r.url })),
        };
      }
    } catch (err) {
      console.error('Web search failed:', err.message);
    }
  }

  // 6. Strong document matches
  if (hasGoodDocResult) {
    const docAnswer = buildDocumentAnswer(docResults, trimmed);
    if (docAnswer) {
      return { response: docAnswer.text, actions: [], intent: 'document_search', sources: docAnswer.sources };
    }
  }

  // 7. Partial document matches for questions
  if (isQuestion && docResults.length > 0) {
    const docAnswer = buildDocumentAnswer(docResults, trimmed);
    if (docAnswer) {
      return { response: docAnswer.text, actions: [], intent: 'document_search_partial', sources: docAnswer.sources };
    }
  }

  // 8. Non-question partial matches
  if (docResults.length > 0) {
    const docAnswer = buildDocumentAnswer(docResults, trimmed);
    if (docAnswer) {
      return { response: docAnswer.text, actions: [], intent: 'document_search_partial', sources: docAnswer.sources };
    }
  }

  // 9. Fallback
  const fallbacks = [
    "I'm not sure about that. Try asking about:\n\n- **Emergencies** — how to report and manage them\n- **Appointments** — viewing and scheduling\n- **Reminders** — medications and daily tasks\n- **Health** — elder care tips and safety\n- **HomeHub** — device setup and usage\n- **Settings** — accessibility and preferences\n\nOr I can search the web for your question!",
    "I don't have a trained answer for that yet. You can:\n\n1. Ask me to search the web for it\n2. Try rephrasing your question\n3. Ask about ElderAssist features, health tips, or elder care",
  ];

  return {
    response: fallbacks[Math.floor(Math.random() * fallbacks.length)],
    actions: [],
    intent: 'fallback',
  };
}

// Synchronous wrapper
function chat(input, role, context, userId) {
  if (!kb) loadKnowledge();
  const trimmed = input.trim();
  if (!trimmed) return { response: "Please type a message so I can help you.", actions: [], intent: 'empty' };

  let appResults = [];
  if (dbRef && userId) appResults = searchAppContext(trimmed, dbRef, userId, role);
  if (appResults.length > 0 && appResults[0].score > 0.5) {
    const top = appResults[0];
    return { response: `Found in your account:\n\n**${top.title}**\n${top.content}`, actions: [], intent: 'app_context' };
  }

  const intent = matchIntent(trimmed);
  if (intent && intent.responses) {
    const response = intent.responses[Math.floor(Math.random() * intent.responses.length)];
    return { response: processTimePlaceholders(response), actions: intent.actions || [], intent: intent.name };
  }

  const docResults = searchDocuments(trimmed, 3);
  if (docResults.length > 0 && docResults[0].score > 0.15) {
    const docAnswer = buildDocumentAnswer(docResults, trimmed);
    if (docAnswer) return { response: docAnswer.text, actions: [], intent: 'document_search', sources: docAnswer.sources };
  }

  return { response: "Let me search for that...", actions: [], intent: 'needs_web_search', needsWebSearch: true };
}

function reloadKnowledge() {
  kb = null;
  kbLoaded = false;
  return loadKnowledge();
}

function getStats() {
  if (!kb) loadKnowledge();
  return kb?.stats || { documents: 0, intents: 0, uniqueTerms: 0, keywords: 0 };
}

export { chat, chatAsync, reloadKnowledge, getStats, setDb };
