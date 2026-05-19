import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { communityApi } from '../../services/api';
import { Bookmark, BookmarkCheck, Copy, User, BookOpen, ArrowLeft } from 'lucide-react';
import './Community.css';

export default function CommunityRepertoireView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [repertoire, setRepertoire] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    loadRepertoire();
  }, [id]);

  const loadRepertoire = async () => {
    try {
      const res = await communityApi.getRepertoire(id);
      setRepertoire(res.data);
    } catch (err) {
      console.error('Failed to load repertoire', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBookmarkToggle = async () => {
    try {
      if (repertoire.isBookmarked) {
        await communityApi.unbookmark(id);
      } else {
        await communityApi.bookmark(id);
      }
      loadRepertoire();
    } catch (err) {
      console.error('Failed to toggle bookmark', err);
    }
  };

  const handleCopy = async () => {
    setCopying(true);
    try {
      const res = await communityApi.copy(id);
      navigate(`/repertoire/${res.data.id}`);
    } catch (err) {
      console.error('Failed to copy repertoire', err);
    } finally {
      setCopying(false);
    }
  };

  if (loading) {
    return (
      <div className="community-loading">
        <div className="loading-spinner" />
        <span>Loading repertoire…</span>
      </div>
    );
  }

  if (!repertoire) {
    return (
      <div className="community-empty">
        <h3>Repertoire not found</h3>
        <p>This repertoire may have been made private or deleted.</p>
        <button className="btn btn--ghost" onClick={() => navigate('/community')}>
          <ArrowLeft size={14} /> Back to Community
        </button>
      </div>
    );
  }

  return (
    <div className="community-detail">
      <button className="btn btn--ghost community-back" onClick={() => navigate('/community')}>
        <ArrowLeft size={14} /> Back to Community
      </button>

      <div className="community-detail-header">
        <div className="community-detail-info">
          <div className="community-detail-meta">
            <span className={`color-badge color-badge--${repertoire.color?.toLowerCase()}`}>
              {repertoire.color}
            </span>
            <span className="community-detail-lines">
              <BookOpen size={14} /> {repertoire.lines?.length || 0} lines
            </span>
            <span className="community-detail-bookmarks">
              <Bookmark size={14} /> {repertoire.bookmarkCount || 0} bookmarks
            </span>
          </div>
          <h1 className="community-detail-title">{repertoire.name}</h1>
          {repertoire.description && (
            <p className="community-detail-desc">{repertoire.description}</p>
          )}
          <div className="community-detail-author">
            <User size={14} />
            <span>by {repertoire.author?.username || repertoire.author?.chessComUsername}</span>
          </div>
        </div>

        {!repertoire.isOwner && (
          <div className="community-detail-actions">
            <button
              className={`btn ${repertoire.isBookmarked ? 'btn--accent' : 'btn--ghost'}`}
              onClick={handleBookmarkToggle}
            >
              {repertoire.isBookmarked
                ? <><BookmarkCheck size={15} /> Bookmarked</>
                : <><Bookmark size={15} /> Bookmark</>
              }
            </button>
            <button
              className="btn btn--primary"
              onClick={handleCopy}
              disabled={copying}
            >
              <Copy size={15} /> {copying ? 'Copying…' : 'Copy to My Repertoires'}
            </button>
          </div>
        )}
      </div>

      {/* Lines list */}
      <div className="community-lines">
        <h2 className="community-lines-title">Lines ({repertoire.lines?.length || 0})</h2>
        {repertoire.lines?.length === 0 ? (
          <p className="community-lines-empty">This repertoire has no lines yet.</p>
        ) : (
          <div className="community-lines-list">
            {repertoire.lines?.map((line) => (
              <div key={line.id} className="community-line-card">
                <div className="community-line-header">
                  <h3 className="community-line-name">{line.lineName}</h3>
                  <span className="community-line-moves">{line.moveCount} moves</span>
                </div>
                <div className="community-line-pgn">{line.pgn}</div>
                {line.notes && (
                  <p className="community-line-notes">{line.notes}</p>
                )}
                {line.opening && (
                  <span className="community-line-opening">
                    {line.opening.ecoCode} — {line.opening.name}
                    {line.opening.variation && `: ${line.opening.variation}`}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}