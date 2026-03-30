import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import supabase from '../../../lib/supabaseClient';
import '../../../styles/admin-page-styling/admin.css';

function AdminPage() {
  const { isAuthenticated, loading, user } = useAuth();
  const navigate = useNavigate();

  const [posts, setPosts] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // auth redirect disabled for development

  // Fetch all posts (draft + published)
  useEffect(() => {

    async function fetchPosts() {
      setFetching(true);
      const { data, error } = await supabase
        .from('content_posts')
        .select('id, type, title, slug, status, date, tags, author, updated_at')
        .order('updated_at', { ascending: false });

      if (!error) setPosts(data || []);
      setFetching(false);
    }

    fetchPosts();
  }, [isAuthenticated, user]);

  const handleDelete = async (postId) => {
    const { error } = await supabase
      .from('content_posts')
      .delete()
      .eq('id', postId);

    if (!error) {
      setPosts(prev => prev.filter(p => p.id !== postId));
    }
    setDeleteConfirm(null);
  };

  const filteredPosts = posts.filter(p => {
    if (typeFilter !== 'all' && p.type !== typeFilter) return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (searchTerm && !p.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  if (loading) return null;
  if (false) {
    return (
      <div className="admin-page">
        <div className="container">
          <div className="admin-access-denied">
            <h2>Access Denied</h2>
            <p>This page is for admins only. Sign in with an admin account to continue.</p>
            <Link to="/account" className="btn-primary">Go to Account</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="container">
        {/* Header */}
        <div className="admin-header">
          <h1>Content Manager</h1>
          <div className="admin-header-actions">
            <Link to="/admin/model-performance" className="btn-secondary">📊 Model Performance</Link>
            <Link to="/admin/new?type=article" className="btn-primary">+ New Article</Link>
            <Link to="/admin/new?type=blog" className="btn-secondary">+ New Blog</Link>
          </div>
        </div>

        {/* Filters */}
        <div className="admin-filters">
          <input
            className="filter-input"
            type="text"
            placeholder="Search by title…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <select className="filter-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="all">All Types</option>
            <option value="article">Articles</option>
            <option value="blog">Blogs</option>
          </select>
          <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
          <span style={{ color: '#666', fontSize: '0.82rem', marginLeft: 'auto' }}>
            {filteredPosts.length} post{filteredPosts.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Posts Table */}
        {fetching ? (
          <div className="empty-state">Loading posts…</div>
        ) : filteredPosts.length === 0 ? (
          <div className="empty-state">
            {posts.length === 0
              ? 'No posts yet. Click "+ New Article" or "+ New Blog" to get started.'
              : 'No posts match your filters.'}
          </div>
        ) : (
          <div className="posts-table-wrap">
            <table className="posts-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPosts.map(post => (
                  <tr key={post.id}>
                    <td className="post-title-cell">
                      {post.title}
                      <small>/{post.type === 'article' ? 'sandlot-insider' : 'blogs'}/{post.slug}</small>
                    </td>
                    <td>
                      <span className="type-badge">{post.type}</span>
                    </td>
                    <td>
                      <span className={`status-badge ${post.status}`}>{post.status}</span>
                    </td>
                    <td>{post.date || '—'}</td>
                    <td>
                      <div className="post-actions">
                        <Link to={`/admin/edit/${post.id}`} className="btn-secondary">Edit</Link>
                        {deleteConfirm === post.id ? (
                          <>
                            <button className="btn-danger" onClick={() => handleDelete(post.id)}>Confirm</button>
                            <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                          </>
                        ) : (
                          <button className="btn-danger" onClick={() => setDeleteConfirm(post.id)}>Delete</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPage;
