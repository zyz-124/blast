import { ErrorEntry, MatchResult } from '../knowledge/index';

export class MatcherEngine {
  private _getEntries: () => ErrorEntry[];

  constructor(getEntries: () => ErrorEntry[]) {
    this._getEntries = getEntries;
  }

  findMatch(input: string): MatchResult | null {
    const entries = this._getEntries();
    let best: MatchResult | null = null;
    let bestLength = 0;

    for (const entry of entries) {
      for (const pattern of entry.patterns) {
        try {
          const regex = new RegExp(pattern);
          const match = input.match(regex);
          if (match && match[0].length > bestLength) {
            best = {
              entry,
              match,
              confidence: Math.min(100, Math.round(match[0].length / input.length * 100)),
            };
            bestLength = match[0].length;
          }
        } catch (e) {
          // Invalid regex, skip
        }
      }
    }

    return best;
  }

  analyzeText(text: string): MatchResult | null {
    // For multi-line input, try matching each line
    const lines = text.split('\n');
    let best: MatchResult | null = null;
    let bestLength = 0;

    for (const line of lines) {
      const result = this.findMatch(line);
      if (result && result.match[0].length > bestLength) {
        best = result;
        bestLength = result.match[0].length;
      }
    }

    // Also try matching the entire text as one block, but only if better
    const fullResult = this.findMatch(text);
    if (fullResult && fullResult.match[0].length > bestLength) {
      best = fullResult;
    }

    return best;
  }
}
