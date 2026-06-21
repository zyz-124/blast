import * as vscode from 'vscode';
import * as cp from 'child_process';
import { MatcherEngine } from './matcher/engine';
import { loadKnowledgeBase } from './knowledge/index';
import { CustomKnowledgeBase } from './knowledge/custom';
import { BlastSidebarProvider } from './panels/sidebar';
import { callAI, buildSystemPrompt, buildUserPrompt } from './ai';
import type { AiConfig, AiAnalysis } from './ai';

// ──────────────────────────────────────────────
// Config
// ──────────────────────────────────────────────
let _secretStorage: vscode.SecretStorage;

function getConfig() {
  const cfg = vscode.workspace.getConfiguration('blast');
  return {
    locale: cfg.get<string>('locale', 'en'),
    runner: {
      python: cfg.get<string>('runner.python', 'python'),
      javascript: cfg.get<string>('runner.javascript', 'node'),
      typescript: cfg.get<string>('runner.typescript', 'npx ts-node'),
      go: cfg.get<string>('runner.go', 'go run'),
      ruby: cfg.get<string>('runner.ruby', 'ruby'),
    },
    showConfidence: cfg.get<boolean>('showConfidence', true),
    ai: {
      provider: cfg.get<string>('ai.provider', 'openai'),
      endpoint: cfg.get<string>('ai.endpoint', 'https://api.openai.com/v1'),
      model: cfg.get<string>('ai.model', 'gpt-4o-mini'),
      maxTokens: cfg.get<number>('ai.maxTokens', 2000),
      temperature: cfg.get<number>('ai.temperature', 0.3),
    },
  };
}

/** Read AI config including secret-stored API key */
async function getAiConfig(): Promise<AiConfig | null> {
  const cfg = getConfig().ai;
  const apiKey = await _secretStorage.get('blast.ai.apiKey');
  if (!apiKey) return null;
  return { ...cfg, apiKey };
}

/** Store API key in secret storage */
async function setAiKey(key: string): Promise<void> {
  await _secretStorage.store('blast.ai.apiKey', key);
}

/** Capture editor context around the current selection */
function captureContext(): { language: string; filePath: string; codeSnippet: string } | undefined {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return undefined;

  const doc = editor.document;
  const selection = editor.selection;
  const startLine = Math.max(0, selection.start.line - 30);
  const endLine = Math.min(doc.lineCount - 1, selection.end.line + 30);
  const range = new vscode.Range(startLine, 0, endLine, doc.lineAt(endLine).text.length);

  return {
    language: doc.languageId,
    filePath: doc.uri.fsPath,
    codeSnippet: doc.getText(range),
  };
}

/** Map languageId to a short name for AI prompt */
function languageName(id: string): string {
  const map: Record<string, string> = {
    python: 'python', javascript: 'javascript', typescript: 'typescript',
    go: 'golang', rust: 'rust', java: 'java',
    ruby: 'ruby', c: 'c', cpp: 'cpp', csharp: 'csharp',
    php: 'php', swift: 'swift', kotlin: 'kotlin', scala: 'scala',
    shellscript: 'bash', powershell: 'powershell',
    dockerfile: 'docker', yaml: 'yaml', json: 'json',
  };
  return map[id] || id;
}

// ──────────────────────────────────────────────
// Activate
// ──────────────────────────────────────────────
export function activate(context: vscode.ExtensionContext) {
  console.log('Blast is ready.');
  _secretStorage = context.secrets;

  const matcher = new MatcherEngine(() => loadKnowledgeBase());
  const sidebarProvider = new BlastSidebarProvider();

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('blast.sidebar', sidebarProvider)
  );

  // ── Config sync ──
  function syncConfig() {
    const cfg = getConfig();
    sidebarProvider.setLocale(cfg.locale);
    sidebarProvider.setRunnerConfig(cfg.runner);
    sidebarProvider.setShowConfidence(cfg.showConfidence);
    sidebarProvider.setAiConfigured(false);
  }
  syncConfig();
  // Push AI config to sidebar view (one-time per view creation, via resolveWebviewView)
  pushAiConfigToSidebar();
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('blast')) syncConfig();
    })
  );

  async function pushAiConfigToSidebar() {
    const cfg = getConfig();
    const apiKey = await _secretStorage.get('blast.ai.apiKey');
    sidebarProvider.setAiConfigured(!!apiKey);
    sidebarProvider.setAiConfig({
      provider: cfg.ai.provider,
      endpoint: cfg.ai.endpoint,
      model: cfg.ai.model,
      maxTokens: cfg.ai.maxTokens,
      hasKey: !!apiKey,
    });
  }

  // ── Sidebar messages ──
  sidebarProvider.onMessage = async (msg: any) => {
    switch (msg.type) {
      case 'analyze': {
        const text = msg.text?.trim();
        if (text) showResult(text, true);
        break;
      }
      case 'back':
        sidebarProvider.clear();
        break;
      case 'saveToKb': {
        saveAiToKb(msg.data);
        break;
      }
      case 'setAiProvider':
        vscode.workspace.getConfiguration('blast').update('ai.provider', msg.value, true);
        break;
      case 'setAiEndpoint':
        vscode.workspace.getConfiguration('blast').update('ai.endpoint', msg.value, true);
        break;
      case 'setAiModel':
        vscode.workspace.getConfiguration('blast').update('ai.model', msg.value, true);
        break;
      case 'setAiMaxTokens':
        vscode.workspace.getConfiguration('blast').update('ai.maxTokens', parseInt(msg.value) || 2000, true);
        break;
      case 'setAiKey': {
        await setAiKey(msg.value);
        vscode.window.showInformationMessage('🔑 AI API key saved securely.');
        break;
      }
      case 'clearAiKey': {
        await _secretStorage.delete('blast.ai.apiKey');
        vscode.window.showInformationMessage('🗑️ AI API key removed.');
        break;
      }
      case 'testAi': {
        testAiConnection(msg.provider, msg.endpoint, msg.model, msg.key, msg.maxTokens);
        break;
      }
      case 'saveAiConfig': {
        vscode.workspace.getConfiguration('blast').update('ai.provider', msg.provider || 'custom', true);
        vscode.workspace.getConfiguration('blast').update('ai.endpoint', msg.endpoint || '', true);
        vscode.workspace.getConfiguration('blast').update('ai.model', msg.model || '', true);
        vscode.workspace.getConfiguration('blast').update('ai.maxTokens', msg.maxTokens || 2000, true);
        // Only save key when user explicitly typed one; never overwrite with empty
        if (msg.key) {
          await setAiKey(msg.key);
        }
        // Re-read so sidebar shows current values after Back
        const saved = getConfig();
        sidebarProvider.setAiConfig({
          provider: saved.ai.provider,
          endpoint: saved.ai.endpoint,
          model: saved.ai.model,
          maxTokens: saved.ai.maxTokens,
          hasKey: !!(msg.key || (await _secretStorage.get('blast.ai.apiKey'))),
        });
        vscode.window.showInformationMessage('✅ AI config saved');
        break;
      }
      case 'switchTab':
      case 'setLocale': {
        const blastCfg = vscode.workspace.getConfiguration('blast');
        await blastCfg.update('locale', msg.value, vscode.ConfigurationTarget.Global);
        sidebarProvider.setLocale(msg.value);
        break;
      }
      case 'setRunner': {
        const lang = (msg as any).lang;
        const value = (msg as any).value;
        if (lang && value) {
          await vscode.workspace.getConfiguration('blast').update(`runner.${lang}`, value, vscode.ConfigurationTarget.Global);
          sidebarProvider.setRunnerEntry(lang, value);
        }
        break;
      }
      case 'setConfidence': {
        const show = (msg as any).value;
        await vscode.workspace.getConfiguration('blast').update('showConfidence', show, vscode.ConfigurationTarget.Global);
        sidebarProvider.setShowConfidence(show);
        break;
      }
      case 'addCustomEntry':
      case 'deleteCustomEntry':
      case 'importKb':
      case 'exportKb':
      case 'refreshCustomKB':
        // Handled internally by sidebarProvider
        break;
    }
  };

  // ── Core: analyze & show ──
  function showResult(errorText: string, captureContextForAI = false) {
    const kbResult = matcher.analyzeText(errorText);
    const ctx = captureContextForAI ? captureContext() : undefined;

    if (kbResult) {
      sidebarProvider.showResult(kbResult);
      // Fire AI async (non-blocking)
      fireAI(errorText, ctx);
    } else {
      sidebarProvider.showResult(null);
      // No KB match — fire AI
      fireAI(errorText, ctx);
    }
  }

  async function fireAI(errorText: string, ctx?: { language: string; filePath: string; codeSnippet: string }) {
    const aiConfig = await getAiConfig();
    if (!aiConfig) {
      sidebarProvider.showAiError('API key not configured. Go to Settings → AI Provider, enter your API Key, then press Tab to save.');
      return;
    }

    // Signal to sidebar that AI is loading
    sidebarProvider.showAiLoading(true);

    const result = await callAI(
      buildSystemPrompt(getConfig().locale),
      buildUserPrompt(errorText, ctx ? {
        language: languageName(ctx.language),
        filePath: ctx.filePath,
        codeSnippet: ctx.codeSnippet,
      } : undefined),
      aiConfig
    );

    sidebarProvider.showAiLoading(false);

    if (result.success && result.analysis) {
      sidebarProvider.showAiResult(result.analysis);
    } else {
      sidebarProvider.showAiError(result.error || 'AI request failed');
    }
  }

  function saveAiToKb(analysis: AiAnalysis) {
    if (!analysis.kb_entry || !analysis.title) {
      vscode.window.showErrorMessage('No KB entry data to save.');
      return;
    }
    CustomKnowledgeBase.add({
      id: analysis.kb_entry.id || `ai-gen-${Date.now()}`,
      title: analysis.title,
      patterns: analysis.kb_entry.patterns || [],
      solutions: analysis.solutions.map(s => ({
        type: (s.type as any) || 'fix',
        title: s.title,
        steps: s.steps,
      })),
      code_fix: analysis.code_fix,
      ref: analysis.ref,
    });
    vscode.window.showInformationMessage('💾 Saved AI analysis to My KB.');
    sidebarProvider.refreshCustomKB();
  }

  async function testAiConnection(provider?: string, endpoint?: string, model?: string, apiKey?: string, maxTokens?: number) {
    if (!endpoint || !apiKey) {
      vscode.window.showWarningMessage('Fill in Endpoint + API Key in Settings first.');
      return;
    }
    const formConfig: AiConfig = {
      provider: provider || 'custom',
      endpoint: endpoint,
      model: model || 'gpt-4o-mini',
      apiKey: apiKey,
      maxTokens: maxTokens || 2000,
      temperature: 0.3,
    };
    vscode.window.showInformationMessage('🧪 Testing AI connection...');
    const result = await callAI(
      'You are a test bot. Reply with JSON: {"title":"OK","summary":"Connection works"}',
      'Ping',
      formConfig
    );
    if (result.success) {
      vscode.window.showInformationMessage(`✅ AI connected! (${model || formConfig.model})`);
    } else {
      vscode.window.showErrorMessage(`❌ AI test failed: ${result.error}`);
    }
  }

  // ── Selection analysis ──
  function analyzeSelection() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor. Open a file first.');
      return;
    }
    const selection = editor.document.getText(editor.selection);
    if (!selection.trim()) {
      vscode.window.showErrorMessage('No text selected. Select some error output and try again.');
      return;
    }
    showResult(selection, true); // capture context
  }

  // ── Run & Analyze ──
  async function runAndAnalyze(fsPath?: string) {
    let filePath = fsPath;
    if (!filePath) {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('Open a .py or .js file first.');
        return;
      }
      filePath = editor.document.uri.fsPath;
      if (editor.document.isDirty) await editor.document.save();
    }

    const ext = filePath.split('.').pop()?.toLowerCase();
    const cfg = getConfig();
    let command: string, args: string[];
    switch (ext) {
      case 'py': {
        const py = cfg.runner.python.split(/\s+/);
        command = py[0]; args = [...py.slice(1), filePath]; break;
      }
      case 'js': {
        const js = cfg.runner.javascript.split(/\s+/);
        command = js[0]; args = [...js.slice(1), filePath]; break;
      }
      case 'ts': {
        const ts = cfg.runner.typescript.split(/\s+/);
        command = ts[0]; args = [...ts.slice(1), filePath]; break;
      }
      case 'rb': {
        const rb = cfg.runner.ruby.split(/\s+/);
        command = rb[0]; args = [...rb.slice(1), filePath]; break;
      }
      case 'go': {
        const go = cfg.runner.go.split(/\s+/);
        command = go[0]; args = [...go.slice(1), filePath]; break;
      }
      default:
        vscode.window.showErrorMessage(`Unsupported file type: .${ext}`);
        return;
    }

    vscode.window.showInformationMessage(`⚡ Blast: Running .${ext} file...`);
    const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
      || require('path').dirname(filePath);

    cp.execFile(command, args, {
      cwd, timeout: 30000, maxBuffer: 1024 * 1024,
    }, (err, _stdout, stderr) => {
      if (stderr || err) {
        const errorText = stderr || (err?.message || '');
        if (errorText.trim()) {
          // Capture the whole source file for Run & Analyze
          let ctx: { language: string; filePath: string; codeSnippet: string } | undefined;
          try {
            const fs = require('fs');
            const code = fs.readFileSync(filePath, 'utf-8');
            ctx = { language: languageName(ext || ''), filePath: filePath!, codeSnippet: code };
          } catch { /* ignore */ }
          const kbResult = matcher.analyzeText(errorText);
          if (kbResult) {
            sidebarProvider.showResult(kbResult);
          } else {
            sidebarProvider.showResult(null);
          }
          // Fire AI async
          (async () => {
            const aiConfig = await getAiConfig();
            if (!aiConfig) { sidebarProvider.showAiError('API key not configured. Go to Settings → AI Provider, enter your API Key, then press Tab to save.'); return; }
            sidebarProvider.showAiLoading(true);
            const r = await callAI(
              buildSystemPrompt(getConfig().locale),
              buildUserPrompt(errorText, ctx),
              aiConfig
            );
            sidebarProvider.showAiLoading(false);
            if (r.success && r.analysis) sidebarProvider.showAiResult(r.analysis);
            else sidebarProvider.showAiError(r.error || 'AI request failed');
          })();
          return;
        }
      }
      vscode.window.showInformationMessage('✅ Blast: File ran without errors.');
    });
  }

  // ── Commands ──
  context.subscriptions.push(
    vscode.commands.registerCommand('blast.analyzeSelection', analyzeSelection),

    vscode.commands.registerCommand('blast.runAndAnalyze', (uri?: vscode.Uri) => {
      runAndAnalyze(uri?.fsPath);
    }),

    vscode.commands.registerCommand('blast.pasteError', async (text?: string) => {
      if (text) {
        showResult(text, true);
        return;
      }
      const input = await vscode.window.showInputBox({
        prompt: 'Paste your error message here',
        placeHolder: 'e.g., ModuleNotFoundError: No module named...',
        ignoreFocusOut: true,
      });
      if (input) showResult(input, true);
    }),

    vscode.commands.registerCommand('blast.focusSidebar', () => {
      vscode.commands.executeCommand('blast-sidebar.focus');
    }),

    vscode.commands.registerCommand('blast.importKnowledgeBase', async () => {
      const results = await vscode.window.showOpenDialog({
        canSelectFiles: true, canSelectMany: false,
        filters: { 'JSON Knowledge Base': ['json'] },
        title: 'Import Blast Knowledge Pack',
      });
      if (!results || results.length === 0) return;
      const fp = results[0].fsPath;
      try {
        const [merged, skipped] = CustomKnowledgeBase.importFromFile(fp);
        if (merged === 0 && skipped === 0) {
          vscode.window.showErrorMessage('No valid entries found in the file.');
        } else if (merged === 0) {
          vscode.window.showInformationMessage('All entries already exist in custom KB.');
        } else {
          vscode.window.showInformationMessage(
            `✅ Imported ${merged} entries${skipped ? ` (${skipped} skipped)` : ''}.`
          );
          sidebarProvider.refreshCustomKB();
        }
      } catch (e: any) {
        vscode.window.showErrorMessage(`Import failed: ${e.message}`);
      }
    }),

    vscode.commands.registerCommand('blast.exportKnowledgeBase', async () => {
      if (CustomKnowledgeBase.getCount() === 0) {
        vscode.window.showInformationMessage('No custom entries to export.');
        return;
      }
      const results = await vscode.window.showSaveDialog({
        filters: { 'JSON Knowledge Pack': ['json'] },
        title: 'Export Blast Knowledge Pack',
        defaultUri: vscode.Uri.file('blast-kb-pack.json'),
      });
      if (!results) return;
      const written = CustomKnowledgeBase.exportToFile(results.fsPath);
      vscode.window.showInformationMessage(`✅ Exported ${written} entries.`);
    })
  );
}

export function deactivate() {}
