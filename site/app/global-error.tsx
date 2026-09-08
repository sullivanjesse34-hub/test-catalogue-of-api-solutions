'use client';

// Replaces the whole document when the root layout itself throws, so it needs
// its own <html>/<body> and cannot rely on globals.css being applied.
export default function GlobalError({reset}: {reset: () => void}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
        <div style={{textAlign: 'center', padding: 24}}>
          <h1 style={{fontSize: 24, margin: '0 0 8px'}}>
            Something went wrong
          </h1>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 16,
              padding: '10px 18px',
              fontSize: 14,
              fontWeight: 600,
              color: '#fff',
              background: '#0668e1',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
            }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
