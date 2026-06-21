/**
 * syncContentFromApi.js
 * ─────────────────────────────────────────────────────────
 * Build-time script: fetches published articles and blogs
 * from the FastAPI public endpoint and writes them to the
 * local JSON content files consumed by the React app.
 *
 * This preserves SEO because react-snap can pre-render
 * pages using the local JSON files at build time.
 *
 * Replaces the previous Supabase-direct approach — Feature 8
 * moved content_posts into the user DB behind FastAPI.
 *
 * Usage:
 *   node scripts/syncContentFromApi.js
 *
 * Called automatically by `npm run predeploy` before build.
 * ─────────────────────────────────────────────────────────
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

// ── Paths ────────────────────────────────────────────────
const ARTICLE_FILE      = path.join(__dirname, '../src/data/contentData/article.json');
const MORE_FILE         = path.join(__dirname, '../src/data/contentData/moreArticles.json');
const BLOGS_FILE        = path.join(__dirname, '../src/data/contentData/blogs.json');
const ARTICLES_PER_PAGE = 4;
const FETCH_LIMIT       = 200;

// ── API base URL ─────────────────────────────────────────
// Honor an explicit override; otherwise default to production. The script
// runs at deploy time (predeploy) so production is the right default.
const API_BASE_URL =
  process.env.API_BASE_URL
  || process.env.REACT_APP_API_BASE_URL
  || 'https://www.sandlotpicksanalytics.com';

// ── Transform an API row → JSON file format ──────────────
function rowToPost(row) {
  return {
    id:                   row.id,
    title:                row.title,
    slug:                 row.slug,
    author:               row.author,
    date:                 row.date ? row.date.split('T')[0] : null,
    status:               'Final',
    tags:                 row.tags || [],
    summary:              row.summary || '',
    read_time_minutes:    row.read_time_minutes || null,
    estimated_word_count: row.estimated_word_count || null,
    hero_image: {
      url: row.hero_image_url || '',
      alt: row.hero_image_alt || '',
    },
    content:              row.content || [],
    seo:                  row.seo || {},
    affiliate_cta:        row.affiliate_cta || { enabled: false },
    affiliate_disclaimer: row.affiliate_disclaimer || '',
    related_posts:        row.related_posts || [],
    reference_urls:       row.reference_urls || [],
  };
}

async function fetchPublished(type) {
  const url = `${API_BASE_URL}/api/v1/content-posts?type=${encodeURIComponent(type)}&limit=${FETCH_LIMIT}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} from ${url}: ${body.slice(0, 200)}`);
  }
  const json = await res.json();
  return Array.isArray(json) ? json : [];
}

// ── Sync articles → article.json + moreArticles.json ─────
async function syncArticles(articles) {
  if (articles.length === 0) {
    console.log('ℹ️   No published articles from API — keeping existing article files.');
    return;
  }

  // Sort by id descending (newest first)
  articles.sort((a, b) => b.id - a.id);

  const page1 = articles.slice(0, ARTICLES_PER_PAGE);
  const rest  = articles.slice(ARTICLES_PER_PAGE);
  const totalPages = Math.ceil(articles.length / ARTICLES_PER_PAGE);

  const articleData = {
    schema_version: '2.0',
    site: 'sandlotpicks.com',
    generated_at: new Date().toISOString().split('T')[0],
    pagination: {
      current_page: 1,
      articles_per_page: ARTICLES_PER_PAGE,
      total_articles: articles.length,
      total_pages: totalPages,
      has_more: rest.length > 0,
    },
    articles: page1,
  };

  const moreData = {
    schema_version: '2.0',
    site: 'sandlotpicks.com',
    generated_at: new Date().toISOString().split('T')[0],
    pagination: {
      starts_at_page: 2,
      articles_per_page: ARTICLES_PER_PAGE,
      total_articles: articles.length,
    },
    articles: rest,
  };

  fs.writeFileSync(ARTICLE_FILE, JSON.stringify(articleData, null, 2), 'utf8');
  fs.writeFileSync(MORE_FILE, JSON.stringify(moreData, null, 2), 'utf8');
  console.log(`✅  Articles synced: ${page1.length} on page 1, ${rest.length} in moreArticles`);
}

// ── Sync blogs → blogs.json ───────────────────────────────
async function syncBlogs(blogs) {
  if (blogs.length === 0) {
    console.log('ℹ️   No published blogs from API — keeping existing blogs file.');
    return;
  }

  blogs.sort((a, b) => b.id - a.id);

  let existing = {};
  try {
    existing = JSON.parse(fs.readFileSync(BLOGS_FILE, 'utf8'));
  } catch { /* file might not exist yet */ }

  const blogsData = {
    schema_version: existing.schema_version || '1.0',
    site: 'sandlotpicks.com',
    generated_at: new Date().toISOString().split('T')[0],
    blogs,
  };

  fs.writeFileSync(BLOGS_FILE, JSON.stringify(blogsData, null, 2), 'utf8');
  console.log(`✅  Blogs synced: ${blogs.length} posts`);
}

// ── Main ─────────────────────────────────────────────────
async function main() {
  console.log(`🔄  Syncing content from ${API_BASE_URL}…\n`);

  if (typeof fetch !== 'function') {
    console.error('❌  Global fetch() not available. Node 18+ required.');
    process.exit(1);
  }

  try {
    let articleRows = [];
    try {
      articleRows = await fetchPublished('article');
    } catch (err) {
      console.error('⚠️   Could not fetch articles:', err.message);
      console.log('    Keeping existing article files.\n');
    }
    await syncArticles(articleRows.map(rowToPost));

    let blogRows = [];
    try {
      blogRows = await fetchPublished('blog');
    } catch (err) {
      console.error('⚠️   Could not fetch blogs:', err.message);
      console.log('    Keeping existing blogs file.\n');
    }
    await syncBlogs(blogRows.map(rowToPost));

    console.log('\n✔   Sync complete.\n');
  } catch (err) {
    console.error('❌  Unexpected error during sync:', err.message);
    console.log('    Build will continue using existing content files.\n');
  }
}

main();
