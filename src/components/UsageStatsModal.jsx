import React, { useState, useRef, useEffect } from 'react';
import { BarChart3, Trash2, Calendar, Award } from 'lucide-react';
import { getUsageHistory, clearUsageHistory } from '../utils/storage';

export default function UsageStatsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [usageData, setUsageData] = useState([]);
  const dropdownRef = useRef(null);

  // Load usage data when opened
  useEffect(() => {
    if (isOpen) {
      setUsageData(getUsageHistory());
    }
  }, [isOpen]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset your local usage history? This will clear token stats on this device.")) {
      clearUsageHistory();
      setUsageData([]);
    }
  };

  // Calculations helper
  const getStats = () => {
    const today = new Date().toDateString();
    
    let tokensToday = 0;
    let costToday = 0;
    let tokensAllTime = 0;
    let costAllTime = 0;

    // Stats by provider
    const providers = {
      gemini: { tokens: 0, cost: 0 },
      openai: { tokens: 0, cost: 0 },
      anthropic: { tokens: 0, cost: 0 }
    };

    usageData.forEach((record) => {
      const recordTokens = (record.inputTokens || 0) + (record.outputTokens || 0);
      const recordCost = record.cost || 0;
      const recordProvider = record.provider || 'gemini';

      // All time
      tokensAllTime += recordTokens;
      costAllTime += recordCost;

      // Provider totals
      if (providers[recordProvider]) {
        providers[recordProvider].tokens += recordTokens;
        providers[recordProvider].cost += recordCost;
      }

      // Today
      const recordDate = new Date(record.timestamp).toDateString();
      if (recordDate === today) {
        tokensToday += recordTokens;
        costToday += recordCost;
      }
    });

    return {
      today: { tokens: tokensToday, cost: costToday },
      allTime: { tokens: tokensAllTime, cost: costAllTime },
      providers
    };
  };

  const stats = getStats();
  const formatCost = (val) => {
    if (val === 0) return '$0.00';
    if (val < 0.01) return `$${val.toFixed(5)}`;
    return `$${val.toFixed(3)}`;
  };

  const formatTokens = (val) => {
    return val.toLocaleString();
  };

  return (
    <div className="settings-control" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="settings-btn"
        title="Token Usage & Cost Statistics"
        style={{ transition: 'all 0.2s ease' }}
      >
        <BarChart3 size={20} />
      </button>

      {isOpen && (
        <div className="settings-dropdown" style={{ width: '320px', minHeight: '280px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <BarChart3 size={16} style={{ color: 'var(--accent)' }} />
              Usage Statistics
            </h4>
            {usageData.length > 0 && (
              <button
                onClick={handleReset}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: '4px',
                  transition: 'color 0.2s'
                }}
                title="Reset Stats"
                onMouseEnter={(e) => e.currentTarget.style.color = '#d9383a'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
          
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '4px 0 12px 0' }}>
            Costs are estimated based on public API token pricing.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Today Block */}
            <div style={{
              background: 'var(--accent-light)',
              border: '1px solid var(--accent-border)',
              borderRadius: '12px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: '600', color: 'var(--accent)' }}>
                <span>TODAY</span>
                <Calendar size={14} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>Tokens Used</span>
                <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                  {formatTokens(stats.today.tokens)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>Estimated Cost</span>
                <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                  {formatCost(stats.today.cost)}
                </span>
              </div>
            </div>

            {/* All Time Block */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--card-border)',
              borderRadius: '12px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                <span>ALL TIME</span>
                <Award size={14} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>Tokens Used</span>
                <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                  {formatTokens(stats.allTime.tokens)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>Estimated Cost</span>
                <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                  {formatCost(stats.allTime.cost)}
                </span>
              </div>
            </div>

            {/* Provider Breakdowns */}
            {usageData.length > 0 && (
              <div style={{ marginTop: '4px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  BY PROVIDER
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {Object.entries(stats.providers).map(([providerName, data]) => {
                    if (data.tokens === 0) return null;
                    return (
                      <div 
                        key={providerName} 
                        style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          fontSize: '0.8rem',
                          paddingBottom: '4px',
                          borderBottom: '1px dashed var(--card-border)'
                        }}
                      >
                        <span style={{ textTransform: 'capitalize', color: 'var(--text-secondary)' }}>{providerName}</span>
                        <span style={{ color: 'var(--text-primary)' }}>
                          {formatTokens(data.tokens)} ({formatCost(data.cost)})
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {usageData.length === 0 && (
              <div style={{ textAlign: 'center', padding: '12px 0', fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                No usage history logged yet.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
