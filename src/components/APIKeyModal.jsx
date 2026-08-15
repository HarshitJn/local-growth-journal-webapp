import React, { useState, useRef, useEffect } from 'react';
import { Key, Eye, EyeOff, Save, Trash2, HelpCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import { 
  getProvider, 
  saveProvider, 
  getApiKey, 
  saveApiKey, 
  clearApiKey, 
  getModelName, 
  saveModelName 
} from '../utils/storage';

export default function APIKeyModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1); // 1: Select Provider, 2: Key & Model
  const [selectedProvider, setSelectedProvider] = useState('gemini');
  const [apiKey, setApiKeyState] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [modelName, setModelNameState] = useState('');
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [customModel, setCustomModel] = useState('');
  const dropdownRef = useRef(null);

  // Load state on open/mount
  useEffect(() => {
    const prov = getProvider();
    setSelectedProvider(prov);
    loadProviderConfig(prov);
  }, []);

  const loadProviderConfig = (prov) => {
    setApiKeyState(getApiKey(prov));
    
    const savedModel = getModelName(prov);
    const standardModels = [
      'gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-pro',
      'gpt-4o-mini', 'gpt-4o', 'o3-mini', 'o1-mini', 'gpt-4-turbo',
      'claude-3-5-haiku-latest', 'claude-3-5-sonnet-latest', 'claude-3-opus-latest',
      'claude-3-5-haiku', 'claude-3-5-sonnet', 'claude-3-opus'
    ];

    if (standardModels.includes(savedModel)) {
      setModelNameState(savedModel);
      setIsCustomModel(false);
    } else {
      setModelNameState('custom');
      setIsCustomModel(true);
      setCustomModel(savedModel);
    }
  };

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setStep(1); // Reset step on close
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleProviderSelect = (prov) => {
    setSelectedProvider(prov);
    loadProviderConfig(prov);
  };

  const handleSave = () => {
    saveProvider(selectedProvider);
    saveApiKey(selectedProvider, apiKey);
    saveModelName(selectedProvider, modelName === 'custom' ? customModel : modelName);
    setIsOpen(false);
    setStep(1);
    window.location.reload();
  };

  const handleClear = () => {
    const provName = selectedProvider.toUpperCase();
    if (window.confirm(`Clear your API Key and Model configuration for ${provName}?`)) {
      clearApiKey(selectedProvider);
      setApiKeyState('');
      setIsOpen(false);
      setStep(1);
      window.location.reload();
    }
  };

  const hasKey = getApiKey(getProvider()).trim().length > 0;

  // Recommended models list based on selection
  const getModelsForProvider = () => {
    switch (selectedProvider) {
      case 'openai':
        return [
          { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast)' },
          { value: 'gpt-4o', label: 'GPT-4o (Standard)' },
          { value: 'o3-mini', label: 'OpenAI o3-mini (Latest Reasoning)' },
          { value: 'o1-mini', label: 'OpenAI o1-mini (Reasoning)' }
        ];
      case 'anthropic':
        return [
          { value: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku (Latest)' },
          { value: 'claude-3-5-sonnet-latest', label: 'Claude 3.5 Sonnet v2 (Latest)' },
          { value: 'claude-3-opus-latest', label: 'Claude 3 Opus (Latest)' }
        ];
      case 'gemini':
      default:
        return [
          { value: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash (Standard)' },
          { value: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash' },
          { value: 'gemini-3.7-flash', label: 'Gemini 3.7 Flash (Latest)' },
          { value: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash Lite' },
          { value: 'gemini-3.1-pro', label: 'Gemini 3.1 Pro' }
        ];
    }
  };

  const getHelpLink = () => {
    switch (selectedProvider) {
      case 'openai':
        return 'https://platform.openai.com/api-keys';
      case 'anthropic':
        return 'https://console.anthropic.com/settings/keys';
      case 'gemini':
      default:
        return 'https://aistudio.google.com/';
    }
  };

  const providerNames = {
    gemini: 'Google Gemini',
    openai: 'OpenAI ChatGPT',
    anthropic: 'Anthropic Claude'
  };

  return (
    <div className="settings-control" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="settings-btn"
        title="Configure LLM & API Keys"
      >
        <Key size={20} />
        <span className={`key-badge ${hasKey ? 'configured' : 'missing'}`} />
      </button>

      {isOpen && (
        <div className="settings-dropdown" style={{ minHeight: '260px' }}>
          {step === 1 ? (
            /* STEP 1: SELECT PROVIDER */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0 }}>Select LLM Provider</h4>
              </div>
              <p style={{ margin: 0 }}>Choose the service you want to use for journaling insights.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, margin: '8px 0' }}>
                {Object.entries(providerNames).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => handleProviderSelect(key)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: selectedProvider === key ? '2px solid var(--accent)' : '1px solid var(--card-border)',
                      background: selectedProvider === key ? 'var(--accent-light)' : 'var(--input-bg)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      fontWeight: selectedProvider === key ? '600' : '400',
                      transition: 'all 0.2s ease',
                      textAlign: 'left'
                    }}
                  >
                    <span>{label}</span>
                    {selectedProvider === key && (
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--accent)'
                      }} />
                    )}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setStep(2)}
                className="save-key-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  marginTop: 'auto'
                }}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          ) : (
            /* STEP 2: CONFIGURE API KEY & MODEL */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  onClick={() => setStep(1)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="Back to Provider Selection"
                >
                  <ChevronLeft size={16} />
                </button>
                <h4 style={{ margin: 0, fontSize: '0.9rem' }}>Configure {providerNames[selectedProvider]}</h4>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: '500', color: 'var(--text-secondary)' }}>
                  API Key
                </label>
                <a
                  href={getHelpLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.75rem',
                    color: 'var(--accent)',
                    textDecoration: 'none'
                  }}
                >
                  <HelpCircle size={12} /> Get Key
                </a>
              </div>

              <div className="api-input-wrapper">
                <div style={{ position: 'relative', flex: 1, display: 'flex' }}>
                  <input
                    type={showKey ? 'text' : 'password'}
                    className="api-input"
                    placeholder={`${selectedProvider.toUpperCase()}_API_KEY`}
                    value={apiKey}
                    onChange={(e) => setApiKeyState(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', margin: '4px 0' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: '500', color: 'var(--text-secondary)' }}>
                  Model Version
                </label>
                <select
                  value={modelName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setModelNameState(val);
                    setIsCustomModel(val === 'custom');
                    if (val !== 'custom') {
                      setCustomModel('');
                    }
                  }}
                  style={{
                    width: '100%',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--input-border)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '0.85rem',
                    color: 'var(--text-primary)',
                    outline: 'none'
                  }}
                >
                  {getModelsForProvider().map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                  <option value="custom">Custom Model Name...</option>
                </select>

                {isCustomModel && (
                  <input
                    type="text"
                    className="api-input"
                    placeholder="Enter custom model identifier"
                    value={customModel}
                    onChange={(e) => setCustomModel(e.target.value)}
                    style={{ marginTop: '4px' }}
                  />
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button
                  onClick={handleSave}
                  className="save-key-btn"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  disabled={!apiKey.trim()}
                >
                  <Save size={14} /> Save Config
                </button>
                {getApiKey(selectedProvider).trim().length > 0 && (
                  <button
                    onClick={handleClear}
                    style={{
                      background: 'rgba(217, 56, 58, 0.1)',
                      color: '#d9383a',
                      border: '1px solid rgba(217, 56, 58, 0.2)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Clear Configuration"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
