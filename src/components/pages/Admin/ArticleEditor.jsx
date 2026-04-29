import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import supabase from '../../../lib/supabaseClient';
import '../../../styles/admin-page-styling/admin.css';

// ── Helpers ───────────────────────────────────────────────
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// ── AI assist (mock — wire to LLM later) ──────────────────
const AI_BLOCK_QUICK_ACTIONS = [
  { id: 'improve', label: 'Improve writing', icon: '✨' },
  { id: 'shorter', label: 'Make it shorter', icon: '✂️' },
  { id: 'expand',  label: 'Expand on this',  icon: '📖' },
  { id: 'casual',  label: 'More casual',     icon: '👋' },
  { id: 'sharper', label: 'More sharper',    icon: '⚡' },
];

function blocksToPlainText(blocks) {
  return (blocks || []).map(b =>
    b.type === 'list' ? (b.items || []).join('\n') : (b.text || '')
  ).filter(Boolean).join('\n\n');
}

function mockTitleIdeas({ summary, content, type }) {
  const seed = (summary || blocksToPlainText(content) || '').slice(0, 50) || 'this story';
  const flavor = type === 'blog' ? 'Strategy:' : 'Inside:';
  return [
    `${flavor} What ${seed.split(' ').slice(0, 3).join(' ')} Means For The 2026 Season`,
    `The Numbers Behind ${seed.split(' ').slice(0, 4).join(' ')}`,
    `Why ${seed.split(' ').slice(0, 3).join(' ')} Will Define This Week`,
    `A Closer Look: ${seed.split(' ').slice(0, 5).join(' ')}`,
    `${seed.split(' ').slice(0, 4).join(' ')} — Explained`,
  ];
}

function mockSummaryDraft(content) {
  const text = blocksToPlainText(content);
  if (!text) {
    return 'Write a short, punchy summary — typically one or two sentences that tell the reader exactly what they\'ll get from the article.';
  }
  const firstSentence = text.split(/[.!?]/)[0] || '';
  return `${firstSentence.trim()}. Here's a closer look at what the data — and the eye test — are telling us heading into the rest of the season.`;
}

function mockBlockRefine({ block, action }) {
  const original = block.type === 'list' ? (block.items || []).join('\n') : (block.text || '');
  if (!original) return original;

  switch (action) {
    case 'shorter':
      return original.split('.').slice(0, 1).join('.') + '.';
    case 'expand':
      return original + '\n\nThis is one of those stretches where the underlying numbers really matter — peripherals, batted-ball quality, and matchup leverage are all pulling in the same direction. Worth keeping an eye on as the sample grows.';
    case 'casual':
      return original.replace(/\b(however|therefore|thus)\b/gi, 'so').replace(/\b(utilize|leverage)\b/gi, 'use');
    case 'sharper':
      return original.replace(/\.\s/g, '. ').replace(/(\bvery\b\s|\breally\b\s|\bquite\b\s)/gi, '');
    case 'improve':
    default:
      return `${original}\n\n[AI polish: tightened phrasing, kept your original voice]`;
  }
}

function ArticleAIModal({ open, mode, blockIndex, post, onClose, onApply }) {
  const [prompt, setPrompt]     = useState('');
  const [generating, setGenerating] = useState(false);
  const [titleIdeas, setTitleIdeas] = useState([]);
  const [draft, setDraft]       = useState('');

  useEffect(() => {
    if (open) {
      setPrompt('');
      setTitleIdeas([]);
      setDraft('');
      setGenerating(false);
    }
  }, [open, mode]);

  if (!open) return null;

  const block = mode === 'block' && blockIndex != null ? post.content[blockIndex] : null;

  const handleGenerate = async (quickActionId) => {
    setGenerating(true);
    await new Promise(r => setTimeout(r, 1100)); // mock latency
    if (mode === 'title') {
      setTitleIdeas(mockTitleIdeas({ summary: post.summary, content: post.content, type: post.type }));
    } else if (mode === 'summary') {
      setDraft(mockSummaryDraft(post.content));
    } else if (mode === 'block' && block) {
      setDraft(mockBlockRefine({ block, action: quickActionId || 'improve' }));
    }
    setGenerating(false);
  };

  const heading = mode === 'title'   ? 'Title ideas'
                : mode === 'summary' ? 'Generate summary'
                : `Refine ${block?.type ?? 'block'}`;

  const description = mode === 'title'   ? 'Generated from your current summary and content.'
                    : mode === 'summary' ? 'Drafted from the body content you\'ve written so far.'
                    : 'Refine the text inside this block while keeping your voice.';

  return (
    <div className="campaign-modal-overlay" onClick={onClose}>
      <div className="ai-modal" onClick={e => e.stopPropagation()}>
        <button className="ai-modal__close" onClick={onClose} aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <div className="ai-modal__header">
          <span className="ai-modal__eyebrow">✨ AI Assist</span>
          <h3>{heading}</h3>
          <p className="ai-modal__sub">{description}</p>
        </div>

        <div className="ai-modal__body">
          {mode === 'title' ? (
            <>
              {titleIdeas.length === 0 && !generating && (
                <button
                  type="button"
                  className="campaign-btn campaign-btn--primary"
                  onClick={() => handleGenerate()}
                  style={{ width: '100%' }}
                >
                  ✨ Generate 5 title ideas
                </button>
              )}
              {generating && <div className="ai-modal__loading">Generating ideas…</div>}
              {titleIdeas.length > 0 && (
                <div className="ai-suggestion-list">
                  {titleIdeas.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      className="ai-suggestion"
                      onClick={() => { onApply(s); onClose(); }}
                    >
                      <span className="ai-suggestion__index">{i + 1}</span>
                      <span className="ai-suggestion__text">{s}</span>
                      <span className="ai-suggestion__hint">Click to use →</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    className="campaign-btn campaign-btn--ghost"
                    onClick={() => handleGenerate()}
                    style={{ marginTop: '0.5rem' }}
                  >
                    Try again
                  </button>
                </div>
              )}
            </>
          ) : mode === 'summary' ? (
            <>
              {!draft && !generating && (
                <button
                  type="button"
                  className="campaign-btn campaign-btn--primary"
                  onClick={() => handleGenerate()}
                  style={{ width: '100%' }}
                >
                  ✨ Draft a summary from my content
                </button>
              )}
              {generating && <div className="ai-modal__loading">Drafting summary…</div>}
              {draft && !generating && (
                <>
                  <label className="ai-modal__label">Suggested summary</label>
                  <textarea
                    className="campaign-textarea"
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    rows={5}
                  />
                  <div className="ai-modal__actions">
                    <button type="button" className="campaign-btn campaign-btn--ghost" onClick={onClose}>Cancel</button>
                    <button
                      type="button"
                      className="campaign-btn campaign-btn--primary"
                      onClick={() => { onApply(draft); onClose(); }}
                    >
                      Apply summary
                    </button>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <label className="ai-modal__label">Custom instruction (optional)</label>
              <textarea
                className="campaign-textarea ai-modal__prompt"
                placeholder="e.g. Tighten this paragraph and add a stat to back the claim."
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                rows={3}
              />

              <div className="ai-modal__quick-row">
                <span className="ai-modal__quick-label">Quick refine:</span>
                {AI_BLOCK_QUICK_ACTIONS.map(a => (
                  <button
                    key={a.id}
                    type="button"
                    className="ai-quick-chip"
                    onClick={() => handleGenerate(a.id)}
                    disabled={generating}
                  >
                    {a.icon} {a.label}
                  </button>
                ))}
              </div>

              {generating && <div className="ai-modal__loading">Refining…</div>}

              {draft && !generating && (
                <>
                  <label className="ai-modal__label" style={{ marginTop: '1rem' }}>Suggested revision</label>
                  <textarea
                    className="campaign-textarea"
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    rows={8}
                  />
                </>
              )}

              <div className="ai-modal__actions">
                <button type="button" className="campaign-btn campaign-btn--ghost" onClick={onClose}>Cancel</button>
                {!draft ? (
                  <button
                    type="button"
                    className="campaign-btn campaign-btn--primary"
                    onClick={() => handleGenerate()}
                    disabled={!prompt || generating}
                  >
                    ✨ Generate
                  </button>
                ) : (
                  <button
                    type="button"
                    className="campaign-btn campaign-btn--primary"
                    onClick={() => { onApply(draft); onClose(); }}
                  >
                    Apply revision
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function estimateReadTime(blocks) {
  const text = (blocks || []).map(b => {
    if (b.type === 'list') return (b.items || []).join(' ');
    return b.text || '';
  }).join(' ');
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

// ── Content Block Editor ──────────────────────────────────
function BlockEditor({ block, index, total, onChange, onDelete, onMoveUp, onMoveDown, onAi }) {
  const handleTextChange = (e) => onChange(index, { ...block, text: e.target.value });
  const handleItemChange = (itemIdx, val) => {
    const items = [...(block.items || [])];
    items[itemIdx] = val;
    onChange(index, { ...block, items });
  };
  const addItem = () => onChange(index, { ...block, items: [...(block.items || []), ''] });
  const removeItem = (itemIdx) => {
    const items = (block.items || []).filter((_, i) => i !== itemIdx);
    onChange(index, { ...block, items });
  };

  return (
    <div className="content-block">
      <div className="block-header">
        <span className="block-type-label">{block.type}</span>
        <div className="block-actions">
          {block.type !== 'list' && onAi && (
            <button
              type="button"
              className="block-btn block-btn--ai"
              onClick={() => onAi(index)}
              title="Refine with AI"
              aria-label="Refine this block with AI"
            >
              ✨
            </button>
          )}
          {index > 0 && <button type="button" className="block-btn" onClick={() => onMoveUp(index)}>↑</button>}
          {index < total - 1 && <button type="button" className="block-btn" onClick={() => onMoveDown(index)}>↓</button>}
          <button type="button" className="block-btn delete" onClick={() => onDelete(index)}>✕</button>
        </div>
      </div>

      {block.type === 'list' ? (
        <>
          <div className="list-items">
            {(block.items || []).map((item, itemIdx) => (
              <div className="list-item-row" key={itemIdx}>
                <input
                  type="text"
                  value={item}
                  placeholder={`Item ${itemIdx + 1}`}
                  onChange={e => handleItemChange(itemIdx, e.target.value)}
                />
                <button type="button" className="block-btn delete" onClick={() => removeItem(itemIdx)}>✕</button>
              </div>
            ))}
          </div>
          <button type="button" className="add-block-btn" onClick={addItem}>+ Add item</button>
        </>
      ) : block.type === 'quote' ? (
        <>
          <textarea
            className="block-textarea"
            rows={3}
            placeholder="Quote text…"
            value={block.text || ''}
            onChange={handleTextChange}
          />
          <input
            style={{ marginTop: '0.4rem', width: '100%', background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: '#fff', fontSize: '0.82rem', padding: '0.35rem 0.6rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
            type="text"
            placeholder="Quote author (optional)"
            value={block.author || ''}
            onChange={e => onChange(index, { ...block, author: e.target.value })}
          />
        </>
      ) : (
        <textarea
          className={`block-textarea ${block.type === 'heading' ? 'heading-ta' : block.type === 'subheading' ? 'subheading-ta' : ''}`}
          rows={block.type === 'paragraph' ? 4 : 2}
          placeholder={
            block.type === 'heading' ? 'Section heading…' :
            block.type === 'subheading' ? 'Sub-heading…' :
            'Paragraph text…'
          }
          value={block.text || ''}
          onChange={handleTextChange}
        />
      )}
    </div>
  );
}

// ── Main Editor ───────────────────────────────────────────
function ArticleEditor() {
  const { isAuthenticated, loading, user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isNew = !id;
  const defaultType = searchParams.get('type') === 'blog' ? 'blog' : 'article';

  const [post, setPost] = useState({
    type: defaultType,
    title: '',
    slug: '',
    author: 'Sandlot Picks Team',
    status: 'draft',
    date: new Date().toISOString().split('T')[0],
    tags: '',
    summary: '',
    hero_image_url: '',
    hero_image_alt: '',
    content: [],
    seo_title: '',
    seo_description: '',
    seo_keywords: '',
    affiliate_enabled: false,
    affiliate_platform: '',
    affiliate_link: '',
    affiliate_context: '',
    affiliate_disclaimer: '',
    related_posts: '',
  });

  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // null | 'saved' | 'error'
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [fetchingPost, setFetchingPost] = useState(!isNew);

  // AI assist modal: { mode: 'title' | 'summary' | 'block', blockIndex?: number } | null
  const [aiModal, setAiModal] = useState(null);

  // auth redirect disabled for development

  // Load existing post if editing
  useEffect(() => {
    if (isNew) return;
    async function loadPost() {
      const { data, error } = await supabase
        .from('content_posts')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) {
        const seo = data.seo || {};
        const aff = data.affiliate_cta || {};
        setPost({
          type: data.type || 'article',
          title: data.title || '',
          slug: data.slug || '',
          author: data.author || 'Sandlot Picks Team',
          status: data.status || 'draft',
          date: data.date ? data.date.split('T')[0] : new Date().toISOString().split('T')[0],
          tags: (data.tags || []).join(', '),
          summary: data.summary || '',
          hero_image_url: data.hero_image_url || '',
          hero_image_alt: data.hero_image_alt || '',
          content: data.content || [],
          seo_title: seo.title_tag || '',
          seo_description: seo.meta_description || '',
          seo_keywords: (seo.keywords || []).join(', '),
          affiliate_enabled: aff.enabled || false,
          affiliate_platform: aff.platform || '',
          affiliate_link: aff.link || '',
          affiliate_context: aff.context || '',
          affiliate_disclaimer: data.affiliate_disclaimer || '',
          related_posts: (data.related_posts || []).join(', '),
        });
        setSlugManuallyEdited(true); // don't auto-regenerate slug for existing posts
      }
      setFetchingPost(false);
    }
    loadPost();
  }, [id, isNew, isAuthenticated, user]);

  // Auto-generate slug from title (only for new posts, until user edits slug manually)
  const handleTitleChange = (e) => {
    const title = e.target.value;
    setPost(prev => ({
      ...prev,
      title,
      ...(!slugManuallyEdited ? { slug: slugify(title) } : {}),
    }));
  };

  const handleSlugChange = (e) => {
    setSlugManuallyEdited(true);
    setPost(prev => ({ ...prev, slug: slugify(e.target.value) }));
  };

  const handleChange = (field, value) => {
    setPost(prev => ({ ...prev, [field]: value }));
  };

  // Content block operations
  const addBlock = (type) => {
    const newBlock = type === 'list'
      ? { type, items: [''] }
      : { type, text: '' };
    setPost(prev => ({ ...prev, content: [...prev.content, newBlock] }));
  };

  const updateBlock = useCallback((index, block) => {
    setPost(prev => {
      const content = [...prev.content];
      content[index] = block;
      return { ...prev, content };
    });
  }, []);

  const deleteBlock = useCallback((index) => {
    setPost(prev => ({ ...prev, content: prev.content.filter((_, i) => i !== index) }));
  }, []);

  const handleAiApply = (text) => {
    if (!aiModal) return;
    if (aiModal.mode === 'title') {
      setPost(prev => ({
        ...prev,
        title: text,
        ...(slugManuallyEdited ? {} : { slug: slugify(text) }),
      }));
    } else if (aiModal.mode === 'summary') {
      setPost(prev => ({ ...prev, summary: text }));
    } else if (aiModal.mode === 'block' && aiModal.blockIndex != null) {
      const idx = aiModal.blockIndex;
      setPost(prev => {
        const content = [...prev.content];
        const block = content[idx];
        if (!block) return prev;
        content[idx] = { ...block, text };
        return { ...prev, content };
      });
    }
  };

  const moveBlock = useCallback((index, direction) => {
    setPost(prev => {
      const content = [...prev.content];
      const target = index + direction;
      if (target < 0 || target >= content.length) return prev;
      [content[index], content[target]] = [content[target], content[index]];
      return { ...prev, content };
    });
  }, []);

  // Save to Supabase
  const save = async (newStatus) => {
    setSaving(true);
    setSaveStatus(null);

    const readTime = estimateReadTime(post.content);
    const wordCount = (post.content || []).map(b =>
      b.type === 'list' ? (b.items || []).join(' ') : (b.text || '')
    ).join(' ').trim().split(/\s+/).filter(Boolean).length;

    const payload = {
      type: post.type,
      title: post.title.trim(),
      slug: post.slug.trim(),
      author: post.author.trim(),
      status: newStatus || post.status,
      date: post.date || null,
      tags: post.tags ? post.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      summary: post.summary.trim(),
      hero_image_url: post.hero_image_url.trim() || null,
      hero_image_alt: post.hero_image_alt.trim() || null,
      content: post.content,
      read_time_minutes: readTime,
      estimated_word_count: wordCount,
      seo: {
        title_tag: post.seo_title.trim() || post.title.trim(),
        meta_description: post.seo_description.trim() || post.summary.trim(),
        keywords: post.seo_keywords ? post.seo_keywords.split(',').map(k => k.trim()).filter(Boolean) : [],
        canonical_url: `https://www.sandlotpicks.com/${post.type === 'article' ? 'sandlot-insider' : 'blogs'}/${post.slug}`,
        og_image: post.hero_image_url.trim() || null,
      },
      affiliate_cta: {
        enabled: post.affiliate_enabled,
        platform: post.affiliate_platform.trim(),
        link: post.affiliate_link.trim(),
        context: post.affiliate_context.trim(),
      },
      affiliate_disclaimer: post.affiliate_disclaimer.trim() || null,
      related_posts: post.related_posts ? post.related_posts.split(',').map(s => s.trim()).filter(Boolean) : [],
    };

    let error;
    if (isNew) {
      const res = await supabase.from('content_posts').insert(payload);
      error = res.error;
    } else {
      const res = await supabase.from('content_posts').update(payload).eq('id', id);
      error = res.error;
    }

    if (error) {
      console.error('Save error:', error);
      setSaveStatus('error');
    } else {
      setSaveStatus('saved');
      if (newStatus) setPost(prev => ({ ...prev, status: newStatus }));
      if (isNew) navigate('/admin');
    }

    setSaving(false);
    setTimeout(() => setSaveStatus(null), 4000);
  };

  if (loading || fetchingPost) return null;

  if (false) {
    return (
      <div className="article-editor-page">
        <div className="container">
          <div className="admin-access-denied">
            <h2>Access Denied</h2>
            <p>This page is for admins only.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="article-editor-page">
      <div className="container">
        {/* Back + Header */}
        <button
          type="button"
          className="editor-back-link"
          onClick={() => navigate('/admin')}
          aria-label="Back to command center"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="editor-header">
          <h1>{isNew ? `New ${post.type === 'blog' ? 'Blog Post' : 'Article'}` : 'Edit Post'}</h1>
          <div className="editor-actions">
            {saveStatus === 'saved' && <span className="editor-save-msg">✓ Saved</span>}
            {saveStatus === 'error' && <span className="editor-save-err">✗ Failed to save</span>}
            <button type="button" className="btn-secondary" onClick={() => save('draft')} disabled={saving}>
              {saving ? 'Saving…' : 'Save Draft'}
            </button>
            <button type="button" className="btn-success" onClick={() => save('published')} disabled={saving}>
              {post.status === 'published' ? 'Update' : 'Publish'}
            </button>
          </div>
        </div>

        <div className="editor-layout">
          {/* ── Main Column ── */}
          <div className="editor-main">
            {/* Type picker — only relevant for new posts */}
            {isNew && (
              <div className="editor-card editor-type-picker">
                <h3>Content Type</h3>
                <p className="editor-type-picker__hint">Pick where this post will live before you start writing.</p>
                <div className="editor-type-picker__options">
                  <button
                    type="button"
                    className={`editor-type-option${post.type === 'article' ? ' is-active' : ''}`}
                    onClick={() => handleChange('type', 'article')}
                  >
                    <span className="editor-type-option__icon">📰</span>
                    <span className="editor-type-option__name">Sandlot Insider</span>
                    <span className="editor-type-option__desc">Long-form article · /sandlot-insider/…</span>
                  </button>
                  <button
                    type="button"
                    className={`editor-type-option${post.type === 'blog' ? ' is-active' : ''}`}
                    onClick={() => handleChange('type', 'blog')}
                  >
                    <span className="editor-type-option__icon">📝</span>
                    <span className="editor-type-option__name">Strategy Blog</span>
                    <span className="editor-type-option__desc">Shorter blog post · /blogs/…</span>
                  </button>
                </div>
              </div>
            )}

            {/* Title & Slug */}
            <div className="editor-card">
              <h3>Post Info</h3>
              <div className="editor-field">
                <div className="editor-field__labelrow">
                  <label>Title *</label>
                  <button
                    type="button"
                    className="ai-assist-btn"
                    onClick={() => setAiModal({ mode: 'title' })}
                  >
                    ✨ AI Suggest
                  </button>
                </div>
                <input
                  type="text"
                  className="title-input"
                  placeholder="Post title…"
                  value={post.title}
                  onChange={handleTitleChange}
                />
              </div>
              <div className="editor-field">
                <label>Slug *</label>
                <input
                  type="text"
                  placeholder="url-slug"
                  value={post.slug}
                  onChange={handleSlugChange}
                />
              </div>
              <div className="editor-field">
                <div className="editor-field__labelrow">
                  <label>Summary / Excerpt *</label>
                  <button
                    type="button"
                    className="ai-assist-btn"
                    onClick={() => setAiModal({ mode: 'summary' })}
                  >
                    ✨ Draft from content
                  </button>
                </div>
                <textarea
                  placeholder="One or two sentence teaser…"
                  rows={3}
                  value={post.summary}
                  onChange={e => handleChange('summary', e.target.value)}
                />
              </div>
              <div className="editor-field">
                <label>Tags (comma-separated)</label>
                <input
                  type="text"
                  placeholder="baseball, analytics, pitching"
                  value={post.tags}
                  onChange={e => handleChange('tags', e.target.value)}
                />
              </div>
            </div>

            {/* Content Blocks */}
            <div className="editor-card">
              <h3>Content</h3>
              <div className="content-blocks">
                {post.content.map((block, index) => (
                  <BlockEditor
                    key={index}
                    block={block}
                    index={index}
                    total={post.content.length}
                    onChange={updateBlock}
                    onDelete={deleteBlock}
                    onMoveUp={(i) => moveBlock(i, -1)}
                    onMoveDown={(i) => moveBlock(i, 1)}
                    onAi={(i) => setAiModal({ mode: 'block', blockIndex: i })}
                  />
                ))}
              </div>
              <div className="add-block-bar">
                <button type="button" className="add-block-btn" onClick={() => addBlock('paragraph')}>+ Paragraph</button>
                <button type="button" className="add-block-btn" onClick={() => addBlock('heading')}>+ Heading</button>
                <button type="button" className="add-block-btn" onClick={() => addBlock('subheading')}>+ Subheading</button>
                <button type="button" className="add-block-btn" onClick={() => addBlock('list')}>+ List</button>
                <button type="button" className="add-block-btn" onClick={() => addBlock('quote')}>+ Quote</button>
              </div>
            </div>

            {/* SEO */}
            <div className="editor-card">
              <h3>SEO</h3>
              <div className="editor-field">
                <label>SEO Title (defaults to post title)</label>
                <input type="text" placeholder="SEO-optimized title…" value={post.seo_title} onChange={e => handleChange('seo_title', e.target.value)} />
              </div>
              <div className="editor-field">
                <label>Meta Description (defaults to summary)</label>
                <textarea rows={2} placeholder="Meta description…" value={post.seo_description} onChange={e => handleChange('seo_description', e.target.value)} />
              </div>
              <div className="editor-field">
                <label>Keywords (comma-separated)</label>
                <input type="text" placeholder="mlb, baseball analytics, pitching stats" value={post.seo_keywords} onChange={e => handleChange('seo_keywords', e.target.value)} />
              </div>
            </div>

            {/* Affiliate CTA */}
            <div className="editor-card">
              <h3>Affiliate CTA</h3>
              <div className="editor-field" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="affEnabled"
                  checked={post.affiliate_enabled}
                  onChange={e => handleChange('affiliate_enabled', e.target.checked)}
                  style={{ width: 'auto', accentColor: '#1976D2' }}
                />
                <label htmlFor="affEnabled" style={{ marginBottom: 0, cursor: 'pointer' }}>Enable affiliate CTA</label>
              </div>
              {post.affiliate_enabled && (
                <>
                  <div className="editor-field">
                    <label>Platform</label>
                    <input type="text" placeholder="e.g. DraftKings, FanDuel" value={post.affiliate_platform} onChange={e => handleChange('affiliate_platform', e.target.value)} />
                  </div>
                  <div className="editor-field">
                    <label>Link URL</label>
                    <input type="url" placeholder="https://…" value={post.affiliate_link} onChange={e => handleChange('affiliate_link', e.target.value)} />
                  </div>
                  <div className="editor-field">
                    <label>CTA Context / Button Text</label>
                    <input type="text" placeholder="Claim your bonus now!" value={post.affiliate_context} onChange={e => handleChange('affiliate_context', e.target.value)} />
                  </div>
                  <div className="editor-field">
                    <label>Disclaimer</label>
                    <textarea rows={2} placeholder="Must be 21+. Gambling problem? Call 1-800-GAMBLER." value={post.affiliate_disclaimer} onChange={e => handleChange('affiliate_disclaimer', e.target.value)} />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── Sidebar ── */}
          <div className="editor-sidebar">
            <div className="editor-card">
              <h3>Publish</h3>
              <div className="editor-field">
                <label>Status</label>
                <select value={post.status} onChange={e => handleChange('status', e.target.value)}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
              <div className="editor-field">
                <label>Type</label>
                <select value={post.type} onChange={e => handleChange('type', e.target.value)} disabled={!isNew}>
                  <option value="article">Sandlot Insider (Article)</option>
                  <option value="blog">Strategy Blog</option>
                </select>
              </div>
              <div className="editor-field">
                <label>Date</label>
                <input type="date" value={post.date} onChange={e => handleChange('date', e.target.value)} />
              </div>
              <div className="editor-field">
                <label>Author</label>
                <input type="text" value={post.author} onChange={e => handleChange('author', e.target.value)} />
              </div>
              <button type="button" className="btn-success" style={{ width: '100%', marginTop: '0.5rem' }} onClick={() => save('published')} disabled={saving}>
                {post.status === 'published' ? 'Update' : 'Publish'}
              </button>
              <button type="button" className="btn-secondary" style={{ width: '100%', marginTop: '0.5rem' }} onClick={() => save('draft')} disabled={saving}>
                Save Draft
              </button>
            </div>

            <div className="editor-card">
              <h3>Hero Image</h3>
              <div className="editor-field">
                <label>Image URL</label>
                <input type="url" placeholder="https://… or /images/…" value={post.hero_image_url} onChange={e => handleChange('hero_image_url', e.target.value)} />
              </div>
              <div className="editor-field">
                <label>Alt Text</label>
                <input type="text" placeholder="Descriptive alt text" value={post.hero_image_alt} onChange={e => handleChange('hero_image_alt', e.target.value)} />
              </div>
              {post.hero_image_url && (
                <img
                  src={post.hero_image_url}
                  alt={post.hero_image_alt}
                  style={{ width: '100%', borderRadius: '6px', marginTop: '0.5rem', objectFit: 'cover', maxHeight: '140px' }}
                  onError={e => e.target.style.display = 'none'}
                />
              )}
            </div>

            <div className="editor-card">
              <h3>Related Posts</h3>
              <div className="editor-field">
                <label>Slugs (comma-separated)</label>
                <textarea rows={3} placeholder="slug-one, slug-two" value={post.related_posts} onChange={e => handleChange('related_posts', e.target.value)} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <ArticleAIModal
        open={aiModal !== null}
        mode={aiModal?.mode}
        blockIndex={aiModal?.blockIndex}
        post={post}
        onClose={() => setAiModal(null)}
        onApply={handleAiApply}
      />
    </div>
  );
}

export default ArticleEditor;
