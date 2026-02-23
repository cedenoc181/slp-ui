const fs = require('fs');
const path = require('path');

const MAIN_FILE = path.join(__dirname, '../src/data/contentData/article.json');
const MORE_FILE = path.join(__dirname, '../src/data/contentData/moreArticles.json');
const ARTICLES_PER_PAGE = 4;

function organizeArticles() {
  console.log('🔄 Starting article organization...\n');

  // Read main articles file
  const mainData = JSON.parse(fs.readFileSync(MAIN_FILE, 'utf8'));
  
  // Read or create moreArticles file
  let moreData = {
    schema_version: "1.0",
    site: "sandlotpicks.com",
    generated_at: new Date().toISOString().split('T')[0],
    total_articles: 0,
    articles: []
  };
  
  if (fs.existsSync(MORE_FILE)) {
    moreData = JSON.parse(fs.readFileSync(MORE_FILE, 'utf8'));
  }

  // Combine all articles from both files
  const allArticles = [...mainData.articles, ...moreData.articles];
  
  // Remove duplicates based on ID
  const uniqueArticles = Array.from(
    new Map(allArticles.map(article => [article.id, article])).values()
  );
  
  // Sort by ID (newest/highest ID first)
  uniqueArticles.sort((a, b) => b.id - a.id);
  
  console.log(`📊 Total unique articles found: ${uniqueArticles.length}`);
  
  // Split into page 1 (main) and rest (more)
  const page1Articles = uniqueArticles.slice(0, ARTICLES_PER_PAGE);
  const restArticles = uniqueArticles.slice(ARTICLES_PER_PAGE);
  
  // Calculate pagination
  const totalPages = Math.ceil(uniqueArticles.length / ARTICLES_PER_PAGE);
  const hasMore = restArticles.length > 0;
  
  // Update main file (Page 1)
  mainData.articles = page1Articles;
  mainData.pagination = {
    current_page: 1,
    articles_per_page: ARTICLES_PER_PAGE,
    total_pages: totalPages,
    has_more: hasMore
  };
  mainData.generated_at = new Date().toISOString().split('T')[0];
  
  // Update more articles file (Page 2+)
  moreData.articles = restArticles;
  moreData.total_articles = restArticles.length;
  moreData.pagination = {
    starts_at_page: 2,
    articles_per_page: ARTICLES_PER_PAGE
  };
  moreData.generated_at = new Date().toISOString().split('T')[0];
  
  // Write files
  fs.writeFileSync(MAIN_FILE, JSON.stringify(mainData, null, 2), 'utf8');
  fs.writeFileSync(MORE_FILE, JSON.stringify(moreData, null, 2), 'utf8');
  
  console.log(`\n✅ Organization complete!`);
  console.log(`📄 Page 1 (article.json): ${page1Articles.length} articles`);
  console.log(`📚 Pages 2+ (moreArticles.json): ${restArticles.length} articles`);
  console.log(`📖 Total pages: ${totalPages}`);
  console.log(`🔗 Has more pages: ${hasMore ? 'Yes' : 'No'}\n`);
  
  // Show article distribution
  console.log('📋 Page 1 Articles (article.json):');
  console.log('─────────────────────────────────────');
  page1Articles.forEach((article, idx) => {
    console.log(`${idx + 1}. [ID: ${article.id}] ${article.title.substring(0, 60)}...`);
  });
  
  if (restArticles.length > 0) {
    console.log('\n📦 Older Articles (moreArticles.json):');
    console.log('─────────────────────────────────────');
    restArticles.forEach((article, idx) => {
      const page = Math.floor(idx / ARTICLES_PER_PAGE) + 2;
      console.log(`Page ${page}: [ID: ${article.id}] ${article.title.substring(0, 60)}...`);
    });
  }
}

// Run the organization
try {
  organizeArticles();
} catch (error) {
  console.error('❌ Error organizing articles:', error.message);
  console.error(error.stack);
  process.exit(1);
}

module.exports = { organizeArticles };