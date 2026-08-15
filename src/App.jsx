import React, { useState, useEffect } from 'react';
import { AlertCircle, Lightbulb, Shield, Quote, BookOpen, Key, Eraser, RefreshCw, CheckCircle, Info, Sparkles, Target, ListTodo } from 'lucide-react';
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
  }, []);

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
    saveJournalData({ logs: updatedLogs, widgets, goals, todos });
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
      const { insights, usage } = await analyzeJournal(updatedLogs, provider, apiKey, modelName, goals, todos);
      
      // Determine if there is any difference between the old and new insights
      const hasChanged = JSON.stringify(insights) !== JSON.stringify(widgets);
      
      // Update widgets state and persist
      setWidgets(insights);
      saveJournalData({ logs: updatedLogs, widgets: insights, goals, todos });

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
      saveJournalData({ logs: [], widgets: emptyWidgets, goals, todos });
      return;
    }

    saveJournalData({ logs: updatedLogs, widgets, goals, todos });

    // Re-analyze remaining logs to keep insights synchronized, if key is available
    if (apiKey) {
      setIsLoading(true);
      try {
        const { insights, usage } = await analyzeJournal(updatedLogs, provider, apiKey, modelName, goals, todos);
        setWidgets(insights);
        saveJournalData({ logs: updatedLogs, widgets: insights, goals, todos });

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
    if (logs.length === 0 && goals.length === 0 && todos.length === 0) {
      alert("Your journal is already empty.");
      return;
    }
    const confirmation = window.prompt(
      "This will permanently erase ALL journal entries, goals, todos, and AI insights.\n" +
      "To confirm this destructive action, please type 'erase' below:"
    );
    if (confirmation === 'erase') {
      const emptyWidgets = { problems: [], learnings: [], strengths: [], quotes: [] };
      setLogs([]);
      setWidgets(emptyWidgets);
      setGoals([]);
      setTodos([]);
      saveJournalData({ logs: [], widgets: emptyWidgets, goals: [], todos: [] });
      alert("All journal data, goals, todos, and insights have been erased.");
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
      const { items, usage } = await analyzeSingleWidget(logs, key, provider, apiKey, modelName, goals, todos);
      
      const updatedWidgets = { ...widgets, [key]: items };
      setWidgets(updatedWidgets);
      saveJournalData({ logs, widgets: updatedWidgets, goals, todos });

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
      const { insights, usage } = await analyzeJournal(logs, provider, apiKey, modelName, goals, todos);
      setWidgets(insights);
      saveJournalData({ logs, widgets: insights, goals, todos });

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
    saveJournalData({ logs, widgets, goals: updated, todos });
  };

  const handleToggleGoal = (id) => {
    const updated = goals.map(g => g.id === id ? { ...g, completed: !g.completed } : g);
    setGoals(updated);
    saveJournalData({ logs, widgets, goals: updated, todos });
  };

  const handleDeleteGoal = (id) => {
    const updated = goals.filter(g => g.id !== id);
    setGoals(updated);
    saveJournalData({ logs, widgets, goals: updated, todos });
  };

  const handleEditGoal = (id, newText) => {
    const updated = goals.map(g => g.id === id ? { ...g, text: newText } : g);
    setGoals(updated);
    saveJournalData({ logs, widgets, goals: updated, todos });
  };

  // Todos Handlers
  const handleAddTodo = (text) => {
    const newTodo = { id: Date.now().toString(), text, completed: false };
    const updated = [...todos, newTodo];
    setTodos(updated);
    saveJournalData({ logs, widgets, goals, todos: updated });
  };

  const handleToggleTodo = (id) => {
    const updated = todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    setTodos(updated);
    saveJournalData({ logs, widgets, goals, todos: updated });
  };

  const handleDeleteTodo = (id) => {
    const updated = todos.filter(t => t.id !== id);
    setTodos(updated);
    saveJournalData({ logs, widgets, goals, todos: updated });
  };

  const handleEditTodo = (id, newText) => {
    const updated = todos.map(t => t.id === id ? { ...t, text: newText } : t);
    setTodos(updated);
    saveJournalData({ logs, widgets, goals, todos: updated });
  };

  return (
    <div className="app-container">
      {/* Column 1: Left Sidebar (AI Insights) */}
      <aside className="left-sidebar">
        <div className="sidebar-header">
          <Sparkles size={14} />
          <span>AI Insights</span>
        </div>
        <Widget
          title="Current Problems"
          icon={<AlertCircle size={18} />}
          items={widgets.problems}
          emptyText="No problems identified. Reflect to see struggles structured here."
          onErase={() => handleEraseSingleWidget('problems')}
          onRefresh={() => handleRefreshSingleWidget('problems')}
          isLoading={widgetLoading.problems}
        />
        <Widget
          title="Key Learnings"
          icon={<Lightbulb size={18} />}
          items={widgets.learnings}
          emptyText="No learnings extracted yet. Lessons appear as you journal."
          onErase={() => handleEraseSingleWidget('learnings')}
          onRefresh={() => handleRefreshSingleWidget('learnings')}
          isLoading={widgetLoading.learnings}
        />
        <Widget
          title="Identified Strengths"
          icon={<Shield size={18} />}
          items={widgets.strengths}
          emptyText="Your strengths will shine here as you write about your days."
          onErase={() => handleEraseSingleWidget('strengths')}
          onRefresh={() => handleRefreshSingleWidget('strengths')}
          isLoading={widgetLoading.strengths}
        />
        <Widget
          title="Key Quotes"
          icon={<Quote size={18} />}
          items={widgets.quotes}
          emptyText="Memorable one-liners to carry with you throughout the day."
          onErase={() => handleEraseSingleWidget('quotes')}
          onRefresh={() => handleRefreshSingleWidget('quotes')}
          isLoading={widgetLoading.quotes}
        />
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
        <KeepWidget
          title="Goals"
          icon={<Target size={18} />}
          items={goals}
          onAddItem={handleAddGoal}
          onToggleItem={handleToggleGoal}
          onDeleteItem={handleDeleteGoal}
          onEditItem={handleEditGoal}
          placeholder="Add a goal..."
        />
        <KeepWidget
          title="Todos"
          icon={<ListTodo size={18} />}
          items={todos}
          onAddItem={handleAddTodo}
          onToggleItem={handleToggleTodo}
          onDeleteItem={handleDeleteTodo}
          onEditItem={handleEditTodo}
          placeholder="Add a todo..."
        />
      </aside>

      {/* Bottom Floating Utilities */}
      <BackupControl onDataImported={handleDataImported} onClearAll={handleClearAllData} />
      <div className="bottom-right-controls">
        <button
          onClick={handleForceRegenerateAll}
          disabled={isLoading || logs.length === 0}
          className="settings-btn sparkles-btn"
          title="Force Update All Insights"
          style={{ transition: 'all 0.2s ease' }}
        >
          <Sparkles size={20} className={isLoading ? 'spinner' : ''} />
        </button>
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
