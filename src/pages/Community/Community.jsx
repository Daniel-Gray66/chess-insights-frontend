import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { communityApi } from '../../services/api';
import { Globe, Search, BookOpen, Bookmark, Copy, User } from 'lucide-react';
import './Community.css';

export default function Community() {
  const [repertoires, setRepertoires] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('browse'); // 'browse' | 'bookmarks'
  const [filterColor, setFilterColor] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (tab === 'browse') {
      loadRepertoires();
    } else {
      loadBookmarks();
    }
  }, [tab, filterColor, searchQuery]);

  const loadRepertoires = async () => {
    setLoading(true);
    try {
      const res = searchQuery
        ? await communityApi.search(searchQuery, filterColor)
        : await communityApi.browse(filterColor);
      setRepertoires(res.data);
    } catch (err) {
      console.error('Failed to load community repertoires', err);
    } finally {
      setLoading(false);
    }
  };

  const loadBookmarks = async () => {
    setLoading(true);
    try {
      const res = await communityApi.getBookmarks();
      setBookmarks(res.data);
    } catch (err) {
      console.error('Failed to load bookmarks', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchQuery(searchInput.trim());
  };

  const handleBookmark = async (id, e) => {
    e.stopPropagation();
    try {
      await communityApi.bookmark(id);
      // Refresh to update bookmark counts
      loadRepertoires();
    } catch (err) {
      console.error('Failed to bookmark', err);
    }
  };

  const handleCopy = async (id, e) => {
    e.stopPropagation();
    try {
      const res = await communityApi.copy(id);
      navigate(`/repertoire/${res.data.id}`);
    } catch (err) {
      console.error('Failed to copy repertoire', err);
    }
  };

  const handleUnbookmark = async (id, e) => {
    e.stopPropagation();
    try {
      await communityApi.unbookmark(id);
      loadBookmarks();
    } catch (err) {
      console.error('Failed to unbookmark', err);
    }
  };

  return (
    <div className="community-page">
      <div className="community-header">
        <div>
          <h1 className="community-title">Community</h1>
          <p className="community-subtitle">Discover and learn from other players' repertoires</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="community-tabs">
        <button
          className={`community-tab ${tab === 'browse' ? 'community-tab--active' : ''}`}
          onClick={() => setTab('browse')}
        >
          <Globe size={15} /> Browse
        </button>
        <button
          className={`community-tab ${tab === 'bookmarks' ? 'community-tab--active' : ''}`}
          onClick={() => setTab('bookmarks')}
        >
          <Bookmark size={15} /> Bookmarks
        </button>
      </div>

      {tab === 'browse' && (
        <>
          {/* Search bar */}
          <form className="community-search" onSubmit={handleSearch}>
            <div className="search-input-wrap">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Search by name or description…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn--primary btn--small">Search</button>
            {searchQuery && (
              <button
                type="button"
                className="btn btn--ghost btn--small"
                onClick={() => { setSearchQuery(''); setSearchInput(''); }}
              >
                Clear
              </button>
            )}
          </form>

          {/* Color filter */}
          <div className="community-filters">
            <button
              className={`color-tab ${filterColor === null ? 'color-tab--active' : ''}`}
              onClick={() => setFilterColor(null)}
            >All</button>
            <button
              className={`color-tab ${filterColor === 'WHITE' ? 'color-tab--active' : ''}`}
              onClick={() => setFilterColor('WHITE')}
            >
              <span className="color-dot color-dot--white" /> White
            </button>
            <button
              className={`color-tab ${filterColor === 'BLACK' ? 'color-tab--active' : ''}`}
              onClick={() => setFilterColor('BLACK')}
            >
              <span className="color-dot color-dot--black" /> Black
            </button>
          </div>
        </>
      )}

      {/* Content */}
      {loading ? (
        <div className="community-loading">
          <div className="loading-spinner" />
          <span>Loading…</span>
        </div>
      ) : tab === 'browse' ? (
        repertoires.length === 0 ? (
          <div className="community-empty">
            <Globe size={48} strokeWidth={1} />
            <h3>{searchQuery ? 'No results found' : 'No public repertoires yet'}</h3>
            <p>{searchQuery
              ? 'Try a different search term'
              : 'Be the first to share — set one of your repertoires to Public!'
            }</p>
          </div>
        ) : (
          <div className="community-grid">
            {repertoires.map((rep) => (
              <div
                key={rep.id}
                className="community-card"
                onClick={() => navigate(`/community/${rep.id}`)}
              >
                <div className="community-card-top">
                  <span className={`color-badge color-badge--${rep.color?.toLowerCase()}`}>
                    {rep.color}
                  </span>
                  <span className="community-card-lines">
                    <BookOpen size={13} /> {rep.lineCount} lines
                  </span>
                </div>
                <h3 className="community-card-name">{rep.name}</h3>
                {rep.description && (
                  <p className="community-card-desc">{rep.description}</p>
                )}
                <div className="community-card-author">
                  <User size={13} />
                  <span>{rep.author?.username || rep.author?.chessComUsername}</span>
                </div>
                <div className="community-card-footer">
                  <span className="community-card-bookmarks">
                    <Bookmark size={13} /> {rep.bookmarkCount || 0}
                  </span>
                  <div className="community-card-actions">
                    <button
                      className="btn btn--ghost btn--tiny"
                      onClick={(e) => handleBookmark(rep.id, e)}
                      title="Bookmark"
                    >
                      <Bookmark size={14} />
                    </button>
                    <button
                      className="btn btn--ghost btn--tiny"
                      onClick={(e) => handleCopy(rep.id, e)}
                      title="Copy to my repertoires"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Bookmarks tab */
        bookmarks.length === 0 ? (
          <div className="community-empty">
            <Bookmark size={48} strokeWidth={1} />
            <h3>No bookmarks yet</h3>
            <p>Browse community repertoires and bookmark the ones you like</p>
          </div>
        ) : (
          <div className="community-grid">
            {bookmarks.map((bm) => (
              <div
                key={bm.repertoireId}
                className="community-card"
                onClick={() => navigate(`/community/${bm.repertoireId}`)}
              >
                <div className="community-card-top">
                  <span className={`color-badge color-badge--${bm.color?.toLowerCase()}`}>
                    {bm.color}
                  </span>
                  <span className="community-card-lines">
                    <BookOpen size={13} /> {bm.lineCount} lines
                  </span>
                </div>
                <h3 className="community-card-name">{bm.repertoireName}</h3>
                {bm.description && (
                  <p className="community-card-desc">{bm.description}</p>
                )}
                <div className="community-card-author">
                  <User size={13} />
                  <span>{bm.author?.username || bm.author?.chessComUsername}</span>
                </div>
                <div className="community-card-footer">
                  <button
                    className="btn btn--ghost btn--tiny btn--danger-text"
                    onClick={(e) => handleUnbookmark(bm.repertoireId, e)}
                  >
                    Remove bookmark
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}