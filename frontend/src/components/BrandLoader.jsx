export default function BrandLoader({ label = 'Loading 44Gen', fullScreen = false, tone = 'dark', size = 48 }) {
  const dark = tone === 'dark'
  const shellStyle = fullScreen
    ? {
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: dark
          ? 'radial-gradient(circle at 50% 42%, rgba(115,216,255,0.12), transparent 22rem), #0b0d10'
          : 'radial-gradient(circle at 50% 42%, rgba(14,165,233,0.10), transparent 22rem), #f6f8fb',
        color: dark ? '#f6f7fb' : '#101827'
      }
    : { display: 'inline-grid', placeItems: 'center', gap: 8, color: dark ? '#f6f7fb' : '#101827' }

  return (
    <div className={fullScreen ? 'brand-loader-screen' : 'brand-loader-inline'} style={shellStyle} role="status" aria-live="polite" aria-label={label}>
      <div style={{ display: 'grid', placeItems: 'center', gap: fullScreen ? 12 : 7 }}>
        <div className="brand-loader-mark" style={{ width: size, height: size, borderRadius: Math.max(10, size * 0.3) }}>
          <span style={{ fontSize: Math.max(12, size * 0.36) }}>44</span>
        </div>
        {label && <div style={{ fontSize: fullScreen ? 12 : 11, color: dark ? 'rgba(246,247,251,0.58)' : '#667085', fontWeight: 750 }}>{label}</div>}
      </div>
      <style>{`
        .brand-loader-mark {
          position: relative;
          display: grid;
          place-items: center;
          color: #f6f7fb;
          background:
            linear-gradient(#111820, #111820) padding-box,
            conic-gradient(from var(--loader-angle), #73d8ff, #7df1c7, #ffca7a, #ff8fb3, #73d8ff) border-box;
          border: 1.5px solid transparent;
          box-shadow: 0 16px 40px rgba(115,216,255,0.20), inset 0 1px 0 rgba(255,255,255,0.10);
          animation: brandLoaderSpin 1.8s linear infinite, brandLoaderPulse 1.8s ease-in-out infinite;
        }
        .brand-loader-mark span {
          position: relative;
          z-index: 1;
          font-weight: 950;
          letter-spacing: -0.08em;
          transform: translateX(-0.04em);
        }
        .brand-loader-mark::after {
          content: '';
          position: absolute;
          inset: 8%;
          border-radius: inherit;
          background: radial-gradient(circle at 30% 20%, rgba(255,255,255,0.10), transparent 45%);
          pointer-events: none;
        }
        @property --loader-angle {
          syntax: '<angle>';
          inherits: false;
          initial-value: 0deg;
        }
        @keyframes brandLoaderSpin {
          to { --loader-angle: 360deg; }
        }
        @keyframes brandLoaderPulse {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-2px) scale(1.035); }
        }
        @media (prefers-reduced-motion: reduce) {
          .brand-loader-mark { animation: none; }
        }
      `}</style>
    </div>
  )
}
