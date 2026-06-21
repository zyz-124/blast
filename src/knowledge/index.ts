// Knowledge base types
export interface Solution {
  type: 'install' | 'check' | 'fix' | 'config' | 'note';
  title: string;
  steps: string[];
  title_zh?: string;
  steps_zh?: string[];
}

export interface ErrorEntry {
  id: string;
  title: string;
  patterns: string[];
  solutions: Solution[];
  code_fix?: string;
  ref?: string;
  title_zh?: string;
  solutions_zh?: Solution[];
}

export interface MatchResult {
  entry: ErrorEntry;
  match: RegExpMatchArray;
  confidence: number;
}

// Knowledge base loader — multi-language support
import * as pythonData from './data/python.json';
import * as javascriptData from './data/javascript.json';
import * as golangData from './data/golang.json';
import * as rustData from './data/rust.json';
import * as javaData from './data/java.json';
import * as commonData from './data/common.json';
import * as dockerData from './data/docker.json';
import { CustomKnowledgeBase } from './custom';

const builtInKB: ErrorEntry[] = [
  ...(pythonData as any).default || pythonData,
  ...(javascriptData as any).default || javascriptData,
  ...(golangData as any).default || golangData,
  ...(rustData as any).default || rustData,
  ...(javaData as any).default || javaData,
  ...(commonData as any).default || commonData,
  ...(dockerData as any).default || dockerData,
];

export function loadKnowledgeBase(): ErrorEntry[] {
  return [...builtInKB, ...CustomKnowledgeBase.load()];
}

export function getKnowledgeBaseSize(): number {
  return builtInKB.length + CustomKnowledgeBase.getCount();
}

export function findMatch(input: string): MatchResult | null {
  const entries = loadKnowledgeBase();
  for (const entry of entries) {
    for (const pattern of entry.patterns) {
      try {
        const regex = new RegExp(pattern);
        const match = input.match(regex);
        if (match) {
          return {
            entry,
            match,
            confidence: 100,
          };
        }
      } catch (e) {
        // Invalid regex, skip
      }
    }
  }
  return null;
}
