import * as path from 'path';
import * as fs from 'fs';
import { ErrorEntry } from './index';

const CUSTOM_FILENAME = 'blast-custom.json';

function getStoragePath(): string {
  // Walk up from __dirname to find .vscode/
  // Or use a fixed location — workspace folder is unreliable in tests
  const parts = __dirname.split(path.sep);
  // Find the workspace root by looking for package.json
  for (let i = parts.length; i > 0; i--) {
    const candidate = parts.slice(0, i).join(path.sep);
    if (fs.existsSync(path.join(candidate, 'package.json'))) {
      return path.join(candidate, '.vscode', CUSTOM_FILENAME);
    }
  }
  return path.join(__dirname, '..', '..', '.vscode', CUSTOM_FILENAME);
}

export class CustomKnowledgeBase {
  static get storagePath(): string {
    return getStoragePath();
  }

  static load(): ErrorEntry[] {
    const p = this.storagePath;
    if (!p || !fs.existsSync(p)) return [];
    try {
      const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  static save(entries: ErrorEntry[]): void {
    const p = this.storagePath;
    if (!p) return;
    const dir = path.dirname(p);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(p, JSON.stringify(entries, null, 2), 'utf-8');
  }

  static add(entry: ErrorEntry): void {
    const all = this.load();
    all.push(entry);
    this.save(all);
  }

  static remove(id: string): void {
    const all = this.load().filter(e => e.id !== id);
    this.save(all);
  }

  static getCount(): number {
    return this.load().length;
  }

  /** Import entries from a JSON file path. Returns [mergedCount, skippedCount] */
  static importFromFile(filePath: string): [number, number] {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const imported: ErrorEntry[] = JSON.parse(raw);
    if (!Array.isArray(imported)) return [0, 0];

    const valid = imported.filter(
      e => e.id && e.title && Array.isArray(e.patterns) && Array.isArray(e.solutions)
    );
    const skipped = imported.length - valid.length;

    const existing = this.load();
    const existingIds = new Set(existing.map(e => e.id));
    const merged = valid.filter(e => !existingIds.has(e.id));

    if (merged.length > 0) {
      this.save([...existing, ...merged]);
    }
    return [merged.length, skipped];
  }

  /** Export entries to a JSON file path. Returns the number of entries written */
  static exportToFile(filePath: string): number {
    const all = this.load();
    if (all.length > 0) {
      fs.writeFileSync(filePath, JSON.stringify(all, null, 2), 'utf-8');
    }
    return all.length;
  }
}
