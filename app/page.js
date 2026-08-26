'use client';

import {useEffect, useState} from 'react';

export default function Home() {
  const [count, setCount] = useState(0);
  const [href, setHref] = useState('');

  useEffect(() => setHref(window.location.href), []);

  return (
    <main style={{
      maxWidth: 560, padding: '40px 32px', background: '#fff',
      border: '1px solid #e5ebf0', borderRadius: 12,
    }}>
      <p style={{margin: '0 0 8px', fontSize: 12, fontWeight: 600, color: '#0668e1'}}>
        DEPLOYMENT TEST
      </p>
      <h1 style={{margin: '0 0 12px', fontSize: 28}}>This is a test.</h1>
      <p style={{margin: '0 0 24px', fontSize: 16, lineHeight: 1.5, color: '#53606a'}}>
        A throwaway Next.js app proving the GitHub Pages pipeline: static export,
        subpath routing, and deployment from Actions. Nothing here is part of the
        catalogue.
      </p>
      <button
        onClick={() => setCount(c => c + 1)}
        style={{
          padding: '12px 20px', fontSize: 15, fontWeight: 600, color: '#fff',
          background: '#0668e1', border: 'none', borderRadius: 8, cursor: 'pointer',
        }}>
        Clicked {count} {count === 1 ? 'time' : 'times'}
      </button>
      <p style={{margin: '24px 0 0', fontSize: 13, color: '#677682'}}>
        If that button counts up, React hydrated correctly on a static host.
      </p>
      <p style={{margin: '16px 0 0', fontSize: 12, fontFamily: 'monospace', color: '#8594a2', wordBreak: 'break-all'}}>
        {href || 'resolving URL…'}
      </p>
    </main>
  );
}
