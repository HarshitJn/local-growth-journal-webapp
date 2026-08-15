// src/utils/llm.js
import { cleanAndParseJson } from './jsonParser';

/**
 * Dispatches journal logs to the configured LLM provider to extract insights.
 * 
 * @param {Array} logs - The list of journal logs
 * @param {string} provider - 'gemini', 'openai', or 'anthropic'
 * @param {string} apiKey - The provider's API key
 * @param {string} modelName - The model to use
 * @returns {Promise<Object>} Object with problems, learnings, strengths, quotes
 */
export async function analyzeJournal(logs, provider, apiKey, modelName, goals = [], todos = []) {
  if (!apiKey) {
    throw new Error(`Please configure your API Key for ${provider.toUpperCase()} in settings.`);
  }

  if (!logs || logs.length === 0) {
    return { problems: [], learnings: [], strengths: [], quotes: [] };
  }

  const recentLogs = logs.slice(-30);
  const logContent = recentLogs.map((log, index) => 
    `[Log #${index + 1} - ${new Date(log.timestamp).toLocaleDateString()}]\n${log.text}`
  ).join('\n\n');

  const activeGoalsStr = goals.filter(g => !g.completed).map(g => `- ${g.text}`).join('\n');
  const activeTodosStr = todos.filter(t => !t.completed).map(t => `- ${t.text}`).join('\n');

  const systemInstruction = `You are a peaceful, empathetic AI journal companion designed to help the user reflect. 
Analyze the user's journal logs, active goals, and active todos (ordered from oldest to newest) and extract/update insights.

Crucial Rule: Write all bullet points for "problems", "learnings", and "strengths" in the FIRST PERSON (using "I", "my", "me", "myself") from the perspective of the user writing personal notes to themselves. 
For example:
- Problems: "I am lacking a clear, directed goal" instead of "Lacking a clear, directed goal"
- Learnings: "I realized that setting daily routines keeps me focused" instead of "Realized that setting daily routines keeps focus"
- Strengths: "I show persistence when building complex projects" instead of "Shows persistence when building complex projects"

Extract:
1. "problems": Current problems, friction points, or blockers I am currently facing (exactly 5 to 12 words per item, maximum of 5 items).
2. "learnings": Key learnings, realizations, or takeaways I have discovered (exactly 5 to 12 words per item, maximum of 5 items).
3. "strengths": Personal strengths, resilience, or virtues I have displayed (exactly 5 to 12 words per item, maximum of 5 items).
4. "quotes": Memorable one-liner quotes/mantras of exactly 10 to 15 words that synthesize my journey, inspire peace, and serve as easy-to-remember reminders (maximum of 3 items).

Response MUST be a valid JSON object matching this schema:
{
  "problems": ["string"],
  "learnings": ["string"],
  "strengths": ["string"],
  "quotes": ["string"]
}
Return ONLY the raw JSON object. Do not add markdown codeblocks, prefix conversational words, or trailing text.`;

  const prompt = `User Journal Logs:
${logContent}

Active User Goals:
${activeGoalsStr || "None set."}

Active User Todos:
${activeTodosStr || "None set."}

Based on these journal logs and my current active goals/todos, extract problems, learnings, strengths, and quotes in the requested JSON format. Analyze how my logs relate to, reflect progress on, or show blockers concerning these active goals/todos.`;

  switch (provider) {
    case 'openai':
      return callOpenAI(prompt, apiKey, modelName, systemInstruction);
    case 'anthropic':
      return callAnthropic(prompt, apiKey, modelName, systemInstruction);
    case 'gemini':
    default:
      return callGemini(prompt, apiKey, modelName, systemInstruction);
  }
}

async function callGemini(prompt, apiKey, modelName, systemInstruction) {
  // Use v1beta endpoint for consistency with model support
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: `${systemInstruction}\n\n${prompt}` }]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.3
      }
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || `Gemini API returned status ${response.status}`);
  }

  const json = await response.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini API returned an empty response.');
  }

  const usage = json.usageMetadata ? {
    inputTokens: json.usageMetadata.promptTokenCount || 0,
    outputTokens: json.usageMetadata.candidatesTokenCount || 0
  } : { inputTokens: 0, outputTokens: 0 };

  return {
    insights: cleanAndParseJson(text),
    usage
  };
}

async function callOpenAI(prompt, apiKey, modelName, systemInstruction) {
  const url = 'https://api.openai.com/v1/chat/completions';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: modelName,
      response_format: { type: 'json_object' },
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || `OpenAI API returned status ${response.status}`);
  }

  const json = await response.json();
  const text = json.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error('OpenAI API returned an empty response.');
  }

  const usage = json.usage ? {
    inputTokens: json.usage.prompt_tokens || 0,
    outputTokens: json.usage.completion_tokens || 0
  } : { inputTokens: 0, outputTokens: 0 };

  return {
    insights: cleanAndParseJson(text),
    usage
  };
}

async function callAnthropic(prompt, apiKey, modelName, systemInstruction) {
  const url = 'https://api.anthropic.com/v1/messages';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      // Enable direct browser request support in client
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: modelName,
      max_tokens: 4000,
      temperature: 0.3,
      system: systemInstruction,
      messages: [
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || `Anthropic API returned status ${response.status}`);
  }

  const json = await response.json();
  const text = json.content?.[0]?.text;
  if (!text) {
    throw new Error('Anthropic API returned an empty response.');
  }

  const usage = json.usage ? {
    inputTokens: json.usage.input_tokens || 0,
    outputTokens: json.usage.output_tokens || 0
  } : { inputTokens: 0, outputTokens: 0 };

  return {
    insights: cleanAndParseJson(text),
    usage
  };
}

const PRICING = {
  gemini: {
    'gemini-3.5-flash': { input: 0.075 / 1000000, output: 0.30 / 1000000 },
    'gemini-3.6-flash': { input: 0.075 / 1000000, output: 0.30 / 1000000 },
    'gemini-3.7-flash': { input: 0.075 / 1000000, output: 0.30 / 1000000 },
    'gemini-3.5-flash-lite': { input: 0.03 / 1000000, output: 0.12 / 1000000 },
    'gemini-3.1-pro': { input: 1.25 / 1000000, output: 5.00 / 1000000 },
    default: { input: 0.075 / 1000000, output: 0.30 / 1000000 }
  },
  openai: {
    'gpt-4o-mini': { input: 0.15 / 1000000, output: 0.60 / 1000000 },
    'gpt-4o': { input: 2.50 / 1000000, output: 10.00 / 1000000 },
    'o3-mini': { input: 1.10 / 1000000, output: 4.40 / 1000000 },
    'o1-mini': { input: 1.10 / 1000000, output: 4.40 / 1000000 },
    'gpt-4-turbo': { input: 10.00 / 1000000, output: 30.00 / 1000000 },
    default: { input: 0.15 / 1000000, output: 0.60 / 1000000 }
  },
  anthropic: {
    'claude-3-5-haiku-latest': { input: 0.80 / 1000000, output: 4.00 / 1000000 },
    'claude-3-5-haiku': { input: 0.80 / 1000000, output: 4.00 / 1000000 },
    'claude-3-5-sonnet-latest': { input: 3.00 / 1000000, output: 15.00 / 1000000 },
    'claude-3-5-sonnet': { input: 3.00 / 1000000, output: 15.00 / 1000000 },
    'claude-3-opus-latest': { input: 15.00 / 1000000, output: 75.00 / 1000000 },
    'claude-3-opus': { input: 15.00 / 1000000, output: 75.00 / 1000000 },
    default: { input: 0.80 / 1000000, output: 4.00 / 1000000 }
  }
};

export function calculateCost(provider, model, inputTokens, outputTokens) {
  const rates = PRICING[provider]?.[model] || PRICING[provider]?.default || { input: 0, output: 0 };
  return (inputTokens * rates.input) + (outputTokens * rates.output);
}

export async function analyzeSingleWidget(logs, widgetKey, provider, apiKey, modelName, goals = [], todos = []) {
  if (!apiKey) {
    throw new Error(`Please configure your API Key for ${provider.toUpperCase()} in settings.`);
  }

  if (!logs || logs.length === 0) {
    return { items: [], usage: { inputTokens: 0, outputTokens: 0 } };
  }

  const recentLogs = logs.slice(-30);
  const logContent = recentLogs.map((log, index) => 
    `[Log #${index + 1} - ${new Date(log.timestamp).toLocaleDateString()}]\n${log.text}`
  ).join('\n\n');

  const activeGoalsStr = goals.filter(g => !g.completed).map(g => `- ${g.text}`).join('\n');
  const activeTodosStr = todos.filter(t => !t.completed).map(t => `- ${t.text}`).join('\n');

  const descriptions = {
    problems: 'Current problems, friction points, or blockers I am currently facing (exactly 5 to 12 words per item, maximum of 5 items). Write in the FIRST PERSON (using "I", "my", "me").',
    learnings: 'Key learnings, realizations, or takeaways I have discovered (exactly 5 to 12 words per item, maximum of 5 items). Write in the FIRST PERSON (using "I", "my", "me").',
    strengths: 'Personal strengths, resilience, or virtues I have displayed (exactly 5 to 12 words per item, maximum of 5 items). Write in the FIRST PERSON (using "I", "my", "me").',
    quotes: 'Memorable one-liner quotes/mantras of exactly 10 to 15 words that synthesize my journey, inspire peace, and serve as easy-to-remember reminders (maximum of 3 items).'
  };

  const systemInstruction = `You are a peaceful, empathetic AI journal companion designed to help the user reflect. 
Analyze the user's journal logs, active goals, and active todos (ordered from oldest to newest) and extract/update insights for the specific section: "${widgetKey}".

Section description to extract:
- "${widgetKey}": ${descriptions[widgetKey]}

Response MUST be a valid JSON object matching this schema:
{
  "${widgetKey}": ["string"]
}
Return ONLY the raw JSON object. Do not add markdown codeblocks, prefix conversational words, or trailing text.`;

  const prompt = `User Journal Logs:
${logContent}

Active User Goals:
${activeGoalsStr || "None set."}

Active User Todos:
${activeTodosStr || "None set."}

Based on these journal logs and my current active goals/todos, extract only the list for "${widgetKey}" in the requested JSON format. Analyze how my logs relate to, reflect progress on, or show blockers concerning these active goals/todos.`;

  let response;
  switch (provider) {
    case 'openai':
      response = await callOpenAI(prompt, apiKey, modelName, systemInstruction);
      break;
    case 'anthropic':
      response = await callAnthropic(prompt, apiKey, modelName, systemInstruction);
      break;
    case 'gemini':
    default:
      response = await callGemini(prompt, apiKey, modelName, systemInstruction);
      break;
  }

  return {
    items: response.insights[widgetKey] || [],
    usage: response.usage
  };
}
