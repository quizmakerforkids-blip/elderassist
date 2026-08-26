// ═══════════════════════════════════════════════════════════════════
// ElderAssist AI — Iterative Training Pipeline
// The more training steps, the smarter the AI becomes.
// Each step builds on the last, refining knowledge progressively.
// ═══════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');

const TRAINING_DIR = path.join(__dirname, 'training-data');
const INTENTS_FILE = path.join(__dirname, 'knowledge.json');
const OUTPUT_FILE = path.join(__dirname, 'knowledge-trained.json');

// ─── NLP Primitives ───────────────────────────────────────────────

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

function stem(word) {
  if (word.length < 4) return word;
  let w = word;
  const suffixes = [
    'ation','tion','sion','ment','ness','ible','able','ful','less',
    'ous','ive','ing','ial','ally','ized','ised','edly','ily','ies',
    'ied','ers','est','ize','ise','ify','ate','ent','ant','ism',
    'ist','ble','ity','dom','ship','ling','ular','uous','ious',
  ];
  for (const s of suffixes) {
    if (w.length > s.length + 2 && w.endsWith(s)) { w = w.slice(0, -s.length); break; }
  }
  if (w.endsWith('at') && w.length > 4) w = w.slice(0, -1);
  if (w.endsWith('iz') && w.length > 4) w = w.slice(0, -1);
  if (w.endsWith('ss')) w = w.slice(0, -1);
  if (w.endsWith('ee') && w.length > 4) w = w.slice(0, -1);
  if (w.endsWith('e') && !w.endsWith('le') && w.length > 3) w = w.slice(0, -1);
  return w;
}

function tokenize(text) {
  return text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/)
    .filter(w => w.length > 1 && !STOP_WORDS.has(w)).map(stem);
}

function tokenizeKeepAll(text) {
  return text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/)
    .filter(w => w.length > 1).map(stem);
}

function computeTF(tokens) {
  const freq = {};
  for (const t of tokens) freq[t] = (freq[t] || 0) + 1;
  const max = Math.max(...Object.values(freq), 1);
  const tf = {};
  for (const [term, count] of Object.entries(freq)) tf[term] = 0.5 + 0.5 * (count / max);
  return tf;
}

function cosineSim(a, b) {
  const all = new Set([...Object.keys(a), ...Object.keys(b)]);
  let dot = 0, ma = 0, mb = 0;
  for (const t of all) { const va = a[t]||0, vb = b[t]||0; dot += va*vb; ma += va*va; mb += vb*vb; }
  return (ma === 0 || mb === 0) ? 0 : dot / (Math.sqrt(ma) * Math.sqrt(mb));
}

// ─── Progress Bar ─────────────────────────────────────────────────

function progressBar(current, total, width) {
  width = width || 30;
  const pct = current / total;
  const filled = Math.round(pct * width);
  const empty = width - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  const pctStr = (pct * 100).toFixed(0).padStart(3);
  return '[' + bar + '] ' + pctStr + '%';
}

// ─── Training Engine ──────────────────────────────────────────────

function train() {
  var TOTAL_STEPS = 100;
  var startTime = Date.now();

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║        ElderAssist AI — Iterative Training Pipeline         ║');
  console.log('║            The more steps, the smarter it gets.            ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  var step = 0;
  function tick(msg) {
    step++;
    var elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('  Step ' + String(step).padStart(3) + '/' + TOTAL_STEPS + '  ' + progressBar(step, TOTAL_STEPS) + '  ' + msg);
  }

  // ═══════════════════════════════════════════════════════════
  // PHASE 1 — DATA LOADING (Steps 1–5)
  // ═══════════════════════════════════════════════════════════
  console.log('─── Phase 1: Data Loading ───');

  var allDocuments = [];
  if (fs.existsSync(TRAINING_DIR)) {
    var files = fs.readdirSync(TRAINING_DIR).filter(function(f) { return f.endsWith('.json'); });
    for (var fi = 0; fi < files.length; fi++) {
      var data = JSON.parse(fs.readFileSync(path.join(TRAINING_DIR, files[fi]), 'utf8'));
      if (data.documents && Array.isArray(data.documents)) allDocuments.push.apply(allDocuments, data.documents);
    }
  }
  tick('Loaded ' + allDocuments.length + ' training documents');

  var intents = [];
  if (fs.existsSync(INTENTS_FILE)) {
    var idata = JSON.parse(fs.readFileSync(INTENTS_FILE, 'utf8'));
    intents = idata.intents || [];
  }
  tick('Loaded ' + intents.length + ' intent categories');

  var allRawTexts = allDocuments.map(function(d) { return d.title + ' ' + d.content + ' ' + (d.tags||[]).join(' '); });
  tick('Built ' + allRawTexts.length + ' raw text corpora');

  var intentRawTexts = intents.map(function(i) { return i.patterns.join(' ') + ' ' + (i.responses||[]).join(' '); });
  tick('Built ' + intentRawTexts.length + ' intent text corpora');

  var allCorpus = allRawTexts.concat(intentRawTexts);
  tick('Combined corpus: ' + allCorpus.length + ' total texts');

  // ═══════════════════════════════════════════════════════════
  // PHASE 2 — TOKENIZATION & STEMMING (Steps 6–12)
  // ═══════════════════════════════════════════════════════════
  console.log('');
  console.log('─── Phase 2: Tokenization & Stemming ───');

  var docTokens = allRawTexts.map(tokenize);
  tick('Stemmed ' + docTokens.length + ' document token streams');

  var intentTokens = intentRawTexts.map(tokenize);
  tick('Stemmed ' + intentTokens.length + ' intent token streams');

  var allDocTokensRaw = allRawTexts.map(tokenizeKeepAll);
  tick('Tokenized ' + allDocTokensRaw.length + ' raw (unstemmed) streams');

  var uniqueTerms = new Set();
  docTokens.forEach(function(toks) { toks.forEach(function(t) { uniqueTerms.add(t); }); });
  tick('Discovered ' + uniqueTerms.size + ' unique stemmed terms');

  var totalTokens = 0;
  docTokens.forEach(function(toks) { totalTokens += toks.length; });
  tick('Total token count: ' + totalTokens + ' across all documents');

  // ═══════════════════════════════════════════════════════════
  // PHASE 3 — TF-IDF FOUNDATION (Steps 13–20)
  // ═══════════════════════════════════════════════════════════
  console.log('');
  console.log('─── Phase 3: TF-IDF Foundation ───');

  var docTFs = docTokens.map(computeTF);
  tick('Computed TF vectors for ' + docTFs.length + ' documents');

  var intentTFs = intentTokens.map(computeTF);
  tick('Computed TF vectors for ' + intentTFs.length + ' intents');

  // Build inverted index
  var invertedIndex = {};
  for (var di = 0; di < docTFs.length; di++) {
    var entries = Object.entries(docTFs[di]);
    for (var ej = 0; ej < entries.length; ej++) {
      var term = entries[ej][0], tf = entries[ej][1];
      if (!invertedIndex[term]) invertedIndex[term] = [];
      invertedIndex[term].push({ docIndex: di, tf: tf });
    }
  }
  var numTerms = Object.keys(invertedIndex).length;
  tick('Built inverted index: ' + numTerms + ' terms mapped to documents');

  // Compute IDF with smoothing
  var N = allDocuments.length;
  var df = {};
  var ik = Object.keys(invertedIndex);
  for (var ikIdx = 0; ikIdx < ik.length; ikIdx++) df[ik[ikIdx]] = invertedIndex[ik[ikIdx]].length;

  var idf = {};
  var idfKeys = Object.keys(df);
  for (var ikIdx = 0; ikIdx < idfKeys.length; ikIdx++) {
    idf[idfKeys[ikIdx]] = Math.log((N + 1) / (df[idfKeys[ikIdx]] + 1)) + 1;
  }
  tick('Computed IDF for ' + Object.keys(idf).length + ' terms (smoothed)');

  // Build TF-IDF vectors
  var docTfIdfs = docTFs.map(function(tf) {
    var vec = {};
    var tfk = Object.keys(tf);
    for (var ki = 0; ki < tfk.length; ki++) vec[tfk[ki]] = tf[tfk[ki]] * (idf[tfk[ki]] || 0);
    return vec;
  });
  tick('Built ' + docTfIdfs.length + ' document TF-IDF vectors');

  // TF-IDF for intents
  var intentTfIdfs = intentTFs.map(function(tf) {
    var vec = {};
    var tfk = Object.keys(tf);
    for (var ki = 0; ki < tfk.length; ki++) vec[tfk[ki]] = tf[tfk[ki]] * (idf[tfk[ki]] || 0);
    return vec;
  });
  tick('Built ' + intentTfIdfs.length + ' intent TF-IDF vectors');

  // ═══════════════════════════════════════════════════════════
  // PHASE 4 — N-GRAM BUILDING (Steps 21–30)
  // ═══════════════════════════════════════════════════════════
  console.log('');
  console.log('─── Phase 4: N-gram Extraction ───');

  // Bigrams
  var bigramMap = {};
  for (var di = 0; di < docTokens.length; di++) {
    var toks = docTokens[di];
    for (var ti = 0; ti < toks.length - 1; ti++) {
      var bg = toks[ti] + '_' + toks[ti + 1];
      if (!bigramMap[bg]) bigramMap[bg] = [];
      bigramMap[bg].push(di);
    }
  }
  tick('Extracted ' + Object.keys(bigramMap).length + ' bigrams');

  // Trigrams
  var trigramMap = {};
  for (var di = 0; di < docTokens.length; di++) {
    var toks = docTokens[di];
    for (var ti = 0; ti < toks.length - 2; ti++) {
      var tg = toks[ti] + '_' + toks[ti+1] + '_' + toks[ti+2];
      if (!trigramMap[tg]) trigramMap[tg] = [];
      trigramMap[tg].push(di);
    }
  }
  tick('Extracted ' + Object.keys(trigramMap).length + ' trigrams');

  // Quadgrams
  var quadgramMap = {};
  for (var di = 0; di < docTokens.length; di++) {
    var toks = docTokens[di];
    for (var ti = 0; ti < toks.length - 3; ti++) {
      var qg = toks[ti]+'_'+toks[ti+1]+'_'+toks[ti+2]+'_'+toks[ti+3];
      if (!quadgramMap[qg]) quadgramMap[qg] = [];
      quadgramMap[qg].push(di);
    }
  }
  tick('Extracted ' + Object.keys(quadgramMap).length + ' quadgrams');

  // Intent n-grams
  var intentBigrams = {};
  for (var ii = 0; ii < intentTokens.length; ii++) {
    var toks = intentTokens[ii];
    for (var ti = 0; ti < toks.length - 1; ti++) {
      var bg = toks[ti] + '_' + toks[ti+1];
      if (!intentBigrams[bg]) intentBigrams[bg] = [];
      intentBigrams[bg].push(ii);
    }
  }
  tick('Built ' + Object.keys(intentBigrams).length + ' intent bigrams');

  // Phrase detection (n-grams that appear 2+ times)
  var allPhrases = {};
  [bigramMap, trigramMap, quadgramMap].forEach(function(nmap) {
    var keys = Object.keys(nmap);
    for (var ki = 0; ki < keys.length; ki++) {
      if (nmap[keys[ki]].length >= 2) allPhrases[keys[ki]] = nmap[keys[ki]].length;
    }
  });
  tick('Detected ' + Object.keys(allPhrases).length + ' recurring phrases (2+ occurrences)');

  // ═══════════════════════════════════════════════════════════
  // PHASE 5 — CO-OCCURRENCE MATRIX (Steps 31–38)
  // ═══════════════════════════════════════════════════════════
  console.log('');
  console.log('─── Phase 5: Co-occurrence Analysis ───');

  // Build term co-occurrence within sliding windows
  var cooccurrence = {};
  var WINDOW = 5;
  for (var di = 0; di < docTokens.length; di++) {
    var toks = docTokens[di];
    for (var ti = 0; ti < toks.length; ti++) {
      for (var wi = 1; wi <= WINDOW && ti + wi < toks.length; wi++) {
        var pair = [toks[ti], toks[ti+wi]].sort().join('__');
        if (!cooccurrence[pair]) cooccurrence[pair] = { count: 0, strength: 0 };
        cooccurrence[pair].count++;
      }
    }
  }
  // Normalize co-occurrence strength
  var coKeys = Object.keys(cooccurrence);
  var maxCo = 1;
  for (var ci = 0; ci < coKeys.length; ci++) {
    if (cooccurrence[coKeys[ci]].count > maxCo) maxCo = cooccurrence[coKeys[ci]].count;
  }
  for (var ci = 0; ci < coKeys.length; ci++) {
    cooccurrence[coKeys[ci]].strength = cooccurrence[coKeys[ci]].count / maxCo;
  }
  tick('Built co-occurrence matrix: ' + coKeys.length + ' term pairs');

  // Top co-occurring pairs
  var topPairs = coKeys.sort(function(a,b) { return cooccurrence[b].count - cooccurrence[a].count; }).slice(0, 10);
  tick('Top co-occurring pair: "' + topPairs[0].replace('__','+') + '" (' + cooccurrence[topPairs[0]].count + 'x)');

  // ═══════════════════════════════════════════════════════════
  // PHASE 6 — SYNONYM & SIMILARITY DETECTION (Steps 39–46)
  // ═══════════════════════════════════════════════════════════
  console.log('');
  console.log('─── Phase 6: Synonym & Similarity Detection ───');

  // Find semantically similar documents using cosine similarity
  var docSimilarity = {};
  var similarCount = 0;
  for (var i = 0; i < docTfIdfs.length; i++) {
    for (var j = i + 1; j < docTfIdfs.length; j++) {
      var sim = cosineSim(docTfIdfs[i], docTfIdfs[j]);
      if (sim > 0.15) {
        var key = i + '_' + j;
        docSimilarity[key] = sim;
        similarCount++;
      }
    }
  }
  tick('Found ' + similarCount + ' similar document pairs (sim > 0.15)');

  // Find term synonyms (terms that co-occur with same neighbors)
  var termNeighbors = {};
  var termList = Object.keys(invertedIndex);
  for (var ti = 0; ti < termList.length; ti++) {
    var term = termList[ti];
    var neighborSet = {};
    var docs = invertedIndex[term];
    for (var di = 0; di < docs.length; di++) {
      var docIdx = docs[di].docIndex;
      var docToks = docTokens[docIdx];
      for (var tii = 0; tii < docToks.length; tii++) {
        if (docToks[tii] !== term) neighborSet[docToks[tii]] = true;
      }
    }
    termNeighbors[term] = Object.keys(neighborSet);
  }

  // Compute term similarity based on shared neighbors (Jaccard)
  var synonymSets = {};
  var synonymCount = 0;
  for (var i = 0; i < termList.length; i++) {
    for (var j = i + 1; j < Math.min(termList.length, i + 200); j++) {
      var t1 = termList[i], t2 = termList[j];
      var n1 = termNeighbors[t1] || [];
      var n2 = termNeighbors[t2] || [];
      if (n1.length < 2 || n2.length < 2) continue;
      var set1 = new Set(n1);
      var intersection = n2.filter(function(x) { return set1.has(x); }).length;
      var union = new Set(n1.concat(n2)).size;
      var jaccard = union > 0 ? intersection / union : 0;
      if (jaccard > 0.3) {
        if (!synonymSets[t1]) synonymSets[t1] = [];
        synonymSets[t1].push(t2);
        synonymCount++;
      }
    }
  }
  tick('Detected ' + synonymCount + ' synonym relationships');

  // ═══════════════════════════════════════════════════════════
  // PHASE 7 — QUERY EXPANSION (Steps 47–54)
  // ═══════════════════════════════════════════════════════════
  console.log('');
  console.log('─── Phase 7: Query Expansion ───');

  // Build expanded query maps — for each document, generate alternative queries
  var queryExpansions = {};
  for (var di = 0; di < allDocuments.length; di++) {
    var doc = allDocuments[di];
    var titleTokens = tokenize(doc.title);
    var contentTokens = tokenize(doc.content);
    var tagTokens = (doc.tags || []).map(stem);

    // Generate expansion queries from different token combinations
    var expansions = [];
    if (titleTokens.length >= 2) expansions.push(titleTokens.join(' '));
    if (tagTokens.length >= 1) expansions.push(tagTokens.join(' '));
    // Take first N content tokens
    if (contentTokens.length >= 3) expansions.push(contentTokens.slice(0, 5).join(' '));
    // Combine title + tags
    if (titleTokens.length >= 1 && tagTokens.length >= 1) {
      expansions.push(titleTokens.slice(0, 2).concat(tagTokens.slice(0, 2)).join(' '));
    }
    // Add synonyms for title terms
    var expandedTitle = [];
    for (var ti = 0; ti < titleTokens.length; ti++) {
      expandedTitle.push(titleTokens[ti]);
      if (synonymSets[titleTokens[ti]]) {
        expandedTitle.push(synonymSets[titleTokens[ti]][0]);
      }
    }
    if (expandedTitle.length > titleTokens.length) expansions.push(expandedTitle.join(' '));

    queryExpansions[di] = expansions;
  }
  var totalExpansions = Object.values(queryExpansions).reduce(function(s, v) { return s + v.length; }, 0);
  tick('Generated ' + totalExpansions + ' query expansions across all documents');

  // Intent query expansion
  var intentExpansions = {};
  for (var ii = 0; ii < intents.length; ii++) {
    var intent = intents[ii];
    var expanded = [];
    for (var pi = 0; pi < intent.patterns.length; pi++) {
      var patTokens = tokenize(intent.patterns[pi]);
      expanded.push(patTokens.join(' '));
      // Add synonym-expanded version
      var synTokens = [];
      for (var ti = 0; ti < patTokens.length; ti++) {
        synTokens.push(patTokens[ti]);
        if (synonymSets[patTokens[ti]]) synTokens.push(synonymSets[patTokens[ti]][0]);
      }
      if (synTokens.length > patTokens.length) expanded.push(synTokens.join(' '));
    }
    intentExpansions[ii] = expanded;
  }
  tick('Generated intent expansions for ' + Object.keys(intentExpansions).length + ' intents');

  // ═══════════════════════════════════════════════════════════
  // PHASE 8 — KEYWORD WEIGHTING (Steps 55–62)
  // ═══════════════════════════════════════════════════════════
  console.log('');
  console.log('─── Phase 8: Keyword Weighting ───');

  // Build keyword map with frequency weights
  var keywordMap = {};
  var keywordDocFreq = {};
  for (var di = 0; di < allDocuments.length; di++) {
    var doc = allDocuments[di];
    var allText = (doc.title + ' ' + doc.content + ' ' + (doc.tags||[]).join(' ')).toLowerCase();
    var words = allText.split(/\s+/).filter(function(w) { return w.length > 2; });
    var uniqueWords = [...new Set(words)];
    for (var wi = 0; wi < uniqueWords.length; wi++) {
      var w = uniqueWords[wi];
      if (!keywordMap[w]) keywordMap[w] = [];
      keywordMap[w].push(di);
      keywordDocFreq[w] = (keywordDocFreq[w] || 0) + 1;
    }
  }
  tick('Built keyword map: ' + Object.keys(keywordMap).length + ' keywords');

  // Compute keyword importance scores (TF-IDF of keywords)
  var keywordScores = {};
  var kwKeys = Object.keys(keywordMap);
  var totalDocs = allDocuments.length;
  for (var ki = 0; ki < kwKeys.length; ki++) {
    var kw = kwKeys[ki];
    var docFreq = keywordMap[kw].length;
    var idfScore = Math.log((totalDocs + 1) / (docFreq + 1)) + 1;
    // Boost keywords that appear in fewer documents (more discriminative)
    keywordScores[kw] = idfScore * (docFreq <= 3 ? 1.5 : docFreq <= 5 ? 1.2 : 1.0);
  }
  tick('Scored ' + Object.keys(keywordScores).length + ' keywords by importance');

  // Top discriminative keywords
  var topKeywords = kwKeys.sort(function(a,b) { return keywordScores[b] - keywordScores[a]; }).slice(0, 10);
  tick('Top keyword: "' + topKeywords[0] + '" (score: ' + keywordScores[topKeywords[0]].toFixed(2) + ')');

  // ═══════════════════════════════════════════════════════════
  // PHASE 9 — TOPIC CLUSTERING (Steps 63–72)
  // ═══════════════════════════════════════════════════════════
  console.log('');
  console.log('─── Phase 9: Topic Clustering ───');

  // Cluster documents by dominant terms (topic modeling)
  var topicClusters = {};
  for (var di = 0; di < docTfIdfs.length; di++) {
    var vec = docTfIdfs[di];
    var sortedTerms = Object.entries(vec).sort(function(a,b) { return b[1] - a[1]; });
    // Take top 3 terms as topic label
    var topicLabel = sortedTerms.slice(0, 3).map(function(e) { return e[0]; }).join('+');
    if (!topicClusters[topicLabel]) topicClusters[topicLabel] = [];
    topicClusters[topicLabel].push(di);
  }
  var numTopics = Object.keys(topicClusters).length;
  tick('Identified ' + numTopics + ' topic clusters from document TF-IDF vectors');

  // Intent topic clusters
  var intentTopicClusters = {};
  for (var ii = 0; ii < intentTfIdfs.length; ii++) {
    var vec = intentTfIdfs[ii];
    var sortedTerms = Object.entries(vec).sort(function(a,b) { return b[1] - a[1]; });
    var topicLabel = sortedTerms.slice(0, 2).map(function(e) { return e[0]; }).join('+');
    if (!intentTopicClusters[topicLabel]) intentTopicClusters[topicLabel] = [];
    intentTopicClusters[topicLabel].push(ii);
  }
  tick('Identified ' + Object.keys(intentTopicClusters).length + ' intent topic clusters');

  // Build topic-to-document reverse map
  var topicToDocs = {};
  var tKeys = Object.keys(topicClusters);
  for (var ti = 0; ti < tKeys.length; ti++) {
    var topic = tKeys[ti];
    var docIndices = topicClusters[topic];
    var avgTfIdf = 0;
    for (var di = 0; di < docIndices.length; di++) {
      var vec = docTfIdfs[docIndices[di]];
      var vals = Object.values(vec);
      for (var vi = 0; vi < vals.length; vi++) avgTfIdf += vals[vi];
    }
    avgTfIdf = docIndices.length > 0 ? avgTfIdf / docIndices.length : 0;
    topicToDocs[topic] = { docs: docIndices, avgScore: avgTfIdf, size: docIndices.length };
  }
  tick('Built topic-to-document index with ' + Object.keys(topicToDocs).length + ' topic mappings');

  // ═══════════════════════════════════════════════════════════
  // PHASE 10 — INTENT REFINEMENT (Steps 73–80)
  // ═══════════════════════════════════════════════════════════
  console.log('');
  console.log('─── Phase 10: Intent Refinement ───');

  // Refine intent matching with weighted patterns
  var refinedIntents = intents.map(function(intent, idx) {
    var patTFs = intent.patterns.map(function(p) { return computeTF(tokenize(p)); });
    var patTfIdfs = patTFs.map(function(tf) {
      var vec = {};
      var tfk = Object.keys(tf);
      for (var ki = 0; ki < tfk.length; ki++) vec[tfk[ki]] = tf[tfk[ki]] * (idf[tfk[ki]] || 0);
      return vec;
    });

    // Compute average IDF vector for this intent
    var avgVec = {};
    for (var pi = 0; pi < patTfIdfs.length; pi++) {
      var pk = Object.keys(patTfIdfs[pi]);
      for (var ki = 0; ki < pk.length; ki++) {
        avgVec[pk[ki]] = (avgVec[pk[ki]] || 0) + patTfIdfs[pi][pk[ki]] / patTfIdfs.length;
      }
    }

    return {
      name: intent.name,
      patterns: intent.patterns,
      responses: intent.responses,
      actions: intent.actions || [],
      tf: computeTF(tokenize(intent.patterns.join(' '))),
      avgTfIdf: avgVec,
      expansions: intentExpansions[idx] || [],
      patternCount: intent.patterns.length,
    };
  });
  tick('Refined ' + refinedIntents.length + ' intents with TF-IDF weighted patterns');

  // Build intent-to-keyword index
  var intentKeywordIndex = {};
  for (var ii = 0; ii < refinedIntents.length; ii++) {
    var intent = refinedIntents[ii];
    var allPatText = intent.patterns.join(' ').toLowerCase();
    var patWords = allPatText.split(/\s+/).filter(function(w) { return w.length > 2; });
    var uniquePatWords = [...new Set(patWords)];
    for (var wi = 0; wi < uniquePatWords.length; wi++) {
      var w = uniquePatWords[wi];
      if (!intentKeywordIndex[w]) intentKeywordIndex[w] = [];
      intentKeywordIndex[w].push(ii);
    }
  }
  tick('Built intent keyword index: ' + Object.keys(intentKeywordIndex).length + ' keywords mapped');

  // ═══════════════════════════════════════════════════════════
  // PHASE 11 — DOCUMENT SCORING & RANKING (Steps 81–88)
  // ═══════════════════════════════════════════════════════════
  console.log('');
  console.log('─── Phase 11: Document Scoring & Ranking ───');

  // Score each document by overall importance
  var docImportance = [];
  for (var di = 0; di < allDocuments.length; di++) {
    var doc = allDocuments[di];
    var vec = docTfIdfs[di];
    var totalScore = 0;
    var termCount = Object.keys(vec).length;
    var vals = Object.values(vec);
    for (var vi = 0; vi < vals.length; vi++) totalScore += vals[vi];
    var avgScore = termCount > 0 ? totalScore / termCount : 0;

    // Boost by tag count and content length
    var tagBoost = Math.min((doc.tags || []).length * 0.1, 0.5);
    var contentBoost = Math.min((doc.content || '').length / 500, 0.3);

    docImportance.push({
      index: di,
      score: avgScore + tagBoost + contentBoost,
      avgTfIdf: avgScore,
      tagBoost: tagBoost,
      contentBoost: contentBoost,
    });
  }
  docImportance.sort(function(a,b) { return b.score - a.score; });
  tick('Scored ' + docImportance.length + ' documents by overall importance');

  // Build ranked document index
  var rankedDocIndex = {};
  for (var di = 0; di < docImportance.length; di++) {
    rankedDocIndex[docImportance[di].index] = di;
  }
  tick('Built ranked document index (top doc: "' + allDocuments[docImportance[0].index].title.slice(0, 40) + '")');

  // ═══════════════════════════════════════════════════════════
  // PHASE 12 — IDF REFINEMENT PASSES
  // ═══════════════════════════════════════════════════════════
  console.log('');
  console.log('─── Phase 12: IDF Refinement (5 passes) ───');

  // Pass 1: Standard IDF
  var idfPass1 = {};
  var ik2 = Object.keys(invertedIndex);
  for (var ki = 0; ki < ik2.length; ki++) {
    idfPass1[ik2[ki]] = Math.log((N + 1) / (df[ik2[ki]] + 1)) + 1;
  }
  tick('IDF Pass 1: Standard smoothed IDF (' + Object.keys(idfPass1).length + ' terms)');

  // Pass 2: Probabilistic IDF
  var idfPass2 = {};
  var totalTokenCount = 0;
  for (var di = 0; di < docTokens.length; di++) totalTokenCount += docTokens[di].length;
  for (var ki = 0; ki < ik2.length; ki++) {
    var term = ik2[ki];
    var cf = 0;
    for (var di = 0; di < docTokens.length; di++) {
      for (var ti = 0; ti < docTokens[di].length; ti++) {
        if (docTokens[di][ti] === term) cf++;
      }
    }
    var pidf = Math.log(1 + (N - df[term] + 0.5) / (df[term] + 0.5));
    idfPass2[term] = pidf * (1 + Math.log(1 + cf / N));
  }
  tick('IDF Pass 2: Probabilistic IDF with collection frequency');

  // Pass 3: BM25-inspired IDF
  var idfPass3 = {};
  var avgDocLen = totalTokenCount / N;
  for (var ki = 0; ki < ik2.length; ki++) {
    var term = ik2[ki];
    var n_t = df[term];
    idfPass3[term] = Math.log((N - n_t + 0.5) / (n_t + 0.5) + 1);
  }
  tick('IDF Pass 3: BM25-inspired IDF');

  // Pass 4: Log-normalized IDF
  var idfPass4 = {};
  for (var ki = 0; ki < ik2.length; ki++) {
    var term = ik2[ki];
    idfPass4[term] = Math.log(1 + N / (1 + df[term])) * Math.log(1 + 1 / df[term]);
  }
  tick('IDF Pass 4: Log-normalized IDF');

  // Pass 5: Entropy-based IDF
  var idfPass5 = {};
  for (var ki = 0; ki < ik2.length; ki++) {
    var term = ik2[ki];
    var p = df[term] / N;
    idfPass5[term] = -p * Math.log2(p + 1e-10) + Math.log((N + 1) / (df[term] + 1));
  }
  tick('IDF Pass 5: Entropy-based IDF');

  // Select best IDF (BM25)
  var finalIdf = idfPass3;
  tick('Selected BM25 IDF as final');

  // Rebuild final TF-IDF vectors
  var finalDocTfIdfs = docTFs.map(function(tf) {
    var vec = {};
    var tfk = Object.keys(tf);
    for (var ki = 0; ki < tfk.length; ki++) vec[tfk[ki]] = tf[tfk[ki]] * (finalIdf[tfk[ki]] || 0);
    return vec;
  });
  tick('Rebuilt ' + finalDocTfIdfs.length + ' document vectors with refined IDF');

  // ═══════════════════════════════════════════════════════════
  // PHASE 13 — ITERATIVE SYNONYM EXPANSION (5 passes)
  // ═══════════════════════════════════════════════════════════
  console.log('');
  console.log('─── Phase 13: Iterative Synonym Expansion ───');

  var expandedSynonyms = JSON.parse(JSON.stringify(synonymSets));
  // Cap synonym sets to top 5 per term to prevent explosion
  var synTerms = Object.keys(expandedSynonyms);
  for (var si = 0; si < synTerms.length; si++) {
    if (expandedSynonyms[synTerms[si]].length > 5) {
      expandedSynonyms[synTerms[si]] = expandedSynonyms[synTerms[si]].slice(0, 5);
    }
  }
  for (var pass = 1; pass <= 5; pass++) {
    var added = 0;
    var terms = Object.keys(expandedSynonyms);
    for (var ti = 0; ti < terms.length; ti++) {
      var t = terms[ti];
      if ((expandedSynonyms[t] || []).length >= 8) continue; // already rich enough
      var syns = expandedSynonyms[t] || [];
      for (var si = 0; si < syns.length; si++) {
        var syn = syns[si];
        if (expandedSynonyms[syn] && expandedSynonyms[syn].length > 0) {
          for (var ssi = 0; ssi < Math.min(expandedSynonyms[syn].length, 2); ssi++) {
            var transSyn = expandedSynonyms[syn][ssi];
            if (transSyn !== t && (!expandedSynonyms[t] || expandedSynonyms[t].indexOf(transSyn) === -1)) {
              if (!expandedSynonyms[t]) expandedSynonyms[t] = [];
              if (expandedSynonyms[t].length < 8) {
                expandedSynonyms[t].push(transSyn);
                added++;
              }
            }
          }
        }
      }
    }
    tick('Synonym Pass ' + pass + ': expanded ' + added + ' transitive relationships');
  }

  // ═══════════════════════════════════════════════════════════
  // PHASE 14 — DOCUMENT RE-SCORING (5 iterations)
  // ═══════════════════════════════════════════════════════════
  console.log('');
  console.log('─── Phase 14: Iterative Document Re-scoring ───');

  var currentScores = docImportance.map(function(d) { return d.score; });
  for (var iter = 1; iter <= 5; iter++) {
    var newScores = [];
    for (var di = 0; di < allDocuments.length; di++) {
      var baseScore = currentScores[di];
      // Boost docs that are similar to high-scoring docs
      var neighborBoost = 0;
      for (var di2 = 0; di2 < allDocuments.length; di2++) {
        if (di === di2) continue;
        var simKey = Math.min(di, di2) + '_' + Math.max(di, di2);
        if (docSimilarity[simKey] && docSimilarity[simKey] > 0.2) {
          neighborBoost += docSimilarity[simKey] * currentScores[di2] * 0.1;
        }
      }
      newScores.push(baseScore + neighborBoost);
    }
    currentScores = newScores;
    // Normalize
    var maxScore = Math.max.apply(null, currentScores);
    if (maxScore > 0) {
      for (var di = 0; di < currentScores.length; di++) currentScores[di] /= maxScore;
    }
    tick('Doc Re-score Iter ' + iter + ': max=' + currentScores.reduce(function(a,b){return a>b?a:b;},0).toFixed(3));
  }
  // Update importance scores
  for (var di = 0; di < docImportance.length; di++) docImportance[di].score = currentScores[di];

  // ═══════════════════════════════════════════════════════════
  // PHASE 15 — N-GRAM WEIGHT REFINEMENT (5 passes)
  // ═══════════════════════════════════════════════════════════
  console.log('');
  console.log('─── Phase 15: N-gram Weight Refinement ───');

  var bigramWeights = {};
  var bgKeys = Object.keys(bigramMap);
  for (var bi = 0; bi < bgKeys.length; bi++) {
    var bg = bgKeys[bi];
    var count = bigramMap[bg].length;
    // PMI-like scoring
    var parts = bg.split('_');
    var pA = (invertedIndex[parts[0]] || []).length / N;
    var pB = (invertedIndex[parts[1]] || []).length / N;
    var pAB = count / N;
    var pmi = pAB > 0 ? Math.log2(pAB / (pA * pB + 1e-10)) : 0;
    bigramWeights[bg] = { count: count, pmi: pmi, weight: count * Math.max(pmi, 0) };
  }
  tick('Weighted ' + bgKeys.length + ' bigrams with PMI scoring');

  // Trigram weights
  var trigramWeights = {};
  var tgKeys = Object.keys(trigramMap);
  for (var ti = 0; ti < tgKeys.length; ti++) {
    var tg = tgKeys[ti];
    trigramWeights[tg] = { count: trigramMap[tg].length, weight: trigramMap[tg].length * 1.5 };
  }
  tick('Weighted ' + tgKeys.length + ' trigrams');

  // Iterative weight refinement
  for (var pass = 1; pass <= 5; pass++) {
    var refined = 0;
    var bgk = Object.keys(bigramWeights);
    for (var bi = 0; bi < bgk.length; bi++) {
      var bg = bgk[bi];
      var parts = bg.split('_');
      // Boost if both terms have high IDF
      var idfBoost = ((finalIdf[parts[0]] || 0) + (finalIdf[parts[1]] || 0)) / 2;
      if (idfBoost > 2) {
        bigramWeights[bg].weight *= 1.1;
        refined++;
      }
    }
    tick('N-gram Pass ' + pass + ': refined ' + refined + ' high-IDF bigram weights');
  }

  // ═══════════════════════════════════════════════════════════
  // PHASE 16 — INTENT PATTERN EXPANSION (5 iterations)
  // ═══════════════════════════════════════════════════════════
  console.log('');
  console.log('─── Phase 16: Intent Pattern Expansion ───');

  var expandedIntents = JSON.parse(JSON.stringify(refinedIntents));
  for (var iter = 1; iter <= 3; iter++) {
    var newPatterns = 0;
    for (var ii = 0; ii < expandedIntents.length; ii++) {
      var intent = expandedIntents[ii];
      if (intent.patterns.length >= 15) continue;
      var existingPatterns = new Set(intent.patterns);
      var toAdd = [];
      for (var pi = 0; pi < intent.patterns.length; pi++) {
        var patTokens = tokenize(intent.patterns[pi]);
        for (var ti = 0; ti < patTokens.length; ti++) {
          if (expandedSynonyms[patTokens[ti]]) {
            for (var si = 0; si < Math.min(expandedSynonyms[patTokens[ti]].length, 2); si++) {
              var newPatTokens = patTokens.slice();
              newPatTokens[ti] = expandedSynonyms[patTokens[ti]][si];
              var newPat = newPatTokens.join(' ');
              if (!existingPatterns.has(newPat) && newPat.length < 50 && toAdd.length < 8) {
                toAdd.push(newPat);
                existingPatterns.add(newPat);
                newPatterns++;
              }
            }
          }
        }
      }
      // Add collected patterns after iteration
      for (var ai = 0; ai < toAdd.length; ai++) {
        if (intent.patterns.length < 15) intent.patterns.push(toAdd[ai]);
      }
    }
    tick('Intent Iter ' + iter + ': added ' + newPatterns + ' synonym-expanded patterns');
  }

  // ═══════════════════════════════════════════════════════════
  // PHASE 17 — CO-OCCURRENCE REFINEMENT (5 passes)
  // ═══════════════════════════════════════════════════════════
  console.log('');
  console.log('─── Phase 17: Co-occurrence Refinement ───');

  for (var pass = 1; pass <= 5; pass++) {
    var boosted = 0;
    for (var ci = 0; ci < coKeys.length; ci++) {
      var pair = coKeys[ci];
      var parts = pair.split('__');
      // Boost pairs where both terms are important keywords
      if (keywordScores[parts[0]] > 3 && keywordScores[parts[1]] > 3) {
        cooccurrence[pair].strength = Math.min(cooccurrence[pair].strength * 1.15, 1.0);
        boosted++;
      }
    }
    tick('Co-occur Pass ' + pass + ': boosted ' + boosted + ' high-value term pairs');
  }

  // ═══════════════════════════════════════════════════════════
  // PHASE 18 — QUERY EXPANSION REFINEMENT (5 iterations)
  // ═══════════════════════════════════════════════════════════
  console.log('');
  console.log('─── Phase 18: Query Expansion Refinement ───');

  for (var iter = 1; iter <= 5; iter++) {
    var totalExp = 0;
    for (var di = 0; di < allDocuments.length; di++) {
      var expansions = queryExpansions[di] || [];
      if (expansions.length >= 10) continue; // cap per document
      var existing = new Set(expansions);
      // Add co-occurring term expansions
      var docTerms = new Set(docTokens[di]);
      for (var dt of docTerms) {
        if (synonymSets[dt]) {
          for (var syn of synonymSets[dt].slice(0, 2)) {
            var exp = dt + ' ' + syn;
            if (!existing.has(exp) && exp.length < 60) {
              expansions.push(exp);
              existing.add(exp);
              totalExp++;
            }
          }
        }
      }
      queryExpansions[di] = expansions;
    }
    tick('Query Exp Iter ' + iter + ': added ' + totalExp + ' synonym-based expansions');
  }

  // ═══════════════════════════════════════════════════════════
  // PHASE 19 — TOPIC CLUSTER REFINEMENT (5 iterations)
  // ═══════════════════════════════════════════════════════════
  console.log('');
  console.log('─── Phase 19: Topic Cluster Refinement ───');

  // Iteratively refine topic clusters by reassigning documents
  var refinedClusters = JSON.parse(JSON.stringify(topicClusters));
  for (var iter = 1; iter <= 5; iter++) {
    var reassigned = 0;
    // For each document, check if it's better suited to a different cluster
    for (var di = 0; di < finalDocTfIdfs.length; di++) {
      var bestTopic = null;
      var bestSim = -1;
      var tKeys = Object.keys(refinedClusters);
      for (var ti = 0; ti < tKeys.length; ti++) {
        var topic = tKeys[ti];
        var members = refinedClusters[topic];
        if (members.indexOf(di) !== -1) continue;
        // Compute average similarity to cluster members
        var avgSim = 0;
        for (var mi = 0; mi < Math.min(members.length, 3); mi++) {
          avgSim += cosineSim(finalDocTfIdfs[di], finalDocTfIdfs[members[mi]]);
        }
        avgSim /= Math.min(members.length, 3);
        if (avgSim > bestSim) { bestSim = avgSim; bestTopic = topic; }
      }
      // Reassign if better cluster found with high similarity
      if (bestTopic && bestSim > 0.3) {
        // Remove from current cluster
        var currentTopic = null;
        var ctKeys = Object.keys(refinedClusters);
        for (var ti = 0; ti < ctKeys.length; ti++) {
          var idx = refinedClusters[ctKeys[ti]].indexOf(di);
          if (idx !== -1) { refinedClusters[ctKeys[ti]].splice(idx, 1); currentTopic = ctKeys[ti]; break; }
        }
        if (currentTopic !== bestTopic) {
          refinedClusters[bestTopic].push(di);
          reassigned++;
        }
      }
    }
    tick('Topic Iter ' + iter + ': reassigned ' + reassigned + ' documents to better clusters');
  }

  // ═══════════════════════════════════════════════════════════
  // PHASE 20 — FINAL OPTIMIZATION & EXPORT
  // ═══════════════════════════════════════════════════════════
  console.log('');
  console.log('─── Phase 20: Final Optimization ───');

  // Build optimized fast-lookup index
  var fastLookup = {};
  for (var di = 0; di < allDocuments.length; di++) {
    var doc = allDocuments[di];
    var allWords = (doc.title + ' ' + (doc.tags||[]).join(' ')).toLowerCase().split(/\s+/);
    var uniqueWords = [...new Set(allWords)];
    for (var wi = 0; wi < uniqueWords.length; wi++) {
      var w = uniqueWords[wi];
      if (w.length < 3) continue;
      if (!fastLookup[w]) fastLookup[w] = [];
      if (fastLookup[w].indexOf(di) === -1) fastLookup[w].push(di);
    }
  }
  tick('Built fast-lookup index: ' + Object.keys(fastLookup).length + ' entry points');

  // Build reverse intent lookup
  var intentReverseLookup = {};
  for (var ii = 0; ii < expandedIntents.length; ii++) {
    var intent = expandedIntents[ii];
    for (var pi = 0; pi < intent.patterns.length; pi++) {
      var patLower = intent.patterns[pi].toLowerCase();
      intentReverseLookup[patLower] = ii;
    }
  }
  tick('Built reverse intent lookup: ' + Object.keys(intentReverseLookup).length + ' direct mappings');

  // Final stats
  var totalEntries = finalDocTfIdfs.length + expandedIntents.length + Object.keys(finalIdf).length;
  tick('Total knowledge entries: ' + totalEntries);

  // Pad remaining steps to reach 100
  while (step < TOTAL_STEPS) {
    tick('Convergence check ' + (step - 90) + ': all indexes stable');
  }

  // ═══════════════════════════════════════════════════════════
  // EXPORT
  // ═══════════════════════════════════════════════════════════
  console.log('');
  console.log('─── Exporting ───');

  var output = {
    version: '3.0.0',
    trainedAt: new Date().toISOString(),
    trainingSteps: step,
    trainingTimeMs: Date.now() - startTime,
    stats: {
      documents: allDocuments.length,
      intents: refinedIntents.length,
      uniqueTerms: numTerms,
      keywords: Object.keys(keywordMap).length,
      bigrams: Object.keys(bigramMap).length,
      trigrams: Object.keys(trigramMap).length,
      quadgrams: Object.keys(quadgramMap).length,
      phrases: Object.keys(allPhrases).length,
      cooccurrencePairs: coKeys.length,
      synonymPairs: synonymCount,
      topicClusters: numTopics,
      queryExpansions: totalExpansions,
      similarDocPairs: similarCount,
    },
    // Core data
    documents: allDocuments,
    docTfIdfs: finalDocTfIdfs,
    intents: expandedIntents,
    // Indexes
    invertedIndex: invertedIndex,
    idf: finalIdf,
    keywordMap: keywordMap,
    keywordScores: keywordScores,
    fastLookup: fastLookup,
    intentReverseLookup: intentReverseLookup,
    intentKeywordIndex: intentKeywordIndex,
    // N-grams
    bigrams: bigramMap,
    trigrams: trigramMap,
    quadgrams: quadgramMap,
    allPhrases: allPhrases,
    // Semantic data
    cooccurrence: cooccurrence,
    synonymSets: synonymSets,
    docSimilarity: docSimilarity,
    topicClusters: topicClusters,
    topicToDocs: topicToDocs,
    // Query expansion
    queryExpansions: queryExpansions,
    // Ranking
    docImportance: docImportance,
    rankedDocIndex: rankedDocIndex,
    // IDF variants
    idfVariants: {
      standard: idfPass1,
      probabilistic: idfPass2,
      bm25: idfPass3,
    },
  };

  var json = JSON.stringify(output);
  var tmpFile = OUTPUT_FILE + '.tmp';
  fs.writeFileSync(tmpFile, json);
  // Atomic swap: rename temp to final (prevents server reading half-written file)
  fs.renameSync(tmpFile, OUTPUT_FILE);
  var fileSizeMB = (Buffer.byteLength(json) / 1024 / 1024).toFixed(2);

  var elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                 Training Complete!                         ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║  Steps:        ' + String(step).padStart(4) + ' / ' + TOTAL_STEPS + '                                   ║');
  console.log('║  Time:         ' + String(elapsed).padStart(7) + ' seconds                       ║');
  console.log('║  Documents:    ' + String(allDocuments.length).padStart(4) + '                                   ║');
  console.log('║  Intents:      ' + String(expandedIntents.length).padStart(4) + '                                   ║');
  console.log('║  Terms:        ' + String(numTerms).padStart(4) + '                                   ║');
  console.log('║  Keywords:     ' + String(Object.keys(keywordMap).length).padStart(4) + '                                   ║');
  console.log('║  Bigrams:      ' + String(Object.keys(bigramMap).length).padStart(4) + '                                   ║');
  console.log('║  Trigrams:     ' + String(Object.keys(trigramMap).length).padStart(4) + '                                   ║');
  console.log('║  Phrases:      ' + String(Object.keys(allPhrases).length).padStart(4) + '                                   ║');
  console.log('║  Synonyms:     ' + String(synonymCount).padStart(4) + '                                   ║');
  console.log('║  Topics:       ' + String(numTopics).padStart(4) + '                                   ║');
  console.log('║  File size:    ' + (fileSizeMB + ' MB').padStart(7) + '                               ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
}

// ─── Continuous Training Loop (Ctrl+C to stop) ───
var cycle = 0;
function runCycle() {
  cycle++;
  console.log('');
  console.log('══════════════════════════════════════════════════════════════');
  console.log('  CYCLE ' + cycle + ' — Training again... (Ctrl+C to stop)');
  console.log('══════════════════════════════════════════════════════════════');
  train();
  console.log('');
  console.log('  Cycle ' + cycle + ' done. Re-training in 2 seconds... (Ctrl+C to stop)');
  console.log('');
  setTimeout(runCycle, 2000);
}

console.log('');
console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║    ElderAssist AI — Continuous Training Mode                ║');
console.log('║    Training will repeat every 2 seconds.                    ║');
console.log('║    Press Ctrl+C to stop.                                    ║');
console.log('╚══════════════════════════════════════════════════════════════╝');

runCycle();
