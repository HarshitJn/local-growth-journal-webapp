import { describe, it, expect } from 'vitest';
import { cleanAndParseJson } from './jsonParser';

describe('cleanAndParseJson', () => {
  it('should parse valid JSON correctly', () => {
    const json = `{
      "problems": ["Struggling to focus on coding"],
      "learnings": ["Turning off phone helps focus"],
      "strengths": ["Persistence in solving bugs"],
      "quotes": ["Quiet the noise around you to discover your drive."]
    }`;
    const result = cleanAndParseJson(json);
    expect(result.problems).toEqual(["Struggling to focus on coding"]);
    expect(result.learnings).toEqual(["Turning off phone helps focus"]);
    expect(result.strengths).toEqual(["Persistence in solving bugs"]);
    expect(result.quotes).toEqual(["Quiet the noise around you to discover your drive."]);
  });

  it('should strip markdown codeblocks and parse successfully', () => {
    const raw = `\`\`\`json
    {
      "problems": ["Friction with team communication"],
      "learnings": ["Direct syncs resolve conflicts faster"],
      "strengths": ["Empathy under pressure"],
      "quotes": ["Listen fully before you seek to be understood."]
    }
    \`\`\``;
    const result = cleanAndParseJson(raw);
    expect(result.problems).toEqual(["Friction with team communication"]);
    expect(result.learnings).toEqual(["Direct syncs resolve conflicts faster"]);
    expect(result.strengths).toEqual(["Empathy under pressure"]);
    expect(result.quotes).toEqual(["Listen fully before you seek to be understood."]);
  });

  it('should handle and repair trailing commas', () => {
    const raw = `{
      "problems": ["Time management issues",],
      "learnings": ["Time blocking works well",],
      "strengths": ["Self-awareness",],
      "quotes": ["Focus on the present moment.",],
    }`;
    const result = cleanAndParseJson(raw);
    expect(result.problems).toEqual(["Time management issues"]);
    expect(result.learnings).toEqual(["Time blocking works well"]);
    expect(result.strengths).toEqual(["Self-awareness"]);
    expect(result.quotes).toEqual(["Focus on the present moment."]);
  });

  it('should repair raw newlines in string properties', () => {
    const raw = `{
      "problems": ["Multi-line
issue description"],
      "learnings": ["Foundations first"],
      "strengths": ["Resilience"],
      "quotes": ["Step by step."]
    }`;
    const result = cleanAndParseJson(raw);
    expect(result.problems).toEqual(["Multi-line\nissue description"]);
  });

  it('should fallback to regex parsing when JSON has unescaped quotes inside strings', () => {
    // This is the classic failure case that the user had!
    // Notice the nested "Zen" and "Art" quotes which make the JSON string invalid.
    const raw = `{
      "problems": ["Struggling to understand "Zen" philosophy"],
      "learnings": ["Read "Zen and the Art of Motorcycle Maintenance" for clarity"],
      "strengths": ["Curiosity about "complex" topics"],
      "quotes": ["Nature does not hurry, yet "everything" is accomplished."]
    }`;
    const result = cleanAndParseJson(raw);
    expect(result.problems).toEqual(["Struggling to understand \"Zen\" philosophy"]);
    expect(result.learnings).toEqual(["Read \"Zen and the Art of Motorcycle Maintenance\" for clarity"]);
    expect(result.strengths).toEqual(["Curiosity about \"complex\" topics"]);
    expect(result.quotes).toEqual(["Nature does not hurry, yet \"everything\" is accomplished."]);
  });

  it('should fallback to regex parsing when JSON is completely garbled', () => {
    const raw = `
      Some conversational LLM text before JSON...
      "problems": [
        "First problem is here",
        "Second unescaped "quote" problem"
      ],
      "learnings": [
        'Learned with single quotes'
      ],
      "strengths": [
        "Logical thinking"
      ],
      "quotes": [
        "Quiet minds carry strength."
      ]
      And some text after JSON...
    `;
    const result = cleanAndParseJson(raw);
    expect(result.problems).toEqual(["First problem is here", "Second unescaped \"quote\" problem"]);
    expect(result.learnings).toEqual(["Learned with single quotes"]);
    expect(result.strengths).toEqual(["Logical thinking"]);
    expect(result.quotes).toEqual(["Quiet minds carry strength."]);
  });

  it('should return empty lists for null or undefined input', () => {
    const result = cleanAndParseJson(null);
    expect(result).toEqual({ problems: [], learnings: [], strengths: [], quotes: [] });
  });
});
