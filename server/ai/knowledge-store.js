// Knowledge Store — document index with TF-IDF retrieval
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { tokenize, computeTF } from './nlp.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

class KnowledgeStore {
  constructor() {
    this.documents = [];
    this.categories = {};
    this.docTfIdfs = [];
    this.version = '2.0.0';
  }

  // Add a document: { id, category, title, content, metadata }
  addDocument(doc) {
    this.documents.push(doc);
  }

  // Add a batch of documents under a category
  addDocuments(category, docs) {
    this.categories[category] = docs;
    docs.forEach(doc => {
      this.documents.push({ ...doc, category });
    });
  }

  // Build TF-IDF index after all documents are added
  buildIndex() {
    this.docTfIdfs = this.documents.map(doc => {
      const text = `${doc.title || ''} ${doc.content || ''}`;
      const tokens = tokenize(text);
      return computeTF(tokens);
    });
  }

  // Search with a query, returns top results
  search(query, topK = 5) {
    const queryTokens = tokenize(query);
    if (queryTokens.length === 0 || this.docTfIdfs.length === 0) return [];

    const N = this.docTfIdfs.length;
    const df = {};
    for (const tf of this.docTfIdfs) {
      for (const t of new Set(Object.keys(tf))) {
        df[t] = (df[t] || 0) + 1;
      }
    }
    const idf = {};
    for (const [t, c] of Object.entries(df)) {
      idf[t] = Math.log((N + 1) / (c + 1)) + 1;
    }

    const { computeTFIDF, cosineSimilarity } = require_nlp();
    const queryTF = computeTF(queryTokens);
    const queryTfIdf = computeTFIDF(queryTF, idf);

    const results = this.docTfIdfs.map((docTf, i) => ({
      document: this.documents[i],
      score: cosineSimilarity(queryTfIdf, computeTFIDF(docTf, idf)),
    }));

    return results
      .filter(r => r.score > 0.01)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  // Save index to disk
  save(filePath) {
    const data = {
      version: this.version,
      savedAt: new Date().toISOString(),
      documentCount: this.documents.length,
      categories: Object.keys(this.categories),
      documents: this.documents,
      docTfIdfs: this.docTfIdfs,
    };
    writeFileSync(filePath, JSON.stringify(data));
  }

  // Load index from disk
  load(filePath) {
    if (!existsSync(filePath)) return false;
    try {
      const data = JSON.parse(readFileSync(filePath, 'utf8'));
      this.version = data.version;
      this.documents = data.documents;
      this.docTfIdfs = data.docTfIdfs;
      return true;
    } catch {
      return false;
    }
  }

  getStats() {
    const cats = {};
    for (const doc of this.documents) {
      const c = doc.category || 'uncategorized';
      cats[c] = (cats[c] || 0) + 1;
    }
    return {
      version: this.version,
      totalDocuments: this.documents.length,
      categories: cats,
    };
  }
}

// Lazy require to avoid circular dep
function require_nlp() {
  return import('./nlp.js');
}

// Sync version for search (needs nlp functions available)
function searchSync(store, query, topK = 5) {
  const { tokenize, computeTF, computeTFIDF, cosineSimilarity } = require_nlp_sync();
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0 || store.docTfIdfs.length === 0) return [];

  const N = store.docTfIdfs.length;
  const df = {};
  for (const tf of store.docTfIdfs) {
    for (const t of new Set(Object.keys(tf))) {
      df[t] = (df[t] || 0) + 1;
    }
  }
  const idf = {};
  for (const [t, c] of Object.entries(df)) {
    idf[t] = Math.log((N + 1) / (c + 1)) + 1;
  }

  const queryTF = computeTF(queryTokens);
  const queryTfIdf = computeTFIDF(queryTF, idf);

  return store.docTfIdfs.map((docTf, i) => ({
    document: store.documents[i],
    score: cosineSimilarity(queryTfIdf, computeTFIDF(docTf, idf)),
  }))
    .filter(r => r.score > 0.01)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

let _nlpSync = null;
function require_nlp_sync() {
  if (!_nlpSync) {
    // This is a hack for synchronous use — the module is ESM so we cache the import
    throw new Error('Use async search');
  }
  return _nlpSync;
}

export { KnowledgeStore, searchSync };
