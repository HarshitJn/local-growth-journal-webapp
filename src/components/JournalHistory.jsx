import React, { useEffect, useRef } from 'react';
import { Trash2, Calendar } from 'lucide-react';

export default function JournalHistory({ logs = [], onDeleteLog }) {
  const containerRef = useRef(null);
  const bottomRef = useRef(null);
  const isAtBottomRef = useRef(true);

  // Scroll to bottom on new log added
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    isAtBottomRef.current = true;
  }, [logs.length]);

  // Monitor scroll position to check if user is at the bottom
  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;

    // 50px buffer threshold to identify if user is near the bottom
    const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 50;
    isAtBottomRef.current = isAtBottom;
  };

  // Monitor resize of the timeline container (e.g. when typing causes textarea to grow)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      if (isAtBottomRef.current) {
        // Instantly snap to bottom during layout shifts/resizes
        container.scrollTop = container.scrollHeight;
      }
    });

    resizeObserver.observe(container);
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  if (logs.length === 0) {
    return (
      <div className="timeline-empty">
        <Calendar size={36} className="timeline-empty-icon" />
        <h3>A quiet space for your thoughts</h3>
        <p>Your thoughts are temporary ripples. Share your feelings or log your progress in the box below to start reflecting.</p>
      </div>
    );
  }

  // Sort logs: oldest first (chronological) for chat style
  const sortedLogs = [...logs].sort((a, b) => a.timestamp - b.timestamp);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div 
      className="timeline-container" 
      ref={containerRef} 
      onScroll={handleScroll}
    >
      {sortedLogs.map((log) => (
        <div key={log.id} className="log-card">
          <div className="log-header">
            <span className="log-time">{formatTime(log.timestamp)}</span>
            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to remove this memory?")) {
                  onDeleteLog(log.id);
                }
              }}
              className="delete-log-btn"
              title="Delete memory"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                padding: '2px',
                borderRadius: '4px',
                transition: 'color 0.2s, background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#d9383a';
                e.currentTarget.style.backgroundColor = 'rgba(217, 56, 58, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
          <div className="log-body">{log.text}</div>
        </div>
      ))}
      <div ref={bottomRef} style={{ float: 'left', clear: 'both' }} />
    </div>
  );
}
