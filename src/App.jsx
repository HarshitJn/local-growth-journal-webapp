import React, { useState, useEffect } from 'react';
import { AlertCircle, Lightbulb, Shield, Quote, BookOpen, Key, Eraser, RefreshCw } from 'lucide-react';
import './App.css';

// Component imports
import Widget from './components/Widget';
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
  const [isLoading, setIsLoading] = useState(false);
  const [widgetLoading, setWidgetLoading] = useState({
    problems: false,
    learnings: false,
    strengths: false,
    quotes: false,
  });
  const [errorMsg, setErrorMsg] = useState('');

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
  }, []);

  const handleSendLog = async (text) => {
    // 1. Create and save the new log immediately locally
    const newLog = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      text: text,
    };
    const updatedLogs = [...logs, newLog];
    setLogs(updatedLogs);
    saveJournalData({ logs: updatedLogs, widgets });
    setErrorMsg('');

    // 2. If API Key is not set, alert user but keep log
    if (!apiKey) {
      setErrorMsg(`Log saved. To generate AI insights, please configure your ${provider.toUpperCase()} API Key in the bottom-right.`);
      return;
    }

    // 3. Call LLM to update insights
    setIsLoading(true);
    try {
      const { insights, usage } = await analyzeJournal(updatedLogs, provider, apiKey, modelName);
      
      // Update widgets state and persist
      setWidgets(insights);
      saveJournalData({ logs: updatedLogs, widgets: insights });

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
      saveJournalData({ logs: [], widgets: emptyWidgets });
      return;
    }

    saveJournalData({ logs: updatedLogs, widgets });

    // Re-analyze remaining logs to keep insights synchronized, if key is available
    if (apiKey) {
      setIsLoading(true);
      try {
        const { insights, usage } = await analyzeJournal(updatedLogs, provider, apiKey, modelName);
        setWidgets(insights);
        saveJournalData({ logs: updatedLogs, widgets: insights });

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
  };

  const handleClearAllData = () => {
    if (logs.length === 0) {
      alert("Your journal is already empty.");
      return;
    }
    const confirmation = window.prompt(
      "This will permanently erase ALL journal entries and AI insights.\n" +
      "To confirm this destructive action, please type 'erase' below:"
    );
    if (confirmation === 'erase') {
      const emptyWidgets = { problems: [], learnings: [], strengths: [], quotes: [] };
      setLogs([]);
      setWidgets(emptyWidgets);
      saveJournalData({ logs: [], widgets: emptyWidgets });
      alert("All journal data and insights have been erased.");
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
      saveJournalData({ logs, widgets: updatedWidgets });
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
      const { items, usage } = await analyzeSingleWidget(logs, key, provider, apiKey, modelName);
      
      const updatedWidgets = { ...widgets, [key]: items };
      setWidgets(updatedWidgets);
      saveJournalData({ logs, widgets: updatedWidgets });

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

  return (
    <div className="app-container">
      {/* Column 1: Left Widgets */}
      <aside className="left-sidebar">
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

      {/* Column 3: Right Widgets */}
      <aside className="right-sidebar">
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

      {/* Bottom Floating Utilities */}
      <BackupControl onDataImported={handleDataImported} onClearAll={handleClearAllData} />
      <div className="bottom-right-controls">
        <UsageStatsModal />
        <APIKeyModal />
      </div>
    </div>
  );
}

export default App;
