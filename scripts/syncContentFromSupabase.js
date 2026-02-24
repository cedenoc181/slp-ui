/**
 * syncContentFromSupabase.js
 * ─────────────────────────────────────────────────────────
 * Build-time script: fetches published articles and blogs
 * from Supabase and writes them to the local JSON content
 * files consumed by the React app.
 *
 * This preserves SEO because react-snap can pre-render
 * pages using the local JSON files at build time.
 *
 * Usage:
 *   node scripts/syncContentFromSupabase.js
 *
 * Called automatically by `npm run predeploy` before build.
 * ─────────────────────────────────────────────────────────
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// ── Paths ────────────────────────────────────────────────
const ARTICLE_FILE    = path.join(__dirname, '../src/data/contentData/article.json');
const MORE_FILE       = path.join(__dirname, '../src/data/contentData/moreArticles.json');
const BLOGS_FILE      = path.join(__dirname, '../src/data/contentData/blogs.json');
const ARTICLES_PER_PAGE = 4;

// ── Supabase client (uses service role key — server-side only) ──
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌  SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ── Transform a Supabase row → JSON file format ──────────
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

// ── Sync articles → article.json + moreArticles.json ─────
async function syncArticles(articles) {
  if (articles.length === 0) {
    console.log('ℹ️   No published articles in Supabase — keeping existing article files.');
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
    console.log('ℹ️   No published blogs in Supabase — keeping existing blogs file.');
    return;
  }

  // Sort by id descending
  blogs.sort((a, b) => b.id - a.id);

  // Read current blogs.json metadata to preserve non-content fields
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
  console.log('🔄  Syncing content from Supabase…\n');

  try {
    // Fetch published articles
    const { data: articleRows, error: articleError } = await supabase
      .from('content_posts')
      .select('*')
      .eq('type', 'article')
      .eq('status', 'published')
      .order('id', { ascending: false });

    if (articleError) {
      console.error('⚠️   Could not fetch articles from Supabase:', articleError.message);
      console.log('    Keeping existing article files.\n');
    } else {
      await syncArticles((articleRows || []).map(rowToPost));
    }

    // Fetch published blogs
    const { data: blogRows, error: blogError } = await supabase
      .from('content_posts')
      .select('*')
      .eq('type', 'blog')
      .eq('status', 'published')
      .order('id', { ascending: false });

    if (blogError) {
      console.error('⚠️   Could not fetch blogs from Supabase:', blogError.message);
      console.log('    Keeping existing blogs file.\n');
    } else {
      await syncBlogs((blogRows || []).map(rowToPost));
    }

    console.log('\n✔   Sync complete.\n');
  } catch (err) {
    console.error('❌  Unexpected error during sync:', err.message);
    console.log('    Build will continue using existing content files.\n');
  }
}

main();
