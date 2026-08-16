// src/utils/storage.js

const KEYS = {
  PROVIDER: 'AI_JOURNAL_PROVIDER', // 'gemini', 'openai', or 'anthropic'
  API_KEY_PREFIX: 'AI_JOURNAL_API_KEY_',
  MODEL_PREFIX: 'AI_JOURNAL_MODEL_',
  JOURNAL_DATA: 'AI_JOURNAL_DATA',
  USAGE: 'AI_JOURNAL_USAGE',
  
  // Legacy keys for migration
  LEGACY_API_KEY: 'AI_JOURNAL_API_KEY',
  LEGACY_MODEL: 'AI_JOURNAL_MODEL',
};

// Migrate old data if present
const migrateKeys = () => {
  const legacyKey = localStorage.getItem(KEYS.LEGACY_API_KEY);
  if (legacyKey) {
    localStorage.setItem(KEYS.API_KEY_PREFIX + 'gemini', legacyKey);
    localStorage.removeItem(KEYS.LEGACY_API_KEY);
  }
  
  const legacyModel = localStorage.getItem(KEYS.LEGACY_MODEL);
  if (legacyModel) {
    localStorage.setItem(KEYS.MODEL_PREFIX + 'gemini', legacyModel);
    localStorage.removeItem(KEYS.LEGACY_MODEL);
  }

  const currentProvider = localStorage.getItem(KEYS.PROVIDER);
  if (!currentProvider) {
    localStorage.setItem(KEYS.PROVIDER, 'gemini');
  }
};

// Run migration immediately on load
try {
  migrateKeys();
} catch (e) {
  console.error('Migration failed:', e);
}

export const getProvider = () => {
  return localStorage.getItem(KEYS.PROVIDER) || 'gemini';
};

export const saveProvider = (provider) => {
  localStorage.setItem(KEYS.PROVIDER, provider);
};

export const getApiKey = (provider = getProvider()) => {
  return localStorage.getItem(KEYS.API_KEY_PREFIX + provider) || '';
};

export const saveApiKey = (provider, key) => {
  localStorage.setItem(KEYS.API_KEY_PREFIX + provider, key.trim());
};

export const clearApiKey = (provider = getProvider()) => {
  localStorage.removeItem(KEYS.API_KEY_PREFIX + provider);
};

export const getModelName = (provider = getProvider()) => {
  const saved = localStorage.getItem(KEYS.MODEL_PREFIX + provider);
  if (saved) return saved;

  // Defaults based on provider
  switch (provider) {
    case 'openai':
      return 'gpt-4o-mini';
    case 'anthropic':
      return 'claude-3-5-haiku-latest';
    case 'gemini':
    default:
      return 'gemini-3.5-flash';
  }
};

export const saveModelName = (provider, modelName) => {
  localStorage.setItem(KEYS.MODEL_PREFIX + provider, modelName.trim());
};

export const clearAllKeys = () => {
  localStorage.removeItem(KEYS.PROVIDER);
  localStorage.removeItem(KEYS.API_KEY_PREFIX + 'gemini');
  localStorage.removeItem(KEYS.API_KEY_PREFIX + 'openai');
  localStorage.removeItem(KEYS.API_KEY_PREFIX + 'anthropic');
  localStorage.removeItem(KEYS.MODEL_PREFIX + 'gemini');
  localStorage.removeItem(KEYS.MODEL_PREFIX + 'openai');
  localStorage.removeItem(KEYS.MODEL_PREFIX + 'anthropic');
};

export const getJournalData = () => {
  const data = localStorage.getItem(KEYS.JOURNAL_DATA);
  const defaultVal = {
    logs: [],
    widgets: {
      problems: [],
      learnings: [],
      strengths: [],
      quotes: [],
    },
    goals: [],
    todos: [],
    customWidgets: [],
    runningSummary: ""
  };

  if (!data) return defaultVal;

  try {
    const parsed = JSON.parse(data);
    return {
      logs: parsed.logs || [],
      widgets: parsed.widgets || defaultVal.widgets,
      goals: parsed.goals || [],
      todos: parsed.todos || [],
      customWidgets: parsed.customWidgets || [],
      runningSummary: parsed.runningSummary || ""
    };
  } catch (e) {
    console.error('Failed to parse journal data from localStorage:', e);
    return defaultVal;
  }
};

export const saveJournalData = (data) => {
  localStorage.setItem(KEYS.JOURNAL_DATA, JSON.stringify(data));
};

export const exportData = () => {
  const data = getJournalData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ai-journal-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const importData = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (parsed && Array.isArray(parsed.logs) && parsed.widgets) {
          const normalized = {
            logs: parsed.logs,
            widgets: parsed.widgets,
            goals: parsed.goals || [],
            todos: parsed.todos || [],
            customWidgets: parsed.customWidgets || [],
            runningSummary: parsed.runningSummary || ""
          };
          saveJournalData(normalized);
          resolve(normalized);
        } else {
          reject(new Error('Invalid backup file structure.'));
        }
      } catch (err) {
        reject(new Error('Failed to parse JSON file.'));
      }
    };
    reader.onerror = () => reject(new Error('File reading error.'));
    reader.readAsText(file);
  });
};

export const getUsageHistory = () => {
  const data = localStorage.getItem(KEYS.USAGE);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error('Failed to parse usage history:', e);
    return [];
  }
};

export const saveUsageRecord = (record) => {
  const history = getUsageHistory();
  history.push({
    timestamp: Date.now(),
    ...record
  });
  localStorage.setItem(KEYS.USAGE, JSON.stringify(history));
};

export const clearUsageHistory = () => {
  localStorage.removeItem(KEYS.USAGE);
};
