import React from 'react';
import { Eraser, RefreshCw } from 'lucide-react';
import WittyTooltip from './WittyTooltip';

/**
 * Modular Widget Card component with per-widget erase and refresh actions.
 * 
 * @param {string} title - The display title of the widget
 * @param {React.ReactNode} icon - The Lucide icon to display next to the title
 * @param {Array<string>} items - The list of one-liner strings
 * @param {string} emptyText - Text to show when list is empty
 * @param {Function} onErase - Callback to erase widget items
 * @param {Function} onRefresh - Callback to refresh widget items
 * @param {boolean} isLoading - Loading state for this specific widget
 */
export default function Widget({ 
  title, 
  icon, 
  items = [], 
  emptyText = "Reflection will populate this area.",
  onErase,
  onRefresh,
  isLoading
}) {
  return (
    <div className="widget-card">
      <div className="widget-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="widget-icon">{icon}</div>
          <h3 className="widget-title">{title}</h3>
          <WittyTooltip section={title} />
        </div>
        
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {onErase && items.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onErase();
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px',
                borderRadius: '4px',
                transition: 'all 0.2s'
              }}
              title={`Erase ${title}`}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#d9383a';
                e.currentTarget.style.backgroundColor = 'rgba(217, 56, 58, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Eraser size={13} />
            </button>
          )}
          
          {onRefresh && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRefresh();
              }}
              disabled={isLoading}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px',
                borderRadius: '4px',
                transition: 'all 0.2s',
                opacity: isLoading ? 0.6 : 1
              }}
              title={`Refresh ${title}`}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.color = 'var(--accent)';
                  e.currentTarget.style.backgroundColor = 'var(--accent-light)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <RefreshCw size={13} className={isLoading ? 'spinner' : ''} />
            </button>
          )}
        </div>
      </div>
      
      <div className="widget-body">
        {items.length === 0 ? (
          <p className="widget-empty">{emptyText}</p>
        ) : (
          <ul className="widget-list">
            {items.map((item, idx) => (
              <li key={idx} className="widget-item">
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
