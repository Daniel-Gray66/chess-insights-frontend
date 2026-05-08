import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Trophy, TrendingUp, Target, Crosshair, ChevronDown, ChevronUp } from 'lucide-react';
import { statsApi } from '../../services/api';
import FilterBar from '../../components/common/FilterBar';
import StatCard from '../../components/common/StatCard';
import WinRateBar, { WinRateLegend } from '../../components/common/WinRateBar';
import './Dashboard.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

export default function Dashboard() {
  const [filters, setFilters] = useState({
    timeRange: 'all',
    color: null,
    timeClass: null,
  });

  const [overview, setOverview] = useState(null);
  const [colorStats, setColorStats] = useState(null);
  const [ratingData, setRatingData] = useState(null);
  const [openings, setOpenings] = useState(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const [openingsExpanded, setOpeningsExpanded] = useState(false);
  const contentRef = useRef(null);

  const fetchData = useCallback(async () => {
    if (!initialLoad) setTransitioning(true);

    try {
      const [overviewRes, colorRes, ratingRes, openingsRes] = await Promise.all([
        statsApi.getOverview(filters),
        statsApi.getWinRatesByColor(filters),
        statsApi.getRatingProgression(filters),
        statsApi.getOpenings(filters),
      ]);

      setOverview(overviewRes.data);
      setColorStats(colorRes.data);
      setRatingData(ratingRes.data);
      setOpenings(openingsRes.data);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setInitialLoad(false);
      setTimeout(() => setTransitioning(false), 50);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset openings expansion when filters change
  useEffect(() => {
    setOpeningsExpanded(false);
  }, [filters]);

  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 600, easing: 'easeOutQuart' },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: isDark ? '#2a2a28' : '#ffffff',
        titleColor: isDark ? '#9c9a92' : '#6b6a65',
        bodyColor: isDark ? '#e8e6df' : '#1a1a18',
        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: { label: (ctx) => `Rating: ${ctx.raw}` },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: isDark ? '#6b6a65' : '#9c9a92', font: { size: 11, family: 'DM Sans' }, maxTicksLimit: 12 },
        border: { display: false },
      },
      y: {
        grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' },
        ticks: { color: isDark ? '#6b6a65' : '#9c9a92', font: { size: 11, family: 'DM Sans' } },
        border: { display: false },
      },
    },
    interaction: { intersect: false, mode: 'index' },
  };

  const getWinRatePill = (pct) => {
    if (pct >= 55) return 'pill pill--win';
    if (pct >= 45) return 'pill pill--draw';
    return 'pill pill--loss';
  };

  // ── Derived stats ──────────────────────────────────────

  const totalGames = overview?.totalGames ?? 0;
  const overall = overview?.overall ?? {};
  const wins = overall.wins ?? 0;
  const losses = overall.losses ?? 0;
  const draws = overall.draws ?? 0;
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

  const latestRating = ratingData && ratingData.length > 0
    ? ratingData[ratingData.length - 1].rating : null;

  const ratingChange = ratingData && ratingData.length > 1
    ? ratingData[ratingData.length - 1].rating - ratingData[0].rating : null;

  // Average accuracy from overview
  const avgAccuracy = overview?.avgAccuracy ?? null;

  // Best win streak from rating data (consecutive rating increases)
  const bestStreak = (() => {
    if (!ratingData || ratingData.length < 2) return null;
    let max = 0, current = 0;
    for (let i = 1; i < ratingData.length; i++) {
      if (ratingData[i].rating > ratingData[i - 1].rating) {
        current++;
        max = Math.max(max, current);
      } else {
        current = 0;
      }
    }
    return max > 0 ? max : null;
  })();

  // Peak rating
  const peakRating = ratingData && ratingData.length > 0
    ? Math.max(...ratingData.map(d => d.rating)) : null;

  // Chart data
  const chartData = ratingData && ratingData.length > 0 ? {
    labels: ratingData.map((d) => {
      const date = new Date(d.playedAt);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }),
    datasets: [{
      data: ratingData.map((d) => d.rating),
      borderColor: '#378ADD',
      backgroundColor: 'rgba(55, 138, 221, 0.06)',
      fill: true, tension: 0.3, pointRadius: 0, pointHitRadius: 8, borderWidth: 2,
    }],
  } : null;

  const rangeLabel = {
    '7d': 'Last 7 days', '30d': 'Last 30 days', '90d': 'Last 90 days',
    '1y': 'Last year', 'all': 'All time',
  }[filters.timeRange] || 'All time';

  // Openings display
  const displayedOpenings = openings
    ? (openingsExpanded ? openings : openings.slice(0, 8))
    : [];
  const hasMoreOpenings = openings && openings.length > 8;

  if (initialLoad) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner" />
        <span>Loading your stats...</span>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Dashboard</h1>
      </div>

      <FilterBar filters={filters} onChange={setFilters} />

      <div
        ref={contentRef}
        style={{
          opacity: transitioning ? 0.4 : 1,
          transform: transitioning ? 'translateY(4px)' : 'translateY(0)',
          transition: 'opacity 0.25s ease, transform 0.25s ease',
          pointerEvents: transitioning ? 'none' : 'auto',
        }}
      >
        {/* Primary stat cards */}
        <div className="stat-grid">
          <StatCard
            label="Total games"
            value={totalGames.toLocaleString()}
            sub={rangeLabel}
            icon={Crosshair}
          />
          <StatCard
            label="Win rate"
            value={`${winRate}%`}
            sub={`${wins}W / ${losses}L / ${draws}D`}
            color="var(--win)"
            icon={Trophy}
          />
          <StatCard
            label="Current rating"
            value={latestRating ? latestRating.toLocaleString() : '—'}
            sub={ratingChange != null ? (
              <span style={{ color: ratingChange >= 0 ? 'var(--win)' : 'var(--loss)' }}>
                {ratingChange >= 0 ? '↑' : '↓'} {Math.abs(ratingChange)} {rangeLabel.toLowerCase()}
              </span>
            ) : ''}
            icon={TrendingUp}
          />
          <StatCard
            label="Avg accuracy"
            value={avgAccuracy != null ? `${Math.round(avgAccuracy * 10) / 10}%` : '—'}
            sub={filters.timeClass ?? 'All time controls'}
            icon={Target}
          />
        </div>

        {/* Secondary stats row */}
        <div className="stat-grid stat-grid--secondary">
          <div className="mini-stat">
            <span className="mini-stat-label">Peak rating</span>
            <span className="mini-stat-value">{peakRating ?? '—'}</span>
          </div>
          <div className="mini-stat">
            <span className="mini-stat-label">Best streak</span>
            <span className="mini-stat-value">{bestStreak ? `${bestStreak} wins` : '—'}</span>
          </div>
          <div className="mini-stat">
            <span className="mini-stat-label">Draw rate</span>
            <span className="mini-stat-value">
              {totalGames > 0 ? `${Math.round((draws / totalGames) * 100)}%` : '—'}
            </span>
          </div>
          <div className="mini-stat">
            <span className="mini-stat-label">Avg opponent</span>
            <span className="mini-stat-value">
              {overview?.avgOpponentRating ? Math.round(overview.avgOpponentRating) : '—'}
            </span>
          </div>
        </div>

        {/* Win rates + Rating chart row */}
        <div className="dashboard-row">
          <div className="card">
            <h2 className="card-title">Win rate by color</h2>
            {colorStats && (
              <>
                <WinRateBar label="White"
                  wins={colorStats.white?.win ?? 0}
                  draws={colorStats.white?.draw ?? 0}
                  losses={colorStats.white?.loss ?? 0} />
                <WinRateBar label="Black"
                  wins={colorStats.black?.win ?? 0}
                  draws={colorStats.black?.draw ?? 0}
                  losses={colorStats.black?.loss ?? 0} />
                <WinRateLegend />
              </>
            )}
          </div>

          <div className="card card--wide">
            <h2 className="card-title">Rating progression</h2>
            <div className="chart-container">
              {chartData ? (
                <Line data={chartData} options={chartOptions} />
              ) : (
                <p style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>
                  No rating data for this period
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Top openings - expandable */}
        <div className="card">
          <div className="card-header-row">
            <h2 className="card-title" style={{ marginBottom: 0 }}>Top openings</h2>
            <span className="opening-count">
              {openings ? `${openings.length} openings played` : ''}
            </span>
          </div>

          <div className="openings-table">
            <div className="openings-header">
              <span className="op-col op-col--eco">ECO</span>
              <span className="op-col op-col--name">Opening</span>
              <span className="op-col op-col--games">Games</span>
              <span className="op-col op-col--wr">Win %</span>
              <span className="op-col op-col--record">Record</span>
            </div>

            {displayedOpenings.map((op, i) => {
              const opWins = op.wins ?? 0;
              const opDraws = op.draws ?? 0;
              const opLosses = op.losses ?? 0;
              const total = opWins + opDraws + opLosses;
              const winPct = total > 0 ? Math.round((opWins / total) * 100) : 0;
              const name = op.opening ?? op.openingName ?? '';
              const eco = op.ecoCode ?? '';

              return (
                <div className="openings-row" key={i} style={{
                  animationDelay: `${i * 30}ms`,
                  animation: 'fadeInRow 0.3s ease forwards',
                  opacity: 0,
                }}>
                  <span className="op-col op-col--eco">
                    <code>{eco}</code>
                  </span>
                  <span className="op-col op-col--name" title={name}>{name}</span>
                  <span className="op-col op-col--games">{total}</span>
                  <span className="op-col op-col--wr">
                    <span className={getWinRatePill(winPct)}>{winPct}%</span>
                  </span>
                  <span className="op-col op-col--record">
                    <span className="record-text">
                      <span style={{ color: 'var(--win)' }}>{opWins}W</span>
                      {' / '}
                      <span style={{ color: 'var(--loss)' }}>{opLosses}L</span>
                      {opDraws > 0 && (
                        <>
                          {' / '}
                          <span style={{ color: 'var(--draw)' }}>{opDraws}D</span>
                        </>
                      )}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>

          {hasMoreOpenings && (
            <button
              className="show-more-btn"
              onClick={() => setOpeningsExpanded(!openingsExpanded)}
            >
              {openingsExpanded ? (
                <>Show less <ChevronUp size={14} /></>
              ) : (
                <>Show all {openings.length} openings <ChevronDown size={14} /></>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}