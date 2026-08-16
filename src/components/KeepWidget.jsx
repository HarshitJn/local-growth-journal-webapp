import React, { useState } from 'react';
import { Plus, Trash2, CheckSquare, Square, Check } from 'lucide-react';

/**
 * Google Keep style Todo/Goal widget with inline adding, editing, and toggling.
 */
export default function KeepWidget({
  title,
  icon,
  items = [],
  onAddItem,
  onToggleItem,
  onDeleteItem,
  onEditItem,
  placeholder = "Add new item...",
  onDeleteWidget
}) {
  const [inputText, setInputText] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  const handleAdd = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onAddItem(inputText.trim());
    setInputText('');
  };

  const startEditing = (item) => {
    setEditingId(item.id);
    setEditText(item.text);
  };

  const handleSaveEdit = (id) => {
    if (editText.trim()) {
      onEditItem(id, editText.trim());
    }
    setEditingId(null);
  };

  const handleKeyDown = (e, id) => {
    if (e.key === 'Enter') {
      handleSaveEdit(id);
    } else if (e.key === 'Escape') {
      setEditingId(null);
    }
  };

  return (
    <div className="widget-card keep-card">
      <div className="widget-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="widget-icon">{icon}</div>
          <h3 className="widget-title">{title}</h3>
        </div>
        {onDeleteWidget && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteWidget();
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '4px',
              borderRadius: '4px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#d9383a'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
            title="Delete this widget"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      <div className="widget-body" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Items List */}
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '8px', maxHeight: '180px' }}>
          {items.length === 0 ? (
            <p className="widget-empty" style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>
              No {title.toLowerCase()} set yet. Add one below.
            </p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {items.map((item) => (
                <li 
                  key={item.id} 
                  className="keep-item"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 8px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    transition: 'background-color 0.2s',
                    opacity: item.completed ? 0.6 : 1
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, marginRight: '8px' }}>
                    {/* Toggle Button */}
                    <button
                      onClick={() => onToggleItem(item.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        color: item.completed ? 'var(--accent)' : 'var(--text-secondary)',
                        transition: 'color 0.2s'
                      }}
                    >
                      {item.completed ? <CheckSquare size={16} /> : <Square size={16} />}
                    </button>

                    {/* Text Display or Input Editor */}
                    {editingId === item.id ? (
                      <input
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onBlur={() => handleSaveEdit(item.id)}
                        onKeyDown={(e) => handleKeyDown(e, item.id)}
                        autoFocus
                        style={{
                          flex: 1,
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid var(--accent)',
                          borderRadius: '4px',
                          color: 'var(--text-primary)',
                          padding: '2px 4px',
                          fontSize: '0.85rem',
                          outline: 'none'
                        }}
                      />
                    ) : (
                      <span
                        onClick={() => startEditing(item)}
                        style={{
                          fontSize: '0.85rem',
                          color: 'var(--text-primary)',
                          textDecoration: item.completed ? 'line-through' : 'none',
                          cursor: 'pointer',
                          wordBreak: 'break-word',
                          flex: 1
                        }}
                        title="Click to edit"
                      >
                        {item.text}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button
                      onClick={() => onDeleteItem(item.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        color: 'var(--text-secondary)',
                        borderRadius: '4px',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#d9383a';
                        e.currentTarget.style.backgroundColor = 'rgba(217, 56, 58, 0.08)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--text-secondary)';
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      title={`Delete ${title.slice(0, -1)}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Input Row */}
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: '6px', marginTop: 'auto' }}>
          <input
            type="text"
            className="chat-textarea"
            style={{
              flex: 1,
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '0.8rem',
              height: '32px',
              minHeight: '32px',
              resize: 'none'
            }}
            placeholder={placeholder}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            style={{
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: inputText.trim() ? 'pointer' : 'not-allowed',
              opacity: inputText.trim() ? 1 : 0.5,
              transition: 'background-color 0.2s'
            }}
          >
            <Plus size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
