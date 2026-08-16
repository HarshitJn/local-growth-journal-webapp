import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, Lightbulb, Shield, Quote, BookOpen, Key, Eraser, RefreshCw, CheckCircle, Info, Sparkles, Target, ListTodo, Plus, Folder, ChevronsLeftRight } from 'lucide-react';
import './App.css';

// Component imports
import Widget from './components/Widget';
import KeepWidget from './components/KeepWidget';
import JournalHistory from './components/JournalHistory';
import JournalInput from './components/JournalInput';
import APIKeyModal from './components/APIKeyModal';
import BackupControl from './components/BackupControl';
import UsageStatsModal from './components/UsageStatsModal';

// Utilities
import { getJournalData, saveJournalData, getApiKey, getModelName, getProvider, saveUsageRecord } from './utils/storage';
import { analyzeJournal, calculateCost, analyzeSingleWidget } from './utils/llm';

function App() {
  const [provider, setProvider] = useState('gemini');
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState('gemini-3.5-flash');
  const [logs, setLogs] = useState([]);
  const [widgets, setWidgets] = useState({
    problems: [],
    learnings: [],
    strengths: [],
    quotes: [],
  });
  const [goals, setGoals] = useState([]);
  const [todos, setTodos] = useState([]);
  const [customWidgets, setCustomWidgets] = useState([]);
  const [runningSummary, setRunningSummary] = useState('');
  const [isAddingWidget, setIsAddingWidget] = useState(false);
  const [aiOrder, setAiOrder] = useState(['problems', 'learnings', 'strengths', 'quotes']);
  const [personalOrder, setPersonalOrder] = useState(['goals', 'todos']);
  const [draggedAiKey, setDraggedAiKey] = useState(null);
  const [draggedPersonalKey, setDraggedPersonalKey] = useState(null);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('AI_JOURNAL_SIDEBAR_WIDTH');
    return saved ? parseInt(saved, 10) : 320;
  });
  const dragStartRef = useRef({ startX: 0, startWidth: 320 });
  const [isResizing, setIsResizing] = useState(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isLoading, setIsLoading] = useState(false);
  const [widgetLoading, setWidgetLoading] = useState({
    problems: false,
    learnings: false,
    strengths: false,
    quotes: false,
  });
  const [errorMsg, setErrorMsg] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'info', visible: false });

  const showToast = (message, type = 'info') => {
    setToast({ message, type, visible: true });
  };

  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => {
        setToast((prev) => ({ ...prev, visible: false }));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

  // Load initial data on mount
  useEffect(() => {
    const prov = getProvider();
    setProvider(prov);

    const key = getApiKey(prov);
    setApiKey(key);

    const model = getModelName(prov);
    setModelName(model);

    const data = getJournalData();
    setLogs(data.logs || []);
    setWidgets(data.widgets || {
      problems: [],
      learnings: [],
      strengths: [],
      quotes: [],
    });
    setGoals(data.goals || []);
    setTodos(data.todos || []);
    const cWidgets = data.customWidgets || [];
    setCustomWidgets(cWidgets);
    setRunningSummary(data.runningSummary || '');
    setAiOrder(data.aiOrder || ['problems', 'learnings', 'strengths', 'quotes']);

    let pOrder = data.personalOrder || ['goals', 'todos'];
    cWidgets.forEach(w => {
      if (!pOrder.includes(w.id)) {
        pOrder.push(w.id);
      }
    });
    pOrder = pOrder.filter(id => id === 'goals' || id === 'todos' || cWidgets.some(w => w.id === id));
    setPersonalOrder(pOrder);
  }, []);

  useEffect(() => {
    const handleResizeWindow = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResizeWindow);
    return () => window.removeEventListener('resize', handleResizeWindow);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e) => {
      const { startX, startWidth } = dragStartRef.current;
      let calculatedWidth;

      if (isResizing === 'left') {
        // Outer left handle: dragging left (smaller X) expands width outwards!
        const delta = startX - e.clientX;
        calculatedWidth = startWidth + delta;
      } else if (isResizing === 'right') {
        // Outer right handle: dragging right (larger X) expands width outwards!
        const delta = e.clientX - startX;
        calculatedWidth = startWidth + delta;
      }

      if (calculatedWidth) {
        const clamped = Math.min(Math.max(Math.round(calculatedWidth), 240), 520);
        setSidebarWidth(clamped);
        localStorage.setItem('AI_JOURNAL_SIDEBAR_WIDTH', clamped.toString());
      }
    };

    const handleMouseUp = () => {
      setIsResizing(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleSendLog = async (text) => {
    const trimmedText = text.trim();
    if (!trimmedText) return;

    // 1. Create and save the new log immediately locally
    const newLog = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      text: trimmedText,
    };
    const updatedLogs = [...logs, newLog];
    setLogs(updatedLogs);
    saveJournalData({ logs: updatedLogs, widgets, goals, todos, customWidgets, runningSummary });
    setErrorMsg('');

    // Check if the entry is trivial (less than 3 words or standard greeting noise)
    const trivialWords = ['test', 'hello', 'hi', 'ok', 'okay', 'cool', 'thanks', 'yes', 'no', 'bye'];
    const cleanWord = trimmedText.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
    const words = trimmedText.split(/\s+/);
    const isTrivial = words.length < 3 || trivialWords.includes(cleanWord);

    if (isTrivial) {
      showToast("No new insights found. (0 tokens used)", "info");
      return;
    }

    // 2. If API Key is not set, alert user but keep log
    if (!apiKey) {
      setErrorMsg(`Log saved. To generate AI insights, please configure your ${provider.toUpperCase()} API Key in the bottom-right.`);
      return;
    }

    // 3. Call LLM to update insights
    setIsLoading(true);
    try {
      const { insights, usage } = await analyzeJournal(updatedLogs, provider, apiKey, modelName, goals, todos, customWidgets, runningSummary);
      
      const newWidgets = {
        problems: insights.problems || [],
        learnings: insights.learnings || [],
        strengths: insights.strengths || [],
        quotes: insights.quotes || []
      };

      // Determine if there is any difference between the old and new insights
      const hasChanged = JSON.stringify(newWidgets) !== JSON.stringify(widgets);
      
      // Update widgets state and persist
      setWidgets(newWidgets);
      const newSummary = insights.runningSummary || runningSummary;
      setRunningSummary(newSummary);
      saveJournalData({ logs: updatedLogs, widgets: newWidgets, goals, todos, customWidgets, runningSummary: newSummary });

      // Record token usage and cost
      let totalTokens = 0;
      if (usage && (usage.inputTokens > 0 || usage.outputTokens > 0)) {
        totalTokens = usage.inputTokens + usage.outputTokens;
        const cost = calculateCost(provider, modelName, usage.inputTokens, usage.outputTokens);
        saveUsageRecord({
          provider,
          model: modelName,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          cost
        });
      }

      if (hasChanged) {
        showToast("Insights updated!", "success");
      } else {
        showToast(`No new insights found. (${totalTokens} tokens used)`, "info");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Log saved, but AI analysis failed: ' + (err.message || 'Check your key or network connection.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLog = async (id) => {
    const updatedLogs = logs.filter((log) => log.id !== id);
    setLogs(updatedLogs);

    // If logs are now empty, clear widgets too
    if (updatedLogs.length === 0) {
      const emptyWidgets = { problems: [], learnings: [], strengths: [], quotes: [] };
      setWidgets(emptyWidgets);
      setRunningSummary('');
      saveJournalData({ logs: [], widgets: emptyWidgets, goals, todos, customWidgets, runningSummary: '' });
      return;
    }

    // Clear running summary on deletion to force a clean re-synchronization
    saveJournalData({ logs: updatedLogs, widgets, goals, todos, customWidgets, runningSummary: '' });
    setRunningSummary('');

    // Re-analyze remaining logs to keep insights synchronized, if key is available
    if (apiKey) {
      setIsLoading(true);
      try {
        const { insights, usage } = await analyzeJournal(updatedLogs, provider, apiKey, modelName, goals, todos, customWidgets, '');
        
        const newWidgets = {
          problems: insights.problems || [],
          learnings: insights.learnings || [],
          strengths: insights.strengths || [],
          quotes: insights.quotes || []
        };
        setWidgets(newWidgets);
        const newSummary = insights.runningSummary || '';
        setRunningSummary(newSummary);
        saveJournalData({ logs: updatedLogs, widgets: newWidgets, goals, todos, customWidgets, runningSummary: newSummary });

        // Record token usage and cost
        if (usage && (usage.inputTokens > 0 || usage.outputTokens > 0)) {
          const cost = calculateCost(provider, modelName, usage.inputTokens, usage.outputTokens);
          saveUsageRecord({
            provider,
            model: modelName,
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
            cost
          });
        }
      } catch (err) {
        console.error('Failed to re-sync insights after log deletion:', err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleDataImported = (importedData) => {
    setLogs(importedData.logs || []);
    setWidgets(importedData.widgets || {
      problems: [],
      learnings: [],
      strengths: [],
      quotes: [],
    });
    setGoals(importedData.goals || []);
    setTodos(importedData.todos || []);
  };

  const handleClearAllData = () => {
    if (logs.length === 0 && goals.length === 0 && todos.length === 0 && customWidgets.length === 0) {
      alert("Your journal is already empty.");
      return;
    }
    const confirmation = window.prompt(
      "This will permanently erase ALL journal entries, goals, todos, custom widgets, and AI insights.\n" +
      "To confirm this destructive action, please type 'erase' below:"
    );
    if (confirmation === 'erase') {
      const emptyWidgets = { problems: [], learnings: [], strengths: [], quotes: [] };
      setLogs([]);
      setWidgets(emptyWidgets);
      setGoals([]);
      setTodos([]);
      setCustomWidgets([]);
      setRunningSummary('');
      saveJournalData({ logs: [], widgets: emptyWidgets, goals: [], todos: [], customWidgets: [], runningSummary: '' });
      alert("All journal data, goals, todos, custom widgets, and insights have been erased.");
    } else if (confirmation !== null) {
      alert("Wipe cancelled. Confirmation text did not match.");
    }
  };

  const handleEraseSingleWidget = (key) => {
    const sectionNames = {
      problems: 'Problems',
      learnings: 'Learnings',
      strengths: 'Strengths',
      quotes: 'Quotes'
    };
    if (window.confirm(`Erase all content in the ${sectionNames[key]} widget?`)) {
      const updatedWidgets = { ...widgets, [key]: [] };
      setWidgets(updatedWidgets);
      saveJournalData({ logs, widgets: updatedWidgets, goals, todos });
    }
  };

  const handleRefreshSingleWidget = async (key) => {
    if (logs.length === 0) {
      alert("You need at least one journal entry to generate insights.");
      return;
    }
    if (!apiKey) {
      setErrorMsg(`To refresh insights, configure your ${provider.toUpperCase()} API Key in the bottom-right.`);
      return;
    }

    setWidgetLoading((prev) => ({ ...prev, [key]: true }));
    setErrorMsg('');
    try {
      const { items, usage } = await analyzeSingleWidget(logs, key, provider, apiKey, modelName, goals, todos, customWidgets, runningSummary);
      
      const updatedWidgets = { ...widgets, [key]: items };
      setWidgets(updatedWidgets);
      saveJournalData({ logs, widgets: updatedWidgets, goals, todos, customWidgets, runningSummary });

      if (usage && (usage.inputTokens > 0 || usage.outputTokens > 0)) {
        const cost = calculateCost(provider, modelName, usage.inputTokens, usage.outputTokens);
        saveUsageRecord({
          provider,
          model: modelName,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          cost
        });
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(`Failed to refresh: ` + (err.message || 'Check your key or network connection.'));
    } finally {
      setWidgetLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleForceRegenerateAll = async () => {
    if (logs.length === 0) {
      alert("You need at least one journal entry to generate insights.");
      return;
    }
    if (!apiKey) {
      setErrorMsg(`To generate insights, configure your ${provider.toUpperCase()} API Key in the bottom-right.`);
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    try {
      const { insights, usage } = await analyzeJournal(logs, provider, apiKey, modelName, goals, todos, customWidgets, '');
      
      const newWidgets = {
        problems: insights.problems || [],
        learnings: insights.learnings || [],
        strengths: insights.strengths || [],
        quotes: insights.quotes || []
      };
      setWidgets(newWidgets);
      const newSummary = insights.runningSummary || '';
      setRunningSummary(newSummary);
      saveJournalData({ logs, widgets: newWidgets, goals, todos, customWidgets, runningSummary: newSummary });

      if (usage && (usage.inputTokens > 0 || usage.outputTokens > 0)) {
        const cost = calculateCost(provider, modelName, usage.inputTokens, usage.outputTokens);
        saveUsageRecord({
          provider,
          model: modelName,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          cost
        });
      }
      showToast("All insights updated!", "success");
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to regenerate insights: ' + (err.message || 'Check your key or network connection.'));
    } finally {
      setIsLoading(false);
    }
  };

  // Goals Handlers
  const handleAddGoal = (text) => {
    const newGoal = { id: Date.now().toString(), text, completed: false };
    const updated = [...goals, newGoal];
    setGoals(updated);
    saveJournalData({ logs, widgets, goals: updated, todos, customWidgets, runningSummary });
  };

  const handleToggleGoal = (id) => {
    const updated = goals.map(g => g.id === id ? { ...g, completed: !g.completed } : g);
    setGoals(updated);
    saveJournalData({ logs, widgets, goals: updated, todos, customWidgets, runningSummary });
  };

  const handleDeleteGoal = (id) => {
    const updated = goals.filter(g => g.id !== id);
    setGoals(updated);
    saveJournalData({ logs, widgets, goals: updated, todos, customWidgets, runningSummary });
  };

  const handleEditGoal = (id, newText) => {
    const updated = goals.map(g => g.id === id ? { ...g, text: newText } : g);
    setGoals(updated);
    saveJournalData({ logs, widgets, goals: updated, todos, customWidgets, runningSummary });
  };

  // Todos Handlers
  const handleAddTodo = (text) => {
    const newTodo = { id: Date.now().toString(), text, completed: false };
    const updated = [...todos, newTodo];
    setTodos(updated);
    saveJournalData({ logs, widgets, goals, todos: updated, customWidgets, runningSummary });
  };

  const handleToggleTodo = (id) => {
    const updated = todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    setTodos(updated);
    saveJournalData({ logs, widgets, goals, todos: updated, customWidgets, runningSummary });
  };

  const handleDeleteTodo = (id) => {
    const updated = todos.filter(t => t.id !== id);
    setTodos(updated);
    saveJournalData({ logs, widgets, goals, todos: updated, customWidgets, runningSummary });
  };

  const handleEditTodo = (id, newText) => {
    const updated = todos.map(t => t.id === id ? { ...t, text: newText } : t);
    setTodos(updated);
    saveJournalData({ logs, widgets, goals, todos: updated, customWidgets, runningSummary });
  };

  // Custom Widgets Handlers
  const handleAddCustomWidget = (title) => {
    const newWidget = {
      id: Date.now().toString(),
      title: title.trim(),
      items: []
    };
    const updated = [...customWidgets, newWidget];
    setCustomWidgets(updated);
    saveJournalData({ logs, widgets, goals, todos, customWidgets: updated, runningSummary });
  };

  const handleDeleteCustomWidget = (widgetId) => {
    if (window.confirm("Are you sure you want to delete this custom widget and all its items?")) {
      const updated = customWidgets.filter(w => w.id !== widgetId);
      setCustomWidgets(updated);
      saveJournalData({ logs, widgets, goals, todos, customWidgets: updated, runningSummary });
    }
  };

  const handleAddCustomWidgetItem = (widgetId, itemText) => {
    const updated = customWidgets.map(w => {
      if (w.id === widgetId) {
        const newItem = { id: Date.now().toString(), text: itemText, completed: false };
        return { ...w, items: [...w.items, newItem] };
      }
      return w;
    });
    setCustomWidgets(updated);
    saveJournalData({ logs, widgets, goals, todos, customWidgets: updated, runningSummary });
  };

  const handleToggleCustomWidgetItem = (widgetId, itemId) => {
    const updated = customWidgets.map(w => {
      if (w.id === widgetId) {
        const updatedItems = w.items.map(item => 
          item.id === itemId ? { ...item, completed: !item.completed } : item
        );
        return { ...w, items: updatedItems };
      }
      return w;
    });
    setCustomWidgets(updated);
    saveJournalData({ logs, widgets, goals, todos, customWidgets: updated, runningSummary });
  };

  const handleDeleteCustomWidgetItem = (widgetId, itemId) => {
    const updated = customWidgets.map(w => {
      if (w.id === widgetId) {
        const updatedItems = w.items.filter(item => item.id !== itemId);
        return { ...w, items: updatedItems };
      }
      return w;
    });
    setCustomWidgets(updated);
    saveJournalData({ logs, widgets, goals, todos, customWidgets: updated, runningSummary });
  };

  const handleEditCustomWidgetItem = (widgetId, itemId, newText) => {
    const updated = customWidgets.map(w => {
      if (w.id === widgetId) {
        const updatedItems = w.items.map(item => 
          item.id === itemId ? { ...item, text: newText } : item
        );
        return { ...w, items: updatedItems };
      }
      return w;
    });
    setCustomWidgets(updated);
    saveJournalData({ logs, widgets, goals, todos, customWidgets: updated, runningSummary, aiOrder, personalOrder });
  };

  // Drag and Drop handlers for AI Insights (Left Sidebar)
  const handleAiDragStart = (e, key) => {
    setDraggedAiKey(key);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleAiDragOver = (e) => {
    e.preventDefault();
  };

  const handleAiDrop = (e, targetKey) => {
    e.preventDefault();
    if (!draggedAiKey || draggedAiKey === targetKey) return;
    const sourceIndex = aiOrder.indexOf(draggedAiKey);
    const targetIndex = aiOrder.indexOf(targetKey);
    const updated = [...aiOrder];
    updated.splice(sourceIndex, 1);
    updated.splice(targetIndex, 0, draggedAiKey);
    setAiOrder(updated);
    saveJournalData({ logs, widgets, goals, todos, customWidgets, runningSummary, aiOrder: updated, personalOrder });
    setDraggedAiKey(null);
  };

  // Drag and Drop handlers for Personal Space (Right Sidebar)
  const handlePersonalDragStart = (e, id) => {
    setDraggedPersonalKey(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handlePersonalDragOver = (e) => {
    e.preventDefault();
  };

  const handlePersonalDrop = (e, targetId) => {
    e.preventDefault();
    if (!draggedPersonalKey || draggedPersonalKey === targetId) return;
    const sourceIndex = personalOrder.indexOf(draggedPersonalKey);
    const targetIndex = personalOrder.indexOf(targetId);
    const updated = [...personalOrder];
    updated.splice(sourceIndex, 1);
    updated.splice(targetIndex, 0, draggedPersonalKey);
    setPersonalOrder(updated);
    saveJournalData({ logs, widgets, goals, todos, customWidgets, runningSummary, aiOrder, personalOrder: updated });
    setDraggedPersonalKey(null);
  };

  return (
    <div 
      className="app-container"
      style={{
        gridTemplateColumns: windowWidth > 1100 ? `${sidebarWidth}px 1fr ${sidebarWidth}px` : undefined,
        maxWidth: windowWidth > 1100 ? `min(98vw, ${936 + sidebarWidth * 2 + 48}px)` : undefined,
        userSelect: isResizing ? 'none' : 'auto'
      }}
    >
      {/* Outer Symmetrical Resizers */}
      {windowWidth > 1100 && (
        <>
          <div
            className={`sidebar-resizer resizer-left ${isResizing === 'left' ? 'is-dragging' : ''}`}
            onMouseDown={(e) => {
              e.preventDefault();
              dragStartRef.current = { startX: e.clientX, startWidth: sidebarWidth };
              setIsResizing('left');
            }}
            onDoubleClick={() => {
              setSidebarWidth(320);
              localStorage.setItem('AI_JOURNAL_SIDEBAR_WIDTH', '320');
            }}
            title="Drag to resize sidebars symmetrically (Double-click to reset)"
          >
            <div className="sidebar-resizer-line" />
            <div className="sidebar-resizer-pill">
              <ChevronsLeftRight size={12} />
            </div>
          </div>
          <div
            className={`sidebar-resizer resizer-right ${isResizing === 'right' ? 'is-dragging' : ''}`}
            onMouseDown={(e) => {
              e.preventDefault();
              dragStartRef.current = { startX: e.clientX, startWidth: sidebarWidth };
              setIsResizing('right');
            }}
            onDoubleClick={() => {
              setSidebarWidth(320);
              localStorage.setItem('AI_JOURNAL_SIDEBAR_WIDTH', '320');
            }}
            title="Drag to resize sidebars symmetrically (Double-click to reset)"
          >
            <div className="sidebar-resizer-line" />
            <div className="sidebar-resizer-pill">
              <ChevronsLeftRight size={12} />
            </div>
          </div>
        </>
      )}

      {/* Column 1: Left Sidebar (AI Insights) */}
      <aside className="left-sidebar">
        <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={14} />
            <span>AI Insights</span>
          </div>
          <button
            onClick={handleForceRegenerateAll}
            disabled={isLoading || logs.length === 0}
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
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
            title="Force Update All Insights"
          >
            <RefreshCw size={14} className={isLoading ? 'spinner' : ''} style={{ transition: 'all 0.2s ease' }} />
          </button>
        </div>
        {aiOrder.map((key) => {
          if (key === 'problems') {
            return (
              <Widget
                key="problems"
                title="Current Problems"
                icon={<AlertCircle size={18} />}
                items={widgets.problems}
                emptyText="No problems identified. Reflect to see struggles structured here."
                onErase={() => handleEraseSingleWidget('problems')}
                onRefresh={() => handleRefreshSingleWidget('problems')}
                isLoading={widgetLoading.problems}
                onDragStart={(e) => handleAiDragStart(e, 'problems')}
                onDragOver={handleAiDragOver}
                onDrop={(e) => handleAiDrop(e, 'problems')}
              />
            );
          }
          if (key === 'learnings') {
            return (
              <Widget
                key="learnings"
                title="Key Learnings"
                icon={<Lightbulb size={18} />}
                items={widgets.learnings}
                emptyText="No learnings extracted yet. Lessons appear as you journal."
                onErase={() => handleEraseSingleWidget('learnings')}
                onRefresh={() => handleRefreshSingleWidget('learnings')}
                isLoading={widgetLoading.learnings}
                onDragStart={(e) => handleAiDragStart(e, 'learnings')}
                onDragOver={handleAiDragOver}
                onDrop={(e) => handleAiDrop(e, 'learnings')}
              />
            );
          }
          if (key === 'strengths') {
            return (
              <Widget
                key="strengths"
                title="Identified Strengths"
                icon={<Shield size={18} />}
                items={widgets.strengths}
                emptyText="Your strengths will shine here as you write about your days."
                onErase={() => handleEraseSingleWidget('strengths')}
                onRefresh={() => handleRefreshSingleWidget('strengths')}
                isLoading={widgetLoading.strengths}
                onDragStart={(e) => handleAiDragStart(e, 'strengths')}
                onDragOver={handleAiDragOver}
                onDrop={(e) => handleAiDrop(e, 'strengths')}
              />
            );
          }
          if (key === 'quotes') {
            return (
              <Widget
                key="quotes"
                title="Key Quotes"
                icon={<Quote size={18} />}
                items={widgets.quotes}
                emptyText="Memorable one-liners to carry with you throughout the day."
                onErase={() => handleEraseSingleWidget('quotes')}
                onRefresh={() => handleRefreshSingleWidget('quotes')}
                isLoading={widgetLoading.quotes}
                onDragStart={(e) => handleAiDragStart(e, 'quotes')}
                onDragOver={handleAiDragOver}
                onDrop={(e) => handleAiDrop(e, 'quotes')}
              />
            );
          }
          return null;
        })}
      </aside>

      {/* Column 2: Chat & Input */}
      <main className="chat-column">
        <header className="chat-header">
          <h1><span style={{ color: 'var(--accent)' }}>Quiet</span> Space</h1>
          <p>A private, local sanctuary for my daily thoughts and reflection.</p>
        </header>

        {errorMsg && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '12px',
              backgroundColor: 'rgba(217, 56, 58, 0.1)',
              color: '#d9383a',
              fontSize: '0.85rem',
              border: '1px solid rgba(217, 56, 58, 0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              animation: 'fadeIn 0.3s ease-out'
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        <JournalHistory logs={logs} onDeleteLog={handleDeleteLog} />

        <JournalInput onSend={handleSendLog} isLoading={isLoading} provider={provider} />
      </main>

      {/* Column 3: Right Sidebar (Personal Space - Goals & Todos) */}
      <aside className="right-sidebar">
        <div className="sidebar-header">
          <BookOpen size={14} />
          <span>Personal Space</span>
        </div>
        {personalOrder.map((id) => {
          if (id === 'goals') {
            return (
              <KeepWidget
                key="goals"
                title="Goals"
                icon={<Target size={18} />}
                items={goals}
                onAddItem={handleAddGoal}
                onToggleItem={handleToggleGoal}
                onDeleteItem={handleDeleteGoal}
                onEditItem={handleEditGoal}
                placeholder="Add a goal..."
                onDragStart={(e) => handlePersonalDragStart(e, 'goals')}
                onDragOver={handlePersonalDragOver}
                onDrop={(e) => handlePersonalDrop(e, 'goals')}
              />
            );
          }
          if (id === 'todos') {
            return (
              <KeepWidget
                key="todos"
                title="Todos"
                icon={<ListTodo size={18} />}
                items={todos}
                onAddItem={handleAddTodo}
                onToggleItem={handleToggleTodo}
                onDeleteItem={handleDeleteTodo}
                onEditItem={handleEditTodo}
                placeholder="Add a todo..."
                onDragStart={(e) => handlePersonalDragStart(e, 'todos')}
                onDragOver={handlePersonalDragOver}
                onDrop={(e) => handlePersonalDrop(e, 'todos')}
              />
            );
          }
          // Custom widgets
          const widget = customWidgets.find(w => w.id === id);
          if (widget) {
            return (
              <KeepWidget
                key={widget.id}
                title={widget.title}
                icon={<Folder size={18} />}
                items={widget.items}
                onAddItem={(text) => handleAddCustomWidgetItem(widget.id, text)}
                onToggleItem={(itemId) => handleToggleCustomWidgetItem(widget.id, itemId)}
                onDeleteItem={(itemId) => handleDeleteCustomWidgetItem(widget.id, itemId)}
                onEditItem={(itemId, text) => handleEditCustomWidgetItem(widget.id, itemId, text)}
                placeholder="Add item..."
                onDeleteWidget={() => handleDeleteCustomWidget(widget.id)}
                onDragStart={(e) => handlePersonalDragStart(e, widget.id)}
                onDragOver={handlePersonalDragOver}
                onDrop={(e) => handlePersonalDrop(e, widget.id)}
              />
            );
          }
          return null;
        })}

        {/* Add Custom Widget Button / Form */}
        {!isAddingWidget ? (
          <button
            onClick={() => setIsAddingWidget(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '16px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1.5px dashed var(--card-border)',
              borderRadius: '16px',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              width: '100%',
              transition: 'all 0.3s ease',
              fontSize: '0.9rem',
              fontWeight: '500',
              marginTop: '4px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)';
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.backgroundColor = 'rgba(76, 124, 89, 0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--card-border)';
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
            }}
          >
            <Plus size={18} />
            <span>Add Custom Widget</span>
          </button>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const title = fd.get('widgetTitle');
              if (title && title.trim()) {
                handleAddCustomWidget(title.trim());
                setIsAddingWidget(false);
              }
            }}
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              animation: 'fadeIn 0.2s ease-out',
              marginTop: '4px'
            }}
          >
            <h4 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>New Custom Widget</h4>
            <input
              name="widgetTitle"
              type="text"
              placeholder="e.g. Projects, Shopping List..."
              autoFocus
              required
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--card-border)',
                borderRadius: '8px',
                padding: '8px 12px',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                outline: 'none'
              }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setIsAddingWidget(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  padding: '4px 8px'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  background: 'var(--accent)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  padding: '4px 12px'
                }}
              >
                Create
              </button>
            </div>
          </form>
        )}
      </aside>

      {/* Bottom Floating Utilities */}
      <BackupControl onDataImported={handleDataImported} onClearAll={handleClearAllData} />
      <div className="bottom-right-controls">
        <UsageStatsModal />
        <APIKeyModal />
      </div>

      {toast.visible && (
        <div className={`toast-notification ${toast.type}`}>
          {toast.type === 'success' ? (
            <CheckCircle size={16} style={{ color: 'var(--accent)' }} />
          ) : (
            <Info size={16} style={{ color: 'var(--text-secondary)' }} />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}

export default App;
