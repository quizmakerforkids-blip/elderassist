// NLP Engine — tokenization, stop words, stemming, TF-IDF scoring

const STOP_WORDS = new Set([
  'a','an','the','is','are','was','were','be','been','being',
  'have','has','had','do','does','did','will','would','could',
  'should','may','might','shall','can','need','dare','ought',
  'used','to','of','in','for','on','with','at','by','from',
  'as','into','through','during','before','after','above','below',
  'between','out','off','over','under','again','further','then',
  'once','here','there','when','where','why','how','all','each',
  'every','both','few','more','most','other','some','such','no',
  'nor','not','only','own','same','so','than','too','very',
  'just','because','but','and','or','if','while','about','it',
  'its','i','me','my','we','our','you','your','he','him','his',
  'she','her','they','them','their','this','that','these','those',
  'what','which','who','whom','up','s','t','don','re','ve','ll',
  'm','d','ain','aren','couldn','didn','doesn','hadn','hasn',
  'haven','isn','ma','mightn','mustn','needn','shan','shouldn',
  'wasn','weren','won','wouldn',
]);

// Simple suffix-stripping stemmer (Porter-like)
function stem(word) {
  if (word.length < 4) return word;

  let w = word;

  // Step 1: common suffixes
  const suffixes = [
    'ation', 'tion', 'sion', 'ment', 'ness', 'ible', 'able',
    'ful', 'less', 'ous', 'ive', 'ing', 'ial', 'ally',
    'ized', 'ised', 'edly', 'ily', 'ies', 'ied', 'ers',
    'est', 'ize', 'ise', 'ify', 'ate', 'ent', 'ant',
    'ful', 'ing', 'ism', 'ist', 'ize', 'ble', 'ity',
  ];

  for (const s of suffixes) {
    if (w.length > s.length + 2 && w.endsWith(s)) {
      w = w.slice(0, -s.length);
      break;
    }
  }

  // Step 2: double suffixes
  if (w.endsWith('at') && w.length > 4) w = w.slice(0, -1);
  if (w.endsWith('iz') && w.length > 4) w = w.slice(0, -1);
  if (w.endsWith('ss')) w = w.slice(0, -1);
  if (w.endsWith('ee') && w.length > 4) w = w.slice(0, -1);

  // Step 3: trailing e
  if (w.endsWith('e') && !w.endsWith('le') && w.length > 3) {
    w = w.slice(0, -1);
  }

  return w;
}

export function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOP_WORDS.has(w))
    .map(stem);
}

export function tokenizeWithRaw(text) {
  const raw = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1);

  const stemmed = raw
    .filter(w => !STOP_WORDS.has(w))
    .map(stem);

  return { raw, stemmed };
}

// TF-IDF scoring
export function computeTF(tokens) {
  const freq = {};
  for (const t of tokens) freq[t] = (freq[t] || 0) + 1;
  const max = Math.max(...Object.values(freq), 1);
  const tf = {};
  for (const [term, count] of Object.entries(freq)) {
    tf[term] = 0.5 + 0.5 * (count / max); // augmented TF
  }
  return tf;
}

export function computeIDF(documents) {
  const N = documents.length;
  const df = {};

  for (const doc of documents) {
    const unique = new Set(doc);
    for (const term of unique) {
      df[term] = (df[term] || 0) + 1;
    }
  }

  const idf = {};
  for (const [term, count] of Object.entries(df)) {
    idf[term] = Math.log((N + 1) / (count + 1)) + 1;
  }
  return idf;
}

export function computeTFIDF(tf, idf) {
  const scores = {};
  for (const [term, tfVal] of Object.entries(tf)) {
    scores[term] = tfVal * (idf[term] || 0);
  }
  return scores;
}

// Cosine similarity between two TF-IDF vectors
export function cosineSimilarity(a, b) {
  const allTerms = new Set([...Object.keys(a), ...Object.keys(b)]);
  let dot = 0, magA = 0, magB = 0;
  for (const t of allTerms) {
    const va = a[t] || 0;
    const vb = b[t] || 0;
    dot += va * vb;
    magA += va * va;
    magB += vb * vb;
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

// Rank documents against a query
export function rankDocuments(queryTokens, docTfIdfs, topK = 5) {
  const queryTF = computeTF(queryTokens);
  const allIdf = {};

  // Build combined IDF from all doc TFs
  const allTerms = new Set();
  for (const tf of docTfIdfs) {
    for (const t of Object.keys(tf)) allTerms.add(t);
  }

  // Simple IDF from document frequency
  const N = docTfIdfs.length;
  const df = {};
  for (const tf of docTfIdfs) {
    for (const t of new Set(Object.keys(tf))) {
      df[t] = (df[t] || 0) + 1;
    }
  }
  for (const [t, c] of Object.entries(df)) {
    allIdf[t] = Math.log((N + 1) / (c + 1)) + 1;
  }

  const queryTfIdf = computeTFIDF(queryTF, allIdf);

  const ranked = docTfIdfs.map((docTf, i) => ({
    index: i,
    score: cosineSimilarity(queryTfIdf, computeTFIDF(docTf, allIdf)),
  }));

  ranked.sort((a, b) => b.score - a.score);
  return ranked.slice(0, topK);
}
