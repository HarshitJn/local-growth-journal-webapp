/**
 * Parse JSON string that might be returned in a markdown block or have minor formatting issues.
 * 
 * @param {string} text - Raw text response from LLM
 * @returns {Object} Parsed JSON with problems, learnings, strengths, and quotes
 */
export function cleanAndParseJson(text) {
  if (!text || typeof text !== 'string') {
    return { problems: [], learnings: [], strengths: [], quotes: [] };
  }

  // 1. Remove markdown formatting if present
  let cleanText = text.trim();
  if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/^```(?:json)?\n?/i, '').replace(/```\s*$/, '').trim();
  }

  // 2. Attempt standard parse
  try {
    const parsed = JSON.parse(cleanText);
    return sanitizeOutput(parsed);
  } catch (firstError) {
    console.warn("Standard JSON parse failed, attempting auto-repair...", firstError.message);
    
    // 3. Attempt simple repairs (e.g., trailing commas, raw newlines inside strings)
    try {
      let repaired = cleanText
        // Remove trailing commas before closing braces/brackets
        .replace(/,\s*\]/g, ']')
        .replace(/,\s*\}/g, '}')
        // Replace raw newlines in string properties with \n
        .replace(/(:\s*"[^"]*)\n([^"]*")/g, '$1\\n$2');
      
      const parsed = JSON.parse(repaired);
      return sanitizeOutput(parsed);
    } catch (secondError) {
      console.warn("Auto-repair failed. Parsing fields with regex fallback...", secondError.message);
      
      // 4. Fallback: Parse individual fields via regular expressions
      return parseJsonWithRegexFallback(cleanText);
    }
  }
}

/**
 * Ensures the returned object always matches the expected schema.
 */
function sanitizeOutput(obj) {
  const result = {
    problems: [],
    learnings: [],
    strengths: [],
    quotes: []
  };

  if (obj && typeof obj === 'object') {
    if (Array.isArray(obj.problems)) result.problems = obj.problems.map(String);
    if (Array.isArray(obj.learnings)) result.learnings = obj.learnings.map(String);
    if (Array.isArray(obj.strengths)) result.strengths = obj.strengths.map(String);
    if (Array.isArray(obj.quotes)) result.quotes = obj.quotes.map(String);
  }

  return result;
}

/**
 * Extracts arrays of strings from poorly-formatted JSON text using regex.
 */
function parseJsonWithRegexFallback(text) {
  const result = {
    problems: [],
    learnings: [],
    strengths: [],
    quotes: []
  };

  const keys = ['problems', 'learnings', 'strengths', 'quotes'];

  keys.forEach((key) => {
    // Look for: "key" : [ ... ] with any whitespace or quotes around key
    const regex = new RegExp(`['"]?${key}['"]?\\s*:\\s*\\[([\\s\\S]*?)\\]`, 'i');
    const match = text.match(regex);
    if (match && match[1]) {
      const itemsText = match[1].trim();
      if (!itemsText) return;

      // Split by boundary quotes and commas: e.g. ", " or ', ' or ',"
      const boundaryRegex = /\s*['"]\s*,\s*['"]\s*/;
      const rawItems = itemsText.split(boundaryRegex);

      rawItems.forEach((item) => {
        let cleaned = item.trim();
        // Strip leading quote
        cleaned = cleaned.replace(/^['"]/, '');
        // Strip trailing quote
        cleaned = cleaned.replace(/['"]$/, '');
        
        // Unescape internal quotes if they were escaped
        cleaned = cleaned.replace(/\\"/g, '"').replace(/\\'/g, "'").trim();
        
        if (cleaned) {
          result[key].push(cleaned);
        }
      });
    }
  });

  return result;
}
