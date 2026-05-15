import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import './Auth.css';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      console.log('AuthCallback: checking session...');
      console.log('AuthCallback: current URL hash:', window.location.hash);

      const { data: { session }, error } = await supabase.auth.getSession();

      console.log('AuthCallback: session:', session ? 'found' : 'none');
      if (error) console.error('AuthCallback: error:', error);

      if (error) {
        navigate('/login');
        return;
      }

      if (session) {
        navigate('/');
      } else {
        // Wait a moment — Supabase might still be processing the hash
        setTimeout(async () => {
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          console.log('AuthCallback retry: session:', retrySession ? 'found' : 'none');
          if (retrySession) {
            navigate('/');
          } else {
            navigate('/login');
          }
        }, 1000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div className="auth-logo">
          <span className="auth-logo-icon">♞</span>
          <span className="auth-logo-text">KlaroChess</span>
        </div>
        <p className="auth-subtitle">Completing sign in…</p>
        <div className="loading-spinner" />
      </div>
    </div>
  );
}