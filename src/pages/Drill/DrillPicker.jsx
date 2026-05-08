import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { repertoireApi } from '../../services/api';
import { Crosshair, BookOpen, Zap } from 'lucide-react';

export default function DrillPicker() {
  const [repertoires, setRepertoires] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await repertoireApi.list();
        setRepertoires(res.data);
      } catch (err) {
        console.error('Failed to load repertoires', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div style={styles.loading}>
        <div className="loading-spinner" />
        <span>Loading repertoires…</span>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <Zap size={22} style={{ color: 'var(--accent)' }} />
        <div>
          <h1 style={styles.title}>Drill</h1>
          <p style={styles.subtitle}>Pick a repertoire to practice</p>
        </div>
      </div>

      {repertoires.length === 0 ? (
        <div style={styles.empty}>
          <BookOpen size={40} strokeWidth={1} style={{ color: 'var(--text-tertiary)' }} />
          <h3 style={{ margin: '12px 0 4px', fontSize: 16 }}>No repertoires yet</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>
            Create a repertoire and add lines before you can drill.
          </p>
          <button
            onClick={() => navigate('/repertoire')}
            style={styles.btnPrimary}
          >
            Go to Repertoire
          </button>
        </div>
      ) : (
        <div style={styles.grid}>
          {repertoires.map((rep) => {
            const lineCount = rep.lineCount ?? 0;
            const canDrill = lineCount > 0;

            return (
              <button
                key={rep.id}
                style={{
                  ...styles.card,
                  opacity: canDrill ? 1 : 0.5,
                  cursor: canDrill ? 'pointer' : 'not-allowed',
                }}
                onClick={() => canDrill && navigate(`/repertoire/${rep.id}/drill`)}
                disabled={!canDrill}
              >
                <div style={styles.cardTop}>
                  <span style={{
                    ...styles.colorDot,
                    background: rep.color === 'WHITE' ? '#f0eeea' : '#2a2926',
                    border: rep.color === 'WHITE' ? '1.5px solid #c8c5be' : '1.5px solid #4a4843',
                  }} />
                  <span style={styles.colorLabel}>{rep.color}</span>
                </div>
                <span style={styles.cardName}>{rep.name}</span>
                <span style={styles.cardLines}>{lineCount} lines</span>
                <div style={styles.cardAction}>
                  <Crosshair size={14} />
                  <span>{canDrill ? 'Start Drill' : 'No lines yet'}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    maxWidth: 700,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: 600,
    letterSpacing: '-0.03em',
    margin: 0,
    color: 'var(--text-primary)',
  },
  subtitle: {
    fontSize: 14,
    color: 'var(--text-secondary)',
    margin: '2pxn 0 0',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 12,
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: 18,
    background: 'var(--bg-elevated, var(--bg-primary))',
    border: '1px solid var(--border-light)',
    borderRadius: 12,
    textAlign: 'left',
    fontFamily: 'inherit',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  cardTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    display: 'inline-block',
  },
  colorLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
  },
  cardName: {
    fontSize: 15,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  cardLines: {
    fontSize: 12,
    color: 'var(--text-tertiary)',
  },
  cardAction: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 10,
    borderTop: '1px solid var(--border-light)',
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--accent)',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 40px',
    textAlign: 'center',
  },
  btnPrimary: {
    marginTop: 16,
    padding: '9px 18px',
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    fontFamily: 'inherit',
    fontWeight: 500,
    cursor: 'pointer',
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '60vh',
    gap: 16,
    color: 'var(--text-tertiary)',
    fontSize: 14,
  },
};