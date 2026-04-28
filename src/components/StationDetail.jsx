import React from 'react';
import { useStore, useReportStore } from '../store/useStore';

export default function StationDetail() {
  const selectedStation = useStore((state) => state.selectedStation);
  const setSelectedStation = useStore((state) => state.setSelectedStation);
  const stationReports = useReportStore((state) => state.stationReports);
  const submitReport = useReportStore((state) => state.submitReport);
  const reportedByMe = useReportStore((state) => state.reportedByMe);

  if (!selectedStation) return null;

  const info = selectedStation.AddressInfo;
  const reports = stationReports[selectedStation.ID] || { broken: { count: 0 }, works: { count: 0 } };
  const myVote = reportedByMe[selectedStation.ID];

  const brokenCount = reports.broken?.count || 0;
  const worksCount = reports.works?.count || 0;
  const totalVotes = brokenCount + worksCount;
  const worksPercent = totalVotes > 0 ? Math.round((worksCount / totalVotes) * 100) : 0;
  const brokenPercent = totalVotes > 0 ? Math.round((brokenCount / totalVotes) * 100) : 0;

  const getConnectors = () => {
    if (!selectedStation.Connections) return ['Unknown'];
    const unique = [...new Set(selectedStation.Connections.map(c => c.ConnectionType?.Title || 'Unknown'))];
    return unique;
  };

  const getPower = () => {
    if (!selectedStation.Connections) return ['Unknown'];
    const powers = selectedStation.Connections.map(c => c.PowerKW).filter(p => p);
    if (powers.length === 0) return ['Unknown'];
    return [...new Set(powers)].map(p => `${p} kW`);
  };

  const getConnectorCount = () => {
    return selectedStation.Connections?.length || 0;
  };

  const rawStatus = selectedStation.StatusType?.Title || 'Operational';
  const isOperational = rawStatus.toLowerCase().includes('operational') || rawStatus.toLowerCase().includes('available');
  const isUnknown = rawStatus.toLowerCase().includes('unknown');
  const statusColor = isOperational ? { bg: '#dcfce7', text: '#16a34a', dot: '#22c55e' }
    : isUnknown ? { bg: '#fef9c3', text: '#ca8a04', dot: '#eab308' }
    : { bg: '#fee2e2', text: '#dc2626', dot: '#ef4444' };

  const operator = selectedStation.OperatorInfo?.Title || 'Unknown Operator';
  const usage = selectedStation.UsageType?.Title || 'Unknown';

  return (
    <>
      {/* Backdrop blur overlay on mobile */}
      <div
        className="fixed inset-0 z-[999] md:hidden"
        style={{ background: 'rgba(15,23,42,0.35)', backdropFilter: 'blur(2px)' }}
        onClick={() => setSelectedStation(null)}
      />

      <div
        className="fixed bottom-0 left-0 right-0 z-[1000] md:bottom-6 md:right-6 md:left-auto md:top-auto md:w-[420px] rounded"
        style={{ animation: 'slideUpIn 0.32s cubic-bezier(0.32,0.72,0,1) both' }}
      >
        <div
          style={{
            background: '#ffffff',
            borderRadius: '28px',
            boxShadow: '0 -4px 60px rgba(0,0,0,0.13), 0 0 0 1px rgba(148,163,184,0.12)',
            display: 'flex',
            flexDirection: 'column',
            height: 'auto',
            maxHeight: 'calc(100vh - 120px)',
            overflow: 'hidden',
          }}
          className="md:rounded-[32px]"
        >

          {/* ─── Hero Header ─── */}
          <div style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #0e7490 100%)',
            padding: '24px 24px 20px',
            position: 'relative',
            overflow: 'hidden',
            flexShrink: 0,
          }}>
            {/* Decorative circles */}
            <div style={{
              position: 'absolute', top: -40, right: -40,
              width: 160, height: 160, borderRadius: '50%',
              background: 'rgba(14,116,144,0.25)',
            }} />
            <div style={{
              position: 'absolute', bottom: -20, left: -20,
              width: 100, height: 100, borderRadius: '50%',
              background: 'rgba(255,255,255,0.05)',
            }} />

            {/* Close button */}
            <button
              onClick={() => setSelectedStation(null)}
              style={{
                position: 'absolute', top: 16, right: 16,
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.2s',
                zIndex: 2,
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>

            {/* EV bolt icon */}
            <div style={{
              width: 44, height: 44, borderRadius: 14,
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 14, zIndex: 2, position: 'relative',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7dd3fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
            </div>

            <h2 style={{
              color: '#f8fafc', fontSize: 18, fontWeight: 800,
              lineHeight: 1.3, margin: '0 0 12px', maxWidth: '85%',
              position: 'relative', zIndex: 2,
            }}>
              {info.Title}
            </h2>

            {/* Status pill */}
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 12px', borderRadius: 100,
              background: statusColor.bg, color: statusColor.text,
              fontSize: 11, fontWeight: 800, letterSpacing: '0.08em',
              textTransform: 'uppercase', position: 'relative', zIndex: 2,
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: statusColor.dot,
                boxShadow: `0 0 6px ${statusColor.dot}`,
                display: 'inline-block',
                animation: isOperational ? 'pulse 2s ease-in-out infinite' : 'none',
              }} />
              {rawStatus}
            </span>
          </div>

          {/* ─── Scrollable Body ─── */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 24px' }}>

            {/* Address */}
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              background: '#f8fafc', borderRadius: 16, padding: '14px 16px',
              marginBottom: 16, border: '1px solid #e2e8f0',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: '#fee2e2', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="#ef4444">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', lineHeight: 1.4 }}>
                  {info.AddressLine1 || 'N/A'}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 3, fontWeight: 500 }}>
                  {info.Town}{info.Postcode ? ` · ${info.Postcode}` : ''}
                </div>
              </div>
            </div>

            {/* Info chips grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <InfoChip
                icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>}
                iconBg="#eef2ff"
                label="Operator"
                value={operator}
              />
              <InfoChip
                icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>}
                iconBg="#fffbeb"
                label="Usage"
                value={usage}
              />
            </div>

            {/* Connectors & Power */}
            <div style={{ marginBottom: 20 }}>
              <SectionLabel>Charging Details</SectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
                {/* Connectors */}
                <div style={{
                  background: '#f8fafc', borderRadius: 16, padding: '14px',
                  border: '1px solid #e2e8f0',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: '#fff1f2', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 7H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h3"/><rect x="6" y="3" width="12" height="18" rx="2"/><path d="M18 7h3a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-3"/>
                      </svg>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      {getConnectorCount()} Connector{getConnectorCount() !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {getConnectors().map((c, i) => (
                    <div key={i} style={{
                      fontSize: 20, fontWeight: 900, color: '#1e293b',
                      lineHeight: 1.2, marginTop: i > 0 ? 6 : 0,
                    }}>{c}</div>
                  ))}
                </div>

                {/* Power */}
                <div style={{
                  background: '#f8fafc', borderRadius: 16, padding: '14px',
                  border: '1px solid #e2e8f0',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                      </svg>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      Power Output
                    </span>
                  </div>
                  {getPower().map((p, i) => (
                    <div key={i} style={{
                      fontSize: 20, fontWeight: 900, color: '#1e293b',
                      lineHeight: 1.2, marginTop: i > 0 ? 6 : 0,
                    }}>{p}</div>
                  ))}
                </div>
              </div>
            </div>

            {/* Community Reports */}
            {import.meta.env.VITE_ENABLE_REPORTS !== 'false' && (
              <div>
                {/* Divider */}
                <div style={{ height: 1, background: '#f1f5f9', margin: '4px 0 20px' }} />

                <SectionLabel>
                  <span style={{ marginRight: 6 }}>🗳️</span>Community Reports
                </SectionLabel>

                {/* Vote bar */}
                {totalVotes > 0 && (
                  <div style={{ margin: '14px 0 12px' }}>
                    <div style={{
                      height: 8, borderRadius: 100, overflow: 'hidden',
                      background: '#fee2e2', display: 'flex',
                    }}>
                      <div style={{
                        width: `${worksPercent}%`, background: 'linear-gradient(90deg,#22c55e,#4ade80)',
                        borderRadius: 100, transition: 'width 0.6s ease',
                      }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#22c55e' }}>✓ {worksPercent}% works</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444' }}>{brokenPercent}% broken ✗</span>
                    </div>
                  </div>
                )}

                {/* Count cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                  <VoteCountCard count={brokenCount} label="Broken" color="#ef4444" bg="#fff1f2" border="#fecaca" />
                  <VoteCountCard count={worksCount} label="Works" color="#22c55e" bg="#f0fdf4" border="#bbf7d0" />
                </div>

                {/* Action buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <VoteButton
                    onClick={() => submitReport(selectedStation.ID, 'broken')}
                    active={myVote === 'broken'}
                    activeStyle={{ background: 'linear-gradient(135deg,#ef4444,#f87171)', color: '#fff', boxShadow: '0 4px 16px rgba(239,68,68,0.35)' }}
                    inactiveStyle={{ background: '#fff1f2', color: '#ef4444', border: '1.5px solid #fecaca' }}
                    icon="✗"
                    label="Report Broken"
                  />
                  <VoteButton
                    onClick={() => submitReport(selectedStation.ID, 'works')}
                    active={myVote === 'works'}
                    activeStyle={{ background: 'linear-gradient(135deg,#22c55e,#4ade80)', color: '#fff', boxShadow: '0 4px 16px rgba(34,197,94,0.35)' }}
                    inactiveStyle={{ background: '#f0fdf4', color: '#22c55e', border: '1.5px solid #bbf7d0' }}
                    icon="✓"
                    label="It Works!"
                  />
                </div>

                {myVote && (
                  <div style={{
                    marginTop: 12, textAlign: 'center',
                    fontSize: 12, color: '#94a3b8', fontWeight: 600,
                  }}>
                    You reported this station as <strong style={{ color: myVote === 'works' ? '#22c55e' : '#ef4444' }}>{myVote === 'works' ? 'working ✓' : 'broken ✗'}</strong>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideUpIn {
          from { transform: translateY(60px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @media (min-width: 768px) {
          [data-station-panel] {
            animation: slideRightIn 0.32s cubic-bezier(0.32,0.72,0,1) both !important;
          }
        }
        @keyframes slideRightIn {
          from { transform: translateX(40px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </>
  );
}

/* ── Sub-components ── */

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 900, color: '#94a3b8',
      letterSpacing: '0.1em', textTransform: 'uppercase',
      display: 'flex', alignItems: 'center',
    }}>
      {children}
    </div>
  );
}

function InfoChip({ icon, iconBg, label, value }) {
  return (
    <div style={{
      background: '#f8fafc', borderRadius: 16, padding: '14px',
      border: '1px solid #e2e8f0',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {icon}
        </div>
        <span style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', lineHeight: 1.4 }}>{value}</div>
    </div>
  );
}

function VoteCountCard({ count, label, color, bg, border }) {
  return (
    <div style={{
      background: bg, border: `1.5px solid ${border}`,
      borderRadius: 16, padding: '16px 12px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 36, fontWeight: 900, color, lineHeight: 1, marginBottom: 4 }}>
        {count}
      </div>
      <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        {label}
      </div>
    </div>
  );
}

function VoteButton({ onClick, active, activeStyle, inactiveStyle, icon, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '13px 10px',
        borderRadius: 14,
        fontWeight: 800,
        fontSize: 13,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        border: 'none',
        transition: 'all 0.2s ease',
        ...(active ? activeStyle : inactiveStyle),
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.opacity = '0.8'; }}
      onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
    >
      <span style={{ fontSize: 15 }}>{icon}</span>
      {label}
    </button>
  );
}
