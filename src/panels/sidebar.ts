import * as vscode from 'vscode';
import { MatchResult, ErrorEntry, Solution } from '../knowledge/index';
import { loadKnowledgeBase } from '../knowledge/index';
import { CustomKnowledgeBase } from '../knowledge/custom';
import type { AiAnalysis } from '../ai';

// ───────────────────────────────────────────────────
// i18n
// ───────────────────────────────────────────────────
const LOCALE_MAP: Record<string, string> = {
  en: 'en', zh: 'zh', ja: 'ja', ko: 'ko',
  de: 'de', fr: 'fr', es: 'es', pt: 'pt',
};

const LANG_INFO: Record<string, { icon: string }> = {
  python: { icon: '🐍' }, javascript: { icon: '🟨' }, typescript: { icon: '🔷' },
  golang: { icon: '🔵' }, rust: { icon: '🦀' }, java: { icon: '☕' },
  docker: { icon: '🐳' }, common: { icon: '📋' },
};

function L(key: string, locale: string): string {
  const dict: Record<string, Record<string, string>> = {
    // Tabs
    analyzeTab: { en: '🔍 Analyze', zh: '🔍 分析', ja: '🔍 解析', ko: '🔍 분석', de: '🔍 Analyse', fr: '🔍 Analyser', es: '🔍 Analizar', pt: '🔍 Analisar' },
    customKBTab: { en: '✏️ My KB', zh: '✏️ 自定义', ja: '✏️ カスタム', ko: '✏️ 커스텀', de: '✏️ Eigene', fr: '✏️ Perso', es: '✏️ Personal', pt: '✏️ Meu KB' },
    indexTab: { en: '📚 Index', zh: '📚 索引', ja: '📚 索引', ko: '📚 색인', de: '📚 Index', fr: '📚 Index', es: '📚 Índice', pt: '📚 Índice' },
    settingsTab: { en: '⚙️ Settings', zh: '⚙️ 设置', ja: '⚙️ 設定', ko: '⚙️ 설정', de: '⚙️ Einst.', fr: '⚙️ Param.', es: '⚙️ Ajustes', pt: '⚙️ Config.' },

    // Analyze
    inputPlaceholder: { en: 'Paste error message here…', zh: '在此粘贴错误信息…', ja: 'エラーメッセージを貼り付け…', ko: '오류 메시지를 붙여넣으세요…', de: 'Fehlermeldung hier einfügen…', fr: 'Collez l\'erreur ici…', es: 'Pegue el error aquí…', pt: 'Cole o erro aqui…' },
    analyzeBtn: { en: '⚡ Analyze', zh: '⚡ 分析', ja: '⚡ 解析', ko: '⚡ 분석', de: '⚡ Analysieren', fr: '⚡ Analyser', es: '⚡ Analizar', pt: '⚡ Analisar' },
    hintText: { en: 'Select error text in editor + Ctrl+Alt+B, or paste here', zh: '在编辑器中选中错误文本按 Ctrl+Alt+B，或在此粘贴', ja: 'エディターで選択して Ctrl+Alt+B', ko: '에디터에서 선택 후 Ctrl+Alt+B', de: 'Text wählen + Ctrl+Alt+B', fr: 'Sélectionner + Ctrl+Alt+B', es: 'Seleccionar + Ctrl+Alt+B', pt: 'Selecionar + Ctrl+Alt+B' },

    // Result
    fixFound: { en: 'Suggested Fix', zh: '修复建议', ja: '修正案', ko: '수정 제안', de: 'Lösung', fr: 'Correction', es: 'Solución', pt: 'Correção' },
    matchPct: { en: 'match', zh: '匹配', ja: '一致', ko: '일치', de: 'Treffer', fr: 'pertinent', es: 'coincide', pt: 'corresp.' },
    solutions: { en: 'Solutions', zh: '解决方案', ja: '解決策', ko: '해결책', de: 'Lösungen', fr: 'Solutions', es: 'Soluciones', pt: 'Soluções' },
    refLink: { en: '📎 View Reference Docs', zh: '📎 查看参考文档', ja: '📎 参考ドキュメント', ko: '📎 참조 문서 보기', de: '📎 Referenz', fr: '📎 Voir doc', es: '📎 Ver ref', pt: '📎 Ver ref' },
    backBtn: { en: '← Back', zh: '← 返回', ja: '← 戻る', ko: '← 뒤로', de: '← Zurück', fr: '← Retour', es: '← Volver', pt: '← Voltar' },
    noMatch: { en: 'No matching error found. AI analysis starting...', zh: '未找到匹配错误，正在调用 AI 分析…', ja: '一致するエラーなし、AI分析中…', ko: '일치하는 오류 없음, AI 분석 중…', de: 'Kein Treffer. KI-Analyse läuft…', fr: 'Pas de correspondance. Analyse IA…', es: 'Sin coincidencia. IA analizando…', pt: 'Sem correspondência. IA analisando…' },
    codeFixLabel: { en: 'Code Fix', zh: '代码修复', ja: 'コード修正', ko: '코드 수정', de: 'Code-Fix', fr: 'Correctif', es: 'Corrección', pt: 'Correção' },

    // AI
    aiPanel: { en: '🤖 AI Deep Analysis', zh: '🤖 AI 深度分析', ja: '🤖 AI深度分析', ko: '🤖 AI 심층 분석', de: '🤖 KI-Analyse', fr: '🤖 Analyse IA', es: '🤖 IA Profunda', pt: '🤖 IA Profunda' },
    aiSource: { en: 'AI', zh: 'AI', ja: 'AI', ko: 'AI', de: 'KI', fr: 'IA', es: 'IA', pt: 'IA' },
    aiLoading: { en: 'Analyzing with AI…', zh: 'AI 正在分析…', ja: 'AI分析中…', ko: 'AI 분석 중…', de: 'KI analysiert…', fr: 'IA analyse…', es: 'IA analizando…', pt: 'IA analisando…' },
    aiError: { en: 'AI request failed', zh: 'AI 请求失败', ja: 'AIリクエスト失敗', ko: 'AI 요청 실패', de: 'KI-Anfrage fehlgeschlagen', fr: 'Échec requête IA', es: 'Error IA', pt: 'Erro IA' },
    aiDisclaimer: { en: '⚠️ AI-generated. Please verify before applying.', zh: '⚠️ AI 生成，请验证后使用', ja: '⚠️ AI生成、検証してから使用', ko: '⚠️ AI 생성, 검증 후 사용', de: '⚠️ KI-generiert. Vor Anwendung prüfen.', fr: '⚠️ Généré par IA. Vérifiez.', es: '⚠️ Generado por IA. Verifique.', pt: '⚠️ Gerado por IA. Verifique.' },
    saveToKB: { en: '💾 Save to My KB', zh: '💾 存入知识库', ja: '💾 KBに保存', ko: '💾 KB에 저장', de: '💾 In KB speichern', fr: '💾 Sauver dans KB', es: '💾 Guardar en KB', pt: '💾 Salvar no KB' },
    aiRootCause: { en: 'Root Cause', zh: '根因', ja: '根本原因', ko: '근본 원인', de: 'Ursache', fr: 'Cause', es: 'Causa', pt: 'Causa' },

    // AI Settings
    aiSettings: { en: '🤖 AI Provider', zh: '🤖 AI 提供商', ja: '🤖 AIプロバイダ', ko: '🤖 AI 제공자', de: '🤖 KI-Provider', fr: '🤖 Fournisseur IA', es: '🤖 Proveedor IA', pt: '🤖 Provedor IA' },
    aiProviderLabel: { en: 'Provider', zh: '提供商', ja: 'プロバイダ', ko: '제공자', de: 'Provider', fr: 'Fournisseur', es: 'Proveedor', pt: 'Provedor' },
    aiProviderSelect: { en: 'Select provider…', zh: '选择提供商…', ja: 'プロバイダを選択…', ko: '제공자 선택…', de: 'Provider wählen…', fr: 'Choisir…', es: 'Seleccionar…', pt: 'Selecionar…' },
    aiCustomEndpoint: { en: 'Custom Endpoint', zh: '自定义地址', ja: 'カスタム', ko: '사용자 정의', de: 'Eigener Endp.', fr: 'Endpoint perso', es: 'Endpoint perso', pt: 'Endpoint perso' },
    aiEndpointLabel: { en: 'API Endpoint', zh: 'API 地址', ja: 'APIエンドポイント', ko: 'API 엔드포인트', de: 'API-Endpunkt', fr: 'Endpoint API', es: 'Endpoint API', pt: 'Endpoint API' },
    aiModelLabel: { en: 'Model', zh: '模型', ja: 'モデル', ko: '모델', de: 'Modell', fr: 'Modèle', es: 'Modelo', pt: 'Modelo' },
    aiKeyLabel: { en: 'API Key', zh: 'API 密钥', ja: 'APIキー', ko: 'API 키', de: 'API-Schlüssel', fr: 'Clé API', es: 'Clave API', pt: 'Chave API' },
    aiKeyPlaceholder: { en: 'sk-...', zh: 'sk-…', ja: 'sk-…', ko: 'sk-…', de: 'sk-…', fr: 'sk-…', es: 'sk-…', pt: 'sk-…' },
    aiKeyHint: { en: 'Stored securely in VS Code Secret Storage', zh: '安全存储在 VS Code 密钥库中', ja: 'VS Codeの安全な保管庫に保存', ko: 'VS Code 보안 저장소에 저장', de: 'Sicher im VS Code Secret Storage', fr: 'Stocké en sécurité', es: 'Almacenado seguro', pt: 'Armazenado seguro' },
    aiMaxTokensLabel: { en: 'Max Tokens', zh: '最大 Token', ja: '最大トークン', ko: '최대 토큰', de: 'Max Tokens', fr: 'Max tokens', es: 'Max tokens', pt: 'Max tokens' },
    aiTestBtn: { en: '🧪 Test Connection', zh: '🧪 测试连接', ja: '🧪 接続テスト', ko: '🧪 연결 테스트', de: '🧪 Testen', fr: '🧪 Tester', es: '🧪 Probar', pt: '🧪 Testar' },

    // Settings
    settingsTitle: { en: 'Preferences', zh: '偏好设置', ja: '設定', ko: '환경설정', de: 'Einstellungen', fr: 'Préférences', es: 'Preferencias', pt: 'Preferências' },
    appearanceSection: { en: '🎨 Appearance', zh: '🎨 外观', ja: '🎨 外観', ko: '🎨 디스플레이', de: '🎨 Aussehen', fr: '🎨 Apparence', es: '🎨 Apariencia', pt: '🎨 Aparência' },
    colorThemeLabel: { en: 'Color Theme', zh: '主题色', ja: 'カラーテーマ', ko: '색상 테마', de: 'Farbschema', fr: 'Couleur', es: 'Color', pt: 'Cor' },
    followThemeLabel: { en: 'Follow VS Code Theme', zh: '跟随 VS Code 主题', ja: 'VS Codeテーマに従う', ko: 'VS Code 테마 따르기', de: 'VS Code-Theme folgen', fr: 'Suivre le thème VS Code', es: 'Seguir tema VS Code', pt: 'Seguir tema VS Code' },
    fontSizeLabel: { en: 'Font Size', zh: '字体大小', ja: 'フォントサイズ', ko: '글꼴 크기', de: 'Schriftgröße', fr: 'Taille police', es: 'Tamaño fuente', pt: 'Tamanho fonte' },
    compactLabel: { en: 'Compact Mode', zh: '紧凑模式', ja: 'コンパクト', ko: '컴팩트 모드', de: 'Kompaktmodus', fr: 'Mode compact', es: 'Modo compacto', pt: 'Modo compacto' },
    langLabel: { en: 'Display Language', zh: '显示语言', ja: '表示言語', ko: '표시 언어', de: 'Sprache', fr: 'Langue', es: 'Idioma', pt: 'Idioma' },
    runnerSection: { en: 'Runner Commands', zh: '运行器命令', ja: 'ランナーコマンド', ko: '실행 명령어', de: 'Runner-Befehle', fr: 'Commandes d\'exécution', es: 'Comandos', pt: 'Comandos' },
    runnerPython: { en: 'Python', zh: 'Python', ja: 'Python', ko: 'Python', de: 'Python', fr: 'Python', es: 'Python', pt: 'Python' },
    runnerJS: { en: 'JavaScript', zh: 'Javascript', ja: 'Javascript', ko: 'Javascript', de: 'Javascript', fr: 'Javascript', es: 'Javascript', pt: 'Javascript' },
    runnerTS: { en: 'TypeScript', zh: 'Typescript', ja: 'Typescript', ko: 'Typescript', de: 'Typescript', fr: 'Typescript', es: 'Typescript', pt: 'Typescript' },
    runnerGo: { en: 'Go', zh: 'Go', ja: 'Go', ko: 'Go', de: 'Go', fr: 'Go', es: 'Go', pt: 'Go' },
    runnerRuby: { en: 'Ruby', zh: 'Ruby', ja: 'Ruby', ko: 'Ruby', de: 'Ruby', fr: 'Ruby', es: 'Ruby', pt: 'Ruby' },
    confidenceLabel: { en: 'Show Confidence %', zh: '显示匹配百分比', ja: '一致率を表示', ko: '일치율 표시', de: 'Treffer-% anzeigen', fr: 'Afficher %', es: 'Mostrar %', pt: 'Mostrar %' },
    kbStats: { en: 'Knowledge Base', zh: '知识库', ja: 'ナレッジベース', ko: '지식 베이스', de: 'Wissensbasis', fr: 'Base connaissances', es: 'Base conocimiento', pt: 'Base conhecimento' },
    builtInLabel: { en: 'Built-in', zh: '内置', ja: '内蔵', ko: '내장', de: 'Integriert', fr: 'Intégré', es: 'Integrado', pt: 'Integrado' },
    customLabel: { en: 'Custom', zh: '自定义', ja: 'カスタム', ko: '커스텀', de: 'Eigene', fr: 'Perso', es: 'Personal', pt: 'Personal' },

    // Index
    indexTitle: { en: 'Error KB Index', zh: '错误索引', ja: 'エラー索引', ko: '오류 색인', de: 'Fehler-Index', fr: 'Index erreurs', es: 'Índice errores', pt: 'Índice erros' },
    indexSearch: { en: '🔎 Search…', zh: '🔎 搜索…', ja: '🔎 検索…', ko: '🔎 검색…', de: '🔎 Suchen…', fr: '🔎 Rechercher…', es: '🔎 Buscar…', pt: '🔎 Buscar…' },
    indexFilterAll: { en: 'All', zh: '全部', ja: '全て', ko: '전체', de: 'Alle', fr: 'Tous', es: 'Todos', pt: 'Todos' },
    indexTotal: { en: 'errors indexed', zh: '条错误', ja: '件のエラー', ko: '개 오류', de: 'Fehler', fr: 'erreurs', es: 'errores', pt: 'erros' },
    indexShowing: { en: 'showing', zh: '显示', ja: '表示', ko: '표시', de: 'zeigt', fr: 'montre', es: 'muestra', pt: 'mostra' },
    indexViewRef: { en: '📖 Ref', zh: '📖 参考', ja: '📖 参照', ko: '📖 참조', de: '📖 Ref', fr: '📖 Réf', es: '📖 Ref', pt: '📖 Ref' },
    indexNoRef: { en: 'No ref', zh: '无参考', ja: '参照なし', ko: '참조 없음', de: 'Keine Ref', fr: 'Pas de réf', es: 'Sin ref', pt: 'Sem ref' },
    indexExpand: { en: 'Show solutions', zh: '展开方案', ja: '解決策表示', ko: '해결책 보기', de: 'Lösungen zeigen', fr: 'Voir solutions', es: 'Ver soluciones', pt: 'Ver soluções' },
    indexCollapse: { en: 'Hide solutions', zh: '收起方案', ja: '解決策非表示', ko: '해결책 숨기기', de: 'Ausblenden', fr: 'Masquer', es: 'Ocultar', pt: 'Ocultar' },

    // Custom KB
    customKBTitle: { en: 'Custom Error Patterns', zh: '自定义错误模式', ja: 'カスタムエラーパターン', ko: '커스텀 오류 패턴', de: 'Eigene Fehlermuster', fr: 'Modèles perso', es: 'Patrones perso', pt: 'Padrões pessoais' },
    addNew: { en: '+ Add', zh: '+ 添加', ja: '+ 追加', ko: '+ 추가', de: '+ Neu', fr: '+ Ajouter', es: '+ Añadir', pt: '+ Adicionar' },
    entryId: { en: 'ID (e.g. my-error-001)', zh: 'ID（如 my-error-001）', ja: 'ID（例: my-error-001）', ko: 'ID（예: my-error-001）', de: 'ID (z.B. my-error-001)', fr: 'ID (ex: my-error-001)', es: 'ID (ej: my-error-001)', pt: 'ID (ex: my-error-001)' },
    entryTitle: { en: 'Error Title', zh: '错误标题', ja: 'エラータイトル', ko: '오류 제목', de: 'Fehlertitel', fr: 'Titre erreur', es: 'Título error', pt: 'Título erro' },
    entryPattern: { en: 'Regex Patterns (one per line)', zh: '正则表达式（每行一个）', ja: '正規表現（1行1つ）', ko: '정규식（줄당 하나）', de: 'Regex (eines pro Zeile)', fr: 'Regex (une par ligne)', es: 'Regex (uno por línea)', pt: 'Regex (um por linha)' },
    entrySolTitle: { en: 'Solution Title', zh: '解决方案标题', ja: '解決策タイトル', ko: '해결책 제목', de: 'Lösungstitel', fr: 'Titre solution', es: 'Título solución', pt: 'Título solução' },
    entrySolSteps: { en: 'Steps (one per line)', zh: '步骤（每行一个）', ja: '手順（1行1つ）', ko: '단계（줄당 하나）', de: 'Schritte (eines pro Zeile)', fr: 'Étapes (une par ligne)', es: 'Pasos (uno por línea)', pt: 'Passos (um por linha)' },
    entryCodeFix: { en: 'Code Fix Example (optional)', zh: '代码修复（可选）', ja: 'コード修正例（任意）', ko: '코드 수정 예시（선택）', de: 'Code-Fix (optional)', fr: 'Code correctif (facultatif)', es: 'Código (opcional)', pt: 'Código (opcional)' },
    entryRef: { en: 'Reference URL (optional)', zh: '参考链接（可选）', ja: '参考URL（任意）', ko: '참조 URL（선택）', de: 'Referenz-URL (optional)', fr: 'URL de ref (facultatif)', es: 'URL de ref (opcional)', pt: 'URL de ref (opcional)' },
    saveBtn: { en: '💾 Save', zh: '💾 保存', ja: '💾 保存', ko: '💾 저장', de: '💾 Speichern', fr: '💾 Enregistrer', es: '💾 Guardar', pt: '💾 Salvar' },
    deleteBtn: { en: 'Delete', zh: '删除', ja: '削除', ko: '삭제', de: 'Löschen', fr: 'Supprimer', es: 'Eliminar', pt: 'Excluir' },
    cancelBtn: { en: 'Cancel', zh: '取消', ja: 'キャンセル', ko: '취소', de: 'Abbrechen', fr: 'Annuler', es: 'Cancelar', pt: 'Cancelar' },
    importBtn: { en: '📥 Import', zh: '📥 导入', ja: '📥 取込', ko: '📥 가져오기', de: '📥 Import', fr: '📥 Importer', es: '📥 Importar', pt: '📥 Importar' },
    exportBtn: { en: '📤 Export', zh: '📤 导出', ja: '📤 出力', ko: '📤 내보내기', de: '📤 Export', fr: '📤 Exporter', es: '📤 Exportar', pt: '📤 Exportar' },
    emptyKB: { en: 'No custom entries yet.', zh: '还没有自定义条目', ja: 'エントリはまだありません', ko: '커스텀 항목 없음', de: 'Noch keine Einträge.', fr: 'Aucune entrée perso.', es: 'Sin entradas.', pt: 'Nenhuma entrada.' },
  };
  return dict[key]?.[locale] || dict[key]?.en || key;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ───────────────────────────────────────────────────
// Provider Presets
// ───────────────────────────────────────────────────
const PROVIDER_PRESETS: Record<string, { label: string; endpoint: string; model: string }> = {
  deepseek: { label: 'DeepSeek', endpoint: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  siliconflow: { label: 'SiliconFlow', endpoint: 'https://api.siliconflow.cn/v1', model: 'Qwen/Qwen3-32B' },
  zhipu: { label: 'ZhipuAI GLM', endpoint: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash' },
  dashscope: { label: 'Aliyun DashScope', endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
  openrouter: { label: 'OpenRouter', endpoint: 'https://openrouter.ai/api/v1', model: 'google/gemini-2.5-flash-lite:free' },
  openai: { label: 'OpenAI', endpoint: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  custom: { label: 'Custom', endpoint: '', model: '' },
};

const COLOR_PRESETS: Record<string, { bp: string; bp2: string }> = {
  purple: { bp: '#a78bfa', bp2: 'rgba(167,139,250,.12)' },
  blue: { bp: '#60a5fa', bp2: 'rgba(96,165,250,.12)' },
  green: { bp: '#34d399', bp2: 'rgba(52,211,153,.12)' },
  orange: { bp: '#fb923c', bp2: 'rgba(251,146,60,.12)' },
};

const FONT_SIZES: Record<string, string> = {
  small: '11px', medium: '12.5px', large: '14px',
};

// ───────────────────────────────────────────────────
// Sidebar Provider
// ───────────────────────────────────────────────────
export class BlastSidebarProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private _lastResult: MatchResult | null = null;
  private _locale = 'en';
  private _activeTab: 'analyze' | 'custom' | 'settings' | 'index' = 'analyze';
  private _runnerConfig: Record<string, string> = {};
  private _showConfidence = true;
  private _aiConfigured = false;
  private _aiInitConfig?: { provider: string; endpoint: string; model: string; maxTokens: number; hasKey: boolean };
  private _appearance = { colorTheme: 'purple', followTheme: true, fontSize: 'medium', compactMode: false };

  // AI result state (lives inside the webview, sent via postMessage)
  private _aiAnalysis?: AiAnalysis;
  private _aiLoading = false;
  private _aiError?: string;

  // Called by extension.ts for sidebar→extension messages
  onMessage?: (msg: any) => void;

  // ── Setters ──
  setLocale(locale: string) { this._locale = LOCALE_MAP[locale] || 'en'; this._render(); }
  setRunnerConfig(runner: Record<string, string>) { this._runnerConfig = runner; this._render(); }
  setRunnerEntry(lang: string, value: string) { this._runnerConfig[lang] = value; this._render(); }
  setShowConfidence(show: boolean) { this._showConfidence = show; this._render(); }
  setAiConfigured(yes: boolean) { this._aiConfigured = yes; }
  setAiConfig(config: { provider: string; endpoint: string; model: string; maxTokens: number; hasKey: boolean }) {
    this._aiInitConfig = config;
    this._post('initConfig', config);
  }

  setAppearance(colorTheme: string, followTheme: boolean, fontSize: string, compactMode: boolean) {
    this._appearance = { colorTheme, followTheme, fontSize, compactMode };
    this._render();
  }

  // ── AI actions ──
  showAiLoading(loading: boolean) {
    this._aiLoading = loading;
    if (loading) { this._aiAnalysis = undefined; this._aiError = undefined; }
    this._post('aiLoading', { loading });
  }

  showAiResult(analysis: AiAnalysis) {
    this._aiAnalysis = analysis;
    this._aiError = undefined;
    this._post('aiResult', { analysis });
  }

  showAiError(error: string) {
    this._aiError = error;
    this._aiAnalysis = undefined;
    this._post('aiError', { error });
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;
    webviewView.webview.options = { enableScripts: true, localResourceRoots: [] };
    webviewView.webview.html = this._getHtml();
    // Replay stored config so settings form shows saved values
    if (this._aiInitConfig) {
      setTimeout(() => this._post('initConfig', this._aiInitConfig), 50);
    }

    webviewView.webview.onDidReceiveMessage((msg) => {
      switch (msg.type) {
        case 'analyze': {
          const text = msg.text?.trim();
          if (text) this.onMessage?.({ type: 'analyze', text });
          break;
        }
        case 'back':
          this._lastResult = null;
          this._aiAnalysis = undefined;
          this._aiError = undefined;
          this._activeTab = 'analyze';
          this._render();
          break;
        case 'switchTab':
          this._activeTab = msg.tab;
          this._render();
          break;
        // Settings (Appearance)
        case 'setAppearance':
          this.onMessage?.({ type: 'setAppearance', field: msg.field, value: msg.value });
          break;
        // Settings
        case 'setLocale':
          this.onMessage?.({ type: 'setLocale', value: msg.value });
          break;
        case 'setRunner':
          this.onMessage?.({ type: 'setRunner', lang: msg.lang, value: msg.value });
          break;
        case 'setConfidence':
          this.onMessage?.({ type: 'setConfidence', value: msg.value });
          break;
        // AI Settings
        case 'setAiKey':
          this.onMessage?.({ type: 'setAiKey', value: msg.value });
          break;
        case 'clearAiKey':
          this.onMessage?.({ type: 'clearAiKey' });
          break;
        case 'testAi':
          this.onMessage?.({ type: 'testAi', provider: (msg as any).provider, endpoint: (msg as any).endpoint, model: (msg as any).model, key: (msg as any).key, maxTokens: (msg as any).maxTokens });
          break;
        case 'saveAiConfig':
          this.onMessage?.({ type: 'saveAiConfig', provider: (msg as any).provider || 'custom', endpoint: (msg as any).endpoint, model: (msg as any).model, key: (msg as any).key, maxTokens: (msg as any).maxTokens });
          break;
        // Save AI to KB
        case 'saveToKb':
          this.onMessage?.({ type: 'saveToKb', data: this._aiAnalysis });
          break;
        // Custom KB
        case 'addCustomEntry':
          this.onMessage?.({ type: 'addCustomEntry', data: msg.data });
          break;
        case 'deleteCustomEntry':
          this.onMessage?.({ type: 'deleteCustomEntry', id: msg.id });
          break;
        case 'importKb':
          this.onMessage?.({ type: 'importKb' });
          break;
        case 'exportKb':
          this.onMessage?.({ type: 'exportKb' });
          break;
        case 'refreshCustomKB':
          this._activeTab = 'custom';
          this._render();
          break;
      }
    });
  }

  showResult(result: MatchResult | null) {
    if (!this._view) return;
    if (result) {
      this._lastResult = result;
      this._activeTab = 'analyze';
      this._post('showResult', { result });
      this._view.webview.html = this._getResultHtml(result);
      this._view.show(true);
    } else {
      this._lastResult = null;
      this._activeTab = 'analyze';
      this._view.webview.html = this._getHtml(L('noMatch', this._locale));
      this._view.show(true);
    }
  }

  clear() {
    this._lastResult = null;
    this._aiAnalysis = undefined;
    this._aiError = undefined;
    this._activeTab = 'analyze';
    if (this._view) this._view.webview.html = this._getHtml();
  }

  refreshCustomKB() {
    if (!this._view) return;
    this._activeTab = 'custom';
    this._view.webview.html = this._getHtml();
  }

  // ═══════════════════════════════════════
  // Internal
  // ═══════════════════════════════════════
  private _render() {
    if (this._view) this._view.webview.html = this._getHtml();
  }

  private _post(type: string, data: any = {}) {
    this._view?.webview.postMessage({ type, ...data });
  }

  // ═══════════════════════════════════════
  // HTML
  // ═══════════════════════════════════════
  private _getHtml(errorMsg?: string): string {
    const loc = this._locale;
    const css = this._getCss();

    let bodyContent: string;
    switch (this._activeTab) {
      case 'custom': bodyContent = this._getCustomKbHtml(loc); break;
      case 'settings': bodyContent = this._getSettingsHtml(loc); break;
      case 'index': bodyContent = this._getIndexHtml(loc); break;
      default: bodyContent = this._getAnalyzeTabHtml(loc, errorMsg); break;
    }

    return `<!DOCTYPE html>
<html lang="${loc}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
${css}
</head>
<body>
<div class="tab-bar">
  <button class="tab-btn${this._activeTab === 'analyze' ? ' active' : ''}" onclick="switchTab('analyze')">${L('analyzeTab', loc)}</button>
  <button class="tab-btn${this._activeTab === 'custom' ? ' active' : ''}" onclick="switchTab('custom')">${L('customKBTab', loc)}</button>
  <button class="tab-btn${this._activeTab === 'index' ? ' active' : ''}" onclick="switchTab('index')">${L('indexTab', loc)}</button>
  <button class="tab-btn${this._activeTab === 'settings' ? ' active' : ''}" onclick="switchTab('settings')">${L('settingsTab', loc)}</button>
</div>
${bodyContent}
<script>
const vscode = acquireVsCodeApi();
function switchTab(t) { vscode.postMessage({ type: 'switchTab', tab: t }); }
// AI result listener
window.addEventListener('message', e => {
  const msg = e.data;
  if (msg.type === 'aiResult') renderAiResult(msg.analysis);
  else if (msg.type === 'aiLoading') renderAiLoading(msg.loading);
  else if (msg.type === 'aiError') renderAiError(msg.error);
  else if (msg.type === 'showResult') renderAiPlaceholder();
});
</script>
</body></html>`;
  }

  // ═══════════════════════════════════════
  // CSS
  // ═══════════════════════════════════════
  private _getCss(): string {
    const ap = this._appearance;
    const clr = COLOR_PRESETS[ap.colorTheme] || COLOR_PRESETS.purple;
    const fz = FONT_SIZES[ap.fontSize] || '12.5px';
    const compact = ap.compactMode;
    return `<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bp:${clr.bp};
  --bp2:${clr.bp2};
  --bs:#34d399;
  --bd:#f87171;
  --bghost:var(--vscode-input-background,#2d2d2d);
  --bgcard:var(--vscode-editorWidget-background,#1e1e1e);
  --bdline:var(--vscode-panel-border,rgba(255,255,255,.08));
  --tx:var(--vscode-editor-foreground,#e0e0e0);
  --txm:var(--vscode-descriptionForeground,#888);
  --bgside:var(--vscode-sideBar-background,#252526);
  --br:${compact ? '6px' : '8px'};
  --gap:${compact ? '6px' : '10px'};
  --pad:${compact ? '8px' : '14px'};
  --font:'Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif;
  --mono:'JetBrains Mono','Fira Code',Consolas,monospace;
}
body{font-family:var(--font);font-size:${fz};color:var(--tx);background:var(--bgside);line-height:1.5}

.tab-bar{
  display:flex;background:var(--vscode-tab-inactiveBackground,transparent);
  border-bottom:1px solid var(--bdline);position:sticky;top:0;z-index:10;
  gap:2px;padding:2px;
}
.tab-btn{
  flex:1;padding:8px 6px;font-size:10.5px;font-weight:700;
  border:none;background:none;color:var(--txm);
  cursor:pointer;position:relative;
  transition:all .2s;letter-spacing:.3px;
  border-radius:6px 6px 0 0;
}
.tab-btn.active{color:var(--bp);background:rgba(167,139,250,.06)}
.tab-btn.active::after{
  content:'';position:absolute;bottom:-1px;left:8px;right:8px;height:2px;
  background:var(--bp);border-radius:1px 1px 0 0;
}
.tab-btn:hover{color:var(--tx);background:rgba(255,255,255,.03)}

.analyze-box{padding:10px;display:flex;flex-direction:column;gap:10px}
.analyze-box textarea{
  width:100%;padding:10px 14px;font-size:12px;font-family:var(--mono);
  background:var(--vscode-input-background,#1a1a2e);color:var(--tx);
  border:1px solid var(--bdline);border-radius:8px;
  resize:vertical;min-height:80px;max-height:200px;outline:none;
  transition:border-color .25s,box-shadow .25s;line-height:1.6;
}
.analyze-box textarea:focus{border-color:var(--bp);box-shadow:0 0 0 3px rgba(167,139,250,.12)}
.btn-row{display:flex;gap:8px;margin-top:10px}
.btn{
  padding:9px 20px;font-size:12px;font-weight:600;
  border:none;border-radius:8px;cursor:pointer;
  transition:all .2s;letter-spacing:.3px;
}
.btn-pri{
  background:linear-gradient(135deg,#a78bfa,#8b5cf6);color:#fff;flex:1;
  box-shadow:0 2px 8px rgba(139,92,246,.3);
}
.btn-pri:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(139,92,246,.45);filter:brightness(1.1)}
.btn-pri:active{transform:translateY(0)}
.btn-ghost{
  background:var(--bghost);color:var(--tx);border:1px solid var(--bdline);
  transition:all .2s;
}
.btn-ghost:hover{background:rgba(167,139,250,.08);border-color:var(--bp);color:var(--bp)}
.btn-danger{background:linear-gradient(135deg,#f87171,#ef4444);color:#fff;box-shadow:0 2px 8px rgba(239,68,68,.25)}
.btn-danger:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(239,68,68,.4)}
.btn-analyze{
  background:linear-gradient(135deg,#a78bfa,#818cf8);
  font-size:13px;padding:10px 24px;letter-spacing:.5px;
}
.btn-sm{padding:6px 16px;font-size:11px;font-weight:600;border:none;border-radius:6px;cursor:pointer;transition:all .2s;letter-spacing:.3px}
.btn-xs{padding:3px 10px;font-size:10px;font-weight:600;border:none;border-radius:4px;cursor:pointer}
.hint-text{padding:12px 4px 0;color:var(--txm);text-align:center;font-size:11px;line-height:1.7;opacity:.7}
.hint-text kbd{
  background:var(--bghost);padding:1px 5px;border-radius:3px;
  border:1px solid var(--bdline);font-family:var(--mono);font-size:10px;
}

/* ── Result ── */
.result-head{
  display:flex;align-items:center;justify-content:space-between;
  padding:14px 16px;border-bottom:1px solid var(--bdline);
  background:linear-gradient(180deg,rgba(167,139,250,.04),transparent);
}
.result-head h2{font-size:15px;font-weight:700;display:flex;align-items:center;gap:8px}
.result-icon{
  width:32px;height:32px;border-radius:10px;
  background:linear-gradient(135deg,rgba(52,211,153,.15),rgba(52,211,153,.05));
  display:flex;align-items:center;justify-content:center;font-size:16px;
}
.badge{
  font-size:10px;font-weight:700;padding:3px 10px;border-radius:12px;
  background:var(--bp2);color:var(--bp);letter-spacing:.4px;
}
.badge-ai{background:rgba(96,165,250,.12);color:#60a5fa}
.card{
  margin:10px 14px;padding:16px;background:var(--bgcard);
  border:1px solid var(--bdline);border-radius:10px;
}
.card h3{font-size:13px;font-weight:700;margin-bottom:6px;display:flex;align-items:center;gap:6px}
.error-id{font-size:10px;color:var(--txm);font-family:var(--mono);margin-top:2px}
.sols-section{padding:0 12px 12px}
.sols-section h3{
  font-size:11px;text-transform:uppercase;letter-spacing:.8px;
  color:var(--txm);margin-bottom:8px;
}
.sol-card{
  background:var(--bgcard);border:1px solid var(--bdline);
  border-radius:var(--br);padding:12px 14px;margin-bottom:8px;
}
.sol-type{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:var(--bp);margin-bottom:4px}
.sol-title{font-size:13px;font-weight:600;margin-bottom:6px}
.sol-steps{padding-left:18px;font-size:12px;color:var(--txm);line-height:1.9}
.sol-steps li{margin-bottom:2px}
.code-fix-card{margin:0 14px 12px;padding:16px;background:var(--bgcard);border:1px solid var(--bdline);border-radius:10px}
.code-fix-card h3{font-size:10.5px;text-transform:uppercase;letter-spacing:1px;color:var(--bp);margin-bottom:10px;font-weight:700}
.code-fix-card pre{background:rgba(167,139,250,.04);border-radius:8px;padding:16px;overflow-x:auto;margin:0}
.code-fix-card code{font-family:var(--mono);font-size:11.5px;line-height:1.75;color:var(--tx);white-space:pre-wrap;word-break:break-word}
.ref-link{
  display:block;padding:10px 14px;margin:0 12px 12px;
  font-size:12px;color:var(--bp);text-decoration:none;
  border-radius:var(--br);background:var(--bp2);
  transition:background .15s;
}
.ref-link:hover{background:rgba(167,139,250,.18)}
.back-btn{
  margin:0 14px 14px;padding:8px 16px;
  font-size:12px;font-weight:600;border:1px solid var(--bdline);
  border-radius:8px;background:var(--bghost);color:var(--tx);
  cursor:pointer;display:flex;align-items:center;gap:6px;
  transition:all .2s;
}
.back-btn:hover{color:var(--bp);border-color:var(--bp);background:rgba(167,139,250,.06)}

/* ── AI Panel ── */
.ai-panel{
  margin:16px 12px 12px;padding:0;border:1px solid rgba(96,165,250,.3);
  border-radius:var(--br);overflow:hidden;
}
.ai-panel-head{
  padding:12px 14px;background:rgba(96,165,250,.06);
  border-bottom:1px solid rgba(96,165,250,.15);
  display:flex;align-items:center;justify-content:space-between;
}
.ai-panel-head h3{font-size:13px;font-weight:700;display:flex;align-items:center;gap:6px}
.ai-panel-body{padding:12px 14px}
.ai-loading{
  display:flex;align-items:center;gap:10px;padding:16px 14px;
  color:var(--txm);font-size:12px;
}
.ai-spinner{
  width:16px;height:16px;border:2px solid var(--bdline);
  border-top-color:var(--bp);border-radius:50%;
  animation:spin .7s linear infinite;
}
@keyframes spin{to{transform:rotate(360deg)}}
.ai-error{
  margin:12px;padding:12px 14px;border-radius:var(--br);
  background:rgba(248,113,113,.08);color:var(--bd);
  border:1px solid rgba(248,113,113,.2);font-size:12px;
}
.ai-summary{
  background:rgba(96,165,250,.05);border-radius:6px;
  padding:10px 14px;margin-bottom:12px;
  font-size:12.5px;color:var(--tx);line-height:1.6;
}
.ai-summary span{color:#60a5fa;font-weight:600;margin-right:4px}
.ai-actions{
  display:flex;gap:8px;padding:8px 14px 12px;
  border-top:1px solid var(--bdline);
}
.ai-actions .btn{flex:0 0 auto;font-size:11px;padding:6px 14px}
.ai-disclaimer{
  padding:4px 14px 8px;font-size:10px;color:var(--txm);
  text-align:center;
}

/* ── AI Config Card ── */
.ai-conf-card{
  border:1px solid var(--bdline);border-radius:10px;overflow:hidden;
  background:linear-gradient(180deg,rgba(167,139,250,.04),transparent 40%);
}
.ai-conf-header{
  display:flex;align-items:center;gap:8px;padding:10px 14px;
  background:linear-gradient(135deg,rgba(167,139,250,.08),rgba(129,140,248,.04));
  border-bottom:1px solid rgba(167,139,250,.12);
}
.ai-conf-icon{font-size:14px}
.ai-conf-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:var(--bp)}
.ai-conf-field{
  display:flex;align-items:center;padding:6px 14px;gap:10px;
  border-bottom:1px solid rgba(255,255,255,.03);
}
.ai-conf-field:last-of-type{border-bottom:none}
.ai-conf-field label{
  font-size:11px;font-weight:600;color:var(--txm);min-width:80px;text-transform:uppercase;letter-spacing:.4px;
}
.ai-conf-field input{
  flex:1;padding:6px 12px;font-size:12px;font-family:var(--mono);
  background:var(--vscode-input-background,#1a1a2e);color:var(--tx);
  border:1px solid var(--bdline);border-radius:6px;
  outline:none;transition:border-color .25s,box-shadow .25s;
}
.ai-conf-field input:focus{border-color:var(--bp);box-shadow:0 0 0 3px rgba(167,139,250,.1)}
.ai-conf-field input[type=password]{font-family:var(--font)}
.ai-conf-actions{
  display:flex;gap:8px;padding:10px 14px;
  background:rgba(167,139,250,.03);
  border-top:1px solid rgba(167,139,250,.08);
}
.ai-conf-actions .btn-sm{flex:1}

/* ── Error Input Section ── */
.section-label{
  display:block;font-size:10px;font-weight:700;color:var(--txm);
  text-transform:uppercase;letter-spacing:1.2px;margin-bottom:6px;
}

/* ── AI Settings ── */
.ai-settings-section h4{
  font-size:12px;font-weight:600;color:var(--txm);
  text-transform:uppercase;letter-spacing:1px;
  margin:16px 0 8px;padding-top:12px;
  border-top:1px solid var(--bdline);
}
.ai-settings-section h4:first-child{margin-top:0;border-top:none;padding-top:0}

/* ── Settings ── */
.settings-section{padding:14px}
.settings-section h4{
  font-size:10.5px;font-weight:700;color:var(--bp);
  text-transform:uppercase;letter-spacing:1.5px;
  margin:20px 0 10px;padding-top:16px;
  border-top:1px solid rgba(167,139,250,.12);
  display:flex;align-items:center;gap:6px;
}
.settings-section h4:first-child{margin-top:0;border-top:none;padding-top:0}
.set-row{display:flex;align-items:center;justify-content:space-between;padding:9px 0}
.set-row label{font-size:12px;font-weight:500;color:var(--tx);cursor:pointer}
.set-row input,.set-row select{
  padding:6px 12px;font-size:12px;font-family:var(--mono);
  background:var(--vscode-input-background,#1a1a2e);color:var(--tx);
  border:1px solid var(--bdline);border-radius:6px;
  outline:none;width:180px;transition:border-color .25s,box-shadow .25s;
}
.set-row input:focus,.set-row select:focus{border-color:var(--bp);box-shadow:0 0 0 3px rgba(167,139,250,.1)}
.toggle{position:relative;display:inline-block;width:38px;height:20px}
.toggle input{opacity:0;width:0;height:0}
.toggle-slider{
  position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;
  background:var(--bghost);border:1px solid var(--bdline);
  border-radius:20px;transition:.2s;
}
.toggle-slider::before{
  content:'';position:absolute;height:14px;width:14px;
  left:2px;bottom:2px;background:var(--txm);
  border-radius:50%;transition:.2s;
}
.toggle input:checked+.toggle-slider{background:var(--bp);border-color:var(--bp)}
.toggle input:checked+.toggle-slider::before{transform:translateX(18px);background:#fff}
.kb-stat{
  display:flex;align-items:center;justify-content:space-between;
  padding:8px 12px;margin:4px 0;
  background:var(--bghost);border-radius:6px;
}
.kb-stat span{font-size:12px;color:var(--tx)}
.kb-stat .val{font-weight:700;color:var(--bp);font-family:var(--mono);font-size:14px}

/* ── Custom KB ── */
.custom-section{padding:12px}
.custom-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.custom-head h3{font-size:14px;font-weight:700}
.custom-acts{display:flex;gap:6px}
.c-entry{
  background:var(--bgcard);border:1px solid var(--bdline);
  border-radius:var(--br);padding:10px 14px;margin-bottom:8px;
  transition:border-color .15s;
}
.c-entry:hover{border-color:var(--bp)}
.c-entry-head{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:6px}
.c-entry-id{font-size:10px;font-family:var(--mono);color:var(--bp);font-weight:600}
.c-entry-title{font-size:13px;font-weight:600;margin-top:2px}
.c-entry-pat{font-size:10.5px;font-family:var(--mono);color:var(--txm);padding:6px 0 0;word-break:break-all;line-height:1.6}

.c-form{
  background:var(--bgcard);border:1px solid var(--bp);
  border-radius:var(--br);padding:14px;margin-bottom:12px;
}
.form-g{margin-bottom:10px}
.form-g label{
  display:block;font-size:10.5px;font-weight:600;color:var(--txm);
  margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px;
}
.form-g input,.form-g textarea{
  width:100%;padding:8px 10px;font-size:11.5px;font-family:var(--mono);
  background:var(--bghost);color:var(--tx);
  border:1px solid var(--bdline);border-radius:6px;outline:none;
  transition:border-color .2s;
}
.form-g textarea{resize:vertical;min-height:48px}
.form-g input:focus,.form-g textarea:focus{border-color:var(--bp)}
.form-acts{display:flex;gap:8px;margin-top:14px}
.empty-state{text-align:center;padding:28px 16px;color:var(--txm);font-size:12px;line-height:1.8}

/* ── Index ── */
.index-wrap{padding:0 10px 14px}
.idx-search{
  position:sticky;top:40px;z-index:5;
  padding:10px 2px 8px;background:var(--bgside);
}
.idx-search input{
  width:100%;padding:9px 12px;font-size:12px;font-family:var(--font);
  background:var(--bghost);color:var(--tx);
  border:1px solid var(--bdline);border-radius:var(--br);
  outline:none;transition:border-color .2s;
}
.idx-search input:focus{border-color:var(--bp)}
.idx-filters{
  display:flex;gap:4px;flex-wrap:wrap;
  padding:4px 0 10px;position:sticky;top:94px;z-index:4;
  background:var(--bgside);
}
.idx-filter{
  padding:3px 10px;font-size:10.5px;font-weight:600;
  border:1px solid var(--bdline);border-radius:14px;
  background:var(--bghost);color:var(--txm);
  cursor:pointer;transition:all .15s;white-space:nowrap;
}
.idx-filter.active{background:var(--bp);color:#fff;border-color:var(--bp)}
.idx-filter:hover:not(.active){border-color:var(--bp);color:var(--tx)}
.idx-count{padding:4px 2px 8px;font-size:11px;color:var(--txm)}
.idx-list{max-height:calc(100vh - 210px);overflow-y:auto}
.idx-item{
  background:var(--bgcard);border:1px solid var(--bdline);
  border-radius:var(--br);padding:11px 13px;margin-bottom:8px;
  cursor:pointer;transition:border-color .15s;
}
.idx-item:hover{border-color:var(--bp)}
.idx-item-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
.idx-item-left{flex:1;min-width:0}
.idx-item-title{font-size:13px;font-weight:600;line-height:1.5}
.idx-item-meta{display:flex;align-items:center;gap:8px;margin-top:4px}
.idx-item-lang{
  font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;
  padding:1px 7px;border-radius:10px;
  background:var(--bp2);color:var(--bp);
}
.idx-item-id{font-size:9.5px;font-family:var(--mono);color:var(--txm)}
.idx-item-ref{
  flex-shrink:0;padding:3px 8px;font-size:10px;font-weight:600;
  border:1px solid var(--bdline);border-radius:5px;
  background:var(--bghost);color:var(--txm);
  cursor:pointer;transition:all .15s;text-decoration:none;
}
.idx-item-ref:hover{background:var(--bp2);color:var(--bp);border-color:var(--bp)}
.idx-item-ref.none{opacity:.4;cursor:default;pointer-events:none}
.idx-detail{display:none;margin-top:10px;padding-top:10px;border-top:1px solid var(--bdline)}
.idx-detail.open{display:block}
.idx-detail-expand{padding:4px 0 0;font-size:11px;color:var(--bp);cursor:pointer;font-weight:600;display:flex;align-items:center;gap:4px}
.idx-detail-sol{margin-top:8px}
.idx-detail-sol h4{font-size:10px;text-transform:uppercase;letter-spacing:.8px;color:var(--txm);margin-bottom:4px}
.idx-detail-sol li{font-size:11.5px;color:var(--txm);margin-left:16px;line-height:1.8}

::-webkit-scrollbar{width:6px}
::-webkit-scrollbar-thumb{background:var(--bdline);border-radius:3px}
::-webkit-scrollbar-track{background:transparent}
${compact ? `
/* compact mode overrides */
.tab-btn{padding:5px 4px;font-size:10px}
.analyze-box{padding:6px;gap:6px}
.analyze-box textarea{padding:8px 12px;min-height:60px;max-height:140px;font-size:11px}
.btn{padding:7px 16px;font-size:11px}
.btn-sm{padding:4px 12px;font-size:10px}
.card{padding:10px 12px;margin:6px 10px}
.sol-card{padding:8px 10px;margin-bottom:5px}
.sols-section{padding:0 8px 8px}
.result-head{padding:10px 12px}
.settings-section{padding:10px}
.custom-section{padding:8px}
.idx-item{padding:8px 10px;margin-bottom:5px}
.ai-conf-field{padding:4px 14px}
.ai-conf-field label{min-width:70px;font-size:10px}
.c-form{padding:10px;margin-bottom:8px}
.form-g{margin-bottom:6px}
` : ''}
</style>`;
  }

  // ── Analyze Tab ──
  private _getAnalyzeTabHtml(loc: string, errorMsg?: string): string {
    if (errorMsg) {
      return `<div class="hint-text">⚠️ ${escapeHtml(errorMsg)}</div>`;
    }
    const provOptions = Object.entries(PROVIDER_PRESETS).map(([k, v]) =>
      `<option value="${k}">${v.label}</option>`
    ).join('');

    return `<div class="analyze-box">
  <div class="ai-conf-card">
    <div class="ai-conf-header">
      <span class="ai-conf-icon">⚡</span>
      <span class="ai-conf-title">AI Configuration</span>
    </div>
    <div class="ai-conf-field">
      <label>Provider</label>
      <select id="ai-provider" onchange="onProvChange()" style="flex:1;padding:6px 12px;font-size:12px;font-family:var(--font);background:var(--vscode-input-background,#1a1a2e);color:var(--tx);border:1px solid var(--bdline);border-radius:6px;outline:none">
        <option value="">${L('aiProviderSelect', loc)}</option>
        ${provOptions}
      </select>
    </div>
    <div class="ai-conf-field">
      <label>Endpoint</label>
      <input id="ai-endpoint" type="text" value="https://api.deepseek.com/v1" placeholder="https://api.deepseek.com/v1" />
    </div>
    <div class="ai-conf-field">
      <label>Model</label>
      <input id="ai-model" type="text" value="deepseek-chat" placeholder="deepseek-chat" />
    </div>
    <div class="ai-conf-field">
      <label>API Key</label>
      <input id="ai-key" type="password" placeholder="${L('aiKeyPlaceholder', loc)}" />
    </div>
    <div class="ai-conf-field">
      <label>Max Tokens</label>
      <input id="ai-maxTokens" type="number" value="2000" min="100" max="8192" />
    </div>
    <div class="ai-conf-actions">
      <button class="btn btn-pri btn-sm" onclick="saveAiConf()">💾 Save</button>
      <button class="btn btn-ghost btn-sm" onclick="testAi()">🧪 Test</button>
    </div>
  </div>
  <div class="error-section">
    <label class="section-label">🔍 Paste Error</label>
    <textarea id="ei" placeholder="${L('inputPlaceholder', loc)}" rows="4"></textarea>
    <div class="btn-row">
      <button class="btn btn-pri btn-analyze" onclick="doA()">⚡ ${L('analyzeBtn', loc)}</button>
    </div>
    <div class="hint-text">💡 ${L('hintText', loc)}</div>
  </div>
</div>
<script>
var PRESETS=${JSON.stringify(Object.fromEntries(Object.entries(PROVIDER_PRESETS).map(([k,v])=>[k,{e:v.endpoint,m:v.model}])))};
function onProvChange(){var p=document.getElementById('ai-provider').value;var pr=PRESETS[p];if(pr){document.getElementById('ai-endpoint').value=pr.e;document.getElementById('ai-model').value=pr.m}}
function doA(){const t=document.getElementById('ei').value;vscode.postMessage({type:'analyze',text:t})}
document.getElementById('ei').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.ctrlKey)doA()})
function saveAiConf(){vscode.postMessage({type:'saveAiConfig',provider:document.getElementById('ai-provider').value||'custom',endpoint:document.getElementById('ai-endpoint').value,model:document.getElementById('ai-model').value,key:document.getElementById('ai-key').value,maxTokens:parseInt(document.getElementById('ai-maxTokens').value)||2000})}
function testAi(){vscode.postMessage({type:'testAi',provider:document.getElementById('ai-provider').value,endpoint:document.getElementById('ai-endpoint').value,model:document.getElementById('ai-model').value,key:document.getElementById('ai-key').value,maxTokens:parseInt(document.getElementById('ai-maxTokens').value)||2000})}
window.addEventListener('message',e=>{const m=e.data;if(m.type==='initConfig'){if(m.provider)document.getElementById('ai-provider').value=m.provider;if(m.endpoint)document.getElementById('ai-endpoint').value=m.endpoint;if(m.model)document.getElementById('ai-model').value=m.model;if(m.maxTokens)document.getElementById('ai-maxTokens').value=m.maxTokens;if(m.hasKey)document.getElementById('ai-key').placeholder='•••••••• (saved)'}})
</script>`;
  }

  // ── Settings Tab ──
  private _getSettingsHtml(loc: string): string {
    const cfg = this._runnerConfig;
    const conf = this._showConfidence;
    const builtIn = 76;
    const custom = CustomKnowledgeBase.getCount();

    const langOptions = [
      ['en', 'English'], ['zh', '中文'], ['ja', '日本語'], ['ko', '한국어'],
      ['de', 'Deutsch'], ['fr', 'Français'], ['es', 'Español'], ['pt', 'Português'],
    ].map(([v, n]) => `<option value="${v}"${this._locale === v ? ' selected' : ''}>${n}</option>`).join('');

    const runners = [
      ['python', 'runnerPython', cfg.python || 'python'],
      ['javascript', 'runnerJS', cfg.javascript || 'node'],
      ['typescript', 'runnerTS', cfg.typescript || 'npx ts-node'],
      ['go', 'runnerGo', cfg.go || 'go run'],
      ['ruby', 'runnerRuby', cfg.ruby || 'ruby'],
    ];

    const runnerRows = runners.map(([lang, labelKey, val]) =>
      `<div class="set-row">
        <label>${L(labelKey, loc)}</label>
        <input type="text" value="${escapeHtml(val)}" data-runner="${lang}" onchange="setRunner('${lang}',this.value)" />
      </div>`
    ).join('');

    const colorOptions = (['purple','blue','green','orange'] as const).map(c =>
      `<option value="${c}"${this._appearance.colorTheme === c ? ' selected' : ''}>${c.charAt(0).toUpperCase()+c.slice(1)}</option>`
    ).join('');
    const fontSizeOptions = ['small','medium','large'].map(s =>
      `<option value="${s}"${this._appearance.fontSize === s ? ' selected' : ''}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`
    ).join('');
    const followChecked = this._appearance.followTheme ? ' checked' : '';
    const compactChecked = this._appearance.compactMode ? ' checked' : '';

    return `<div class="settings-section">
  <h4>${L('langLabel', loc)}</h4>
  <div class="set-row">
    <label>${L('langLabel', loc)}</label>
    <select onchange="setLocale(this.value)">${langOptions}</select>
  </div>

  <h4>${L('appearanceSection', loc)}</h4>
  <div class="set-row">
    <label>${L('colorThemeLabel', loc)}</label>
    <select onchange="setColorTheme(this.value)">${colorOptions}</select>
  </div>
  <div class="set-row">
    <label>${L('followThemeLabel', loc)}</label>
    <label class="toggle"><input type="checkbox"${followChecked} onchange="setFollowTheme(this.checked)" /><span class="toggle-slider"></span></label>
  </div>
  <div class="set-row">
    <label>${L('fontSizeLabel', loc)}</label>
    <select onchange="setFontSize(this.value)">${fontSizeOptions}</select>
  </div>
  <div class="set-row">
    <label>${L('compactLabel', loc)}</label>
    <label class="toggle"><input type="checkbox"${compactChecked} onchange="setCompactMode(this.checked)" /><span class="toggle-slider"></span></label>
  </div>

  <h4>${L('runnerSection', loc)}</h4>
  ${runnerRows}

  <h4>${L('confidenceLabel', loc)}</h4>
  <div class="set-row">
    <label>${L('confidenceLabel', loc)}</label>
    <label class="toggle">
      <input type="checkbox" ${conf ? 'checked' : ''} onchange="setConfidence(this.checked)" />
      <span class="toggle-slider"></span>
    </label>
  </div>

  <h4>${L('kbStats', loc)}</h4>
  <div class="kb-stat"><span>${L('builtInLabel', loc)}</span><span class="val">${builtIn}</span></div>
  <div class="kb-stat"><span>${L('customLabel', loc)}</span><span class="val">${custom}</span></div>
</div>
<script>
function setLocale(v){vscode.postMessage({type:'setLocale',value:v})}
function setRunner(lang,v){vscode.postMessage({type:'setRunner',lang,value:v})}
function setConfidence(v){vscode.postMessage({type:'setConfidence',value:v})}
function setColorTheme(v){vscode.postMessage({type:'setAppearance',field:'colorTheme',value:v})}
function setFollowTheme(v){vscode.postMessage({type:'setAppearance',field:'followTheme',value:v})}
function setFontSize(v){vscode.postMessage({type:'setAppearance',field:'fontSize',value:v})}
function setCompactMode(v){vscode.postMessage({type:'setAppearance',field:'compactMode',value:v})}
</script>`;
  }

  // ── Index Tab ──
  private _getIndexHtml(loc: string): string {
    const isZh = loc === 'zh';
    const builtIn = loadKnowledgeBase();
    const custom = CustomKnowledgeBase.load();

    interface IndexEntry { id: string; title: string; lang: string; langIcon: string; solutions: Solution[]; code_fix?: string; ref?: string; }

    const langOrder = ['python', 'javascript', 'typescript', 'golang', 'rust', 'java', 'docker', 'common'];
    const taggedBuiltIn: IndexEntry[] = [];
    for (const lang of langOrder) {
      const group = builtIn.filter(e => e.id.startsWith(`${lang}-`) || (lang === 'typescript' && e.id.startsWith('ts-')));
      for (const e of group) {
        taggedBuiltIn.push({
          id: e.id, title: isZh && e.title_zh ? e.title_zh : e.title,
          lang, langIcon: LANG_INFO[lang]?.icon || '📄',
          solutions: e.solutions.map(s => ({ ...s, title: isZh && s.title_zh ? s.title_zh : s.title, steps: isZh && s.steps_zh ? s.steps_zh : s.steps })),
          code_fix: e.code_fix, ref: e.ref,
        });
      }
    }
    const taggedCustom: IndexEntry[] = custom.map(e => ({
      id: e.id, title: isZh && e.title_zh ? e.title_zh : e.title,
      lang: 'custom', langIcon: '✨',
      solutions: e.solutions.map(s => ({ ...s, title: isZh && s.title_zh ? s.title_zh : s.title, steps: isZh && s.steps_zh ? s.steps_zh : s.steps })),
      code_fix: e.code_fix, ref: e.ref,
    }));

    const allEntries = [...taggedBuiltIn, ...taggedCustom];
    const total = allEntries.length;
    const langs = Array.from(new Set(allEntries.map(e => e.lang)));

    return `<div class="index-wrap">
  <div class="idx-search">
    <input type="text" id="idx-search" placeholder="${L('indexSearch', loc)}" oninput="filterIdx()" />
  </div>
  <div class="idx-filters">
    <button class="idx-filter active" data-lang="all" onclick="setIdxLang('all',this)">${L('indexFilterAll', loc)}</button>
    ${langs.map(l => {
      const li = LANG_INFO[l] || { icon: '📄' };
      return `<button class="idx-filter" data-lang="${l}" onclick="setIdxLang('${l}',this)">${li.icon} ${l}</button>`;
    }).join('')}
  </div>
  <div class="idx-count" id="idx-count">${total} ${L('indexTotal', loc)}</div>
  <div class="idx-list" id="idx-list">
    ${allEntries.map((e, i) => {
      const sols = e.solutions.map(s =>
        `<div class="idx-detail-sol"><h4>🔹 ${escapeHtml(s.title)}</h4><ol>${s.steps.map(st => `<li>${escapeHtml(st)}</li>`).join('')}</ol></div>`
      ).join('');
      const refHtml = e.ref
        ? `<a class="idx-item-ref" href="${escapeHtml(e.ref)}" target="_blank">${L('indexViewRef', loc)}</a>`
        : `<span class="idx-item-ref none">${L('indexNoRef', loc)}</span>`;
      return `<div class="idx-item" data-lang="${e.lang}" data-search="${escapeHtml(e.id)} ${escapeHtml(e.title).toLowerCase()} ${e.lang}">
  <div class="idx-item-head"><div class="idx-item-left"><div class="idx-item-title">${escapeHtml(e.title)}</div><div class="idx-item-meta"><span class="idx-item-lang">${e.langIcon} ${e.lang}</span><span class="idx-item-id">${escapeHtml(e.id)}</span></div></div>${refHtml}</div>
  <div class="idx-detail-expand" onclick="toggleIdxDetail(${i})">📋 ${L('indexExpand', loc)}</div>
  <div class="idx-detail" id="idx-detail-${i}">${sols}</div></div>`;
    }).join('')}
  </div>
</div>
<script>
let idxLang='all',idxQuery='';
function filterIdx(){idxQuery=document.getElementById('idx-search').value.toLowerCase();applyIdxFilter()}
function setIdxLang(l,btn){idxLang=l;document.querySelectorAll('.idx-filter').forEach(b=>b.classList.remove('active'));btn.classList.add('active');applyIdxFilter()}
function applyIdxFilter(){const items=document.querySelectorAll('.idx-item');let visible=0;items.forEach(el=>{const lang=el.dataset.lang;const txt=el.dataset.search||'';const matchLang=idxLang==='all'||lang===idxLang;const matchSearch=!idxQuery||txt.includes(idxQuery);if(matchLang&&matchSearch){el.style.display='';visible++}else el.style.display='none'});document.getElementById('idx-count').textContent=visible+' ${L('indexShowing', loc)} / ${total} ${L('indexTotal', loc)}'}
function toggleIdxDetail(i){const d=document.getElementById('idx-detail-'+i);const btn=d.previousElementSibling;if(d.classList.contains('open')){d.classList.remove('open');btn.textContent='📋 ${L('indexExpand', loc)}'}else{d.classList.add('open');btn.textContent='📋 ${L('indexCollapse', loc)}'}}
</script>`;
  }

  // ── Result HTML ──
  private _getResultHtml(result: MatchResult): string {
    const loc = this._locale;
    const isZh = loc === 'zh';
    const entry = result.entry;
    const entryTitle = isZh && entry.title_zh ? entry.title_zh : entry.title;

    const solHtml = entry.solutions.map(s => {
      const title = isZh && s.title_zh ? s.title_zh : s.title;
      const steps = isZh && s.steps_zh ? s.steps_zh : s.steps;
      return `<div class="sol-card">
  <div class="sol-type">${s.type}</div>
  <div class="sol-title">${escapeHtml(title)}</div>
  <div class="sol-steps">${steps.map((st: string) => `<li>${escapeHtml(st)}</li>`).join('')}</div>
</div>`;
    }).join('');

    const confHtml = this._showConfidence
      ? `<span class="badge">${Math.round(result.confidence * 100)}% ${L('matchPct', loc)}</span>`
      : '';

    return `<!DOCTYPE html>
<html lang="${loc}">
<head><meta charset="UTF-8">${this._getCss()}</head>
<body>
<div class="result-head">
  <h2>
    <span class="result-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg></span>
    ${L('fixFound', loc)}
  </h2>
  ${confHtml}
</div>

<div class="card">
  <h3>
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
    ${escapeHtml(entryTitle)}
  </h3>
  <div class="error-id">${escapeHtml(entry.id)}</div>
</div>

<div class="sols-section">
  <h3>📋 ${L('solutions', loc)}</h3>
  ${solHtml}
</div>

${entry.code_fix ? `<div class="code-fix-card"><h3>🔧 ${L('codeFixLabel', loc)}</h3><pre><code>${escapeHtml(entry.code_fix)}</code></pre></div>` : ''}

${entry.ref ? `<a class="ref-link" href="${entry.ref}" target="_blank">${L('refLink', loc)}</a>` : ''}

<!-- AI Panel placeholder (injected by postMessage) -->
<div id="ai-panel-container"></div>

<button class="back-btn" onclick="goBack()">← ${L('backBtn', loc)}</button>
<script>
var _blastVscode = null;
try { _blastVscode = acquireVsCodeApi(); } catch(e) {}

window.addEventListener('message', function(e) {
  var m = e.data;
  if (m.type === 'aiResult') renderAiResult(m.analysis);
  else if (m.type === 'aiError') renderAiError(m.error);
});

(function showSpinner() {
  var el = document.getElementById('ai-panel-container');
  if (el) el.innerHTML = '<div class="ai-loading" id="ai-spinner"><div class="ai-spinner"></div><span>' + '${L('aiLoading', loc)}' + '</span></div>';
})();

function renderAiResult(analysis) {
  if (!analysis) return;
  var el = document.getElementById('ai-panel-container');
  if (!el) return;
  var sols = '';
  if (analysis.solutions) {
    sols = analysis.solutions.map(function(s) {
      return '<div class="sol-card"><div class="sol-type">' + (s.type||'fix') + '</div><div class="sol-title">' + (s.title||'') + '</div><div class="sol-steps">' + (s.steps||[]).map(function(st){return '<li>'+st+'</li>'}).join('') + '</div></div>';
    }).join('');
  }
  var codeFix = analysis.code_fix ? '<div class="code-fix-card"><h3>🔧 ${L('codeFixLabel', loc)}</h3><pre><code>' + analysis.code_fix + '</code></pre></div>' : '';
  var ref = analysis.ref ? '<a class="ref-link" href="' + analysis.ref + '" target="_blank">📎 View Reference</a>' : '';
  var saveBtn = analysis.kb_entry ? '<button class="btn btn-ghost btn-xs" onclick="saveAiToKb()">${L('saveToKB', loc)}</button>' : '';
  el.innerHTML = '<div class="ai-panel"><div class="ai-panel-head"><h3>${L('aiPanel', loc)} <span class="badge badge-ai">🤖 ${L('aiSource', loc)}</span></h3>' + saveBtn + '</div><div class="ai-panel-body"><div class="ai-summary"><span>🔍 ${L('aiRootCause', loc)}:</span>' + (analysis.summary||'') + '</div><h3 style="font-size:11px;text-transform:uppercase;letter-spacing:.8px;color:var(--txm);margin-bottom:8px">📋 ${L('solutions', loc)}</h3>' + sols + codeFix + ref + '</div><div class="ai-disclaimer">${L('aiDisclaimer', loc)}</div></div>';
  var spin = document.getElementById('ai-spinner');
  if (spin) spin.style.display = 'none';
}

function renderAiError(error) {
  var el = document.getElementById('ai-panel-container');
  if (el) el.innerHTML = '<div class="ai-error">❌ ${L('aiError', loc)}: ' + (error||'Unknown') + '</div>';
}

function goBack() { if(_blastVscode) _blastVscode.postMessage({ type: 'back' }); }
function saveAiToKb() { if(_blastVscode) _blastVscode.postMessage({ type: 'saveToKb' }); }
</script>
</body></html>`;
  }

  // ── Custom KB Tab ──
  private _getCustomKbHtml(loc: string): string {
    const entries = CustomKnowledgeBase.load();
    let entriesHtml: string;
    if (entries.length === 0) {
      entriesHtml = `<div class="empty-state">
  <div style="font-size:32px;margin-bottom:8px;">📖</div>
  <div>${L('emptyKB', loc)}</div>
</div>`;
    } else {
      entriesHtml = entries.map(e => {
        const pats = e.patterns.slice(0, 2).map(p => escapeHtml(p)).join('<br>');
        const more = e.patterns.length > 2 ? ` <span style="color:var(--txm);font-size:10px">+${e.patterns.length - 2}</span>` : '';
        const title = loc === 'zh' && e.title_zh ? e.title_zh : e.title;
        return `<div class="c-entry">
  <div class="c-entry-head"><div><span class="c-entry-id">${escapeHtml(e.id)}</span><div class="c-entry-title">${escapeHtml(title)}</div></div><button class="btn-xs btn-danger" onclick="del('${escapeHtml(e.id)}')">${L('deleteBtn', loc)}</button></div>
  <div class="c-entry-pat">${pats}${more}</div>
</div>`;
      }).join('');
    }

    return `<div class="custom-section">
  <div class="custom-head">
    <h3>${L('customKBTitle', loc)} <span style="font-weight:400;font-size:11px;color:var(--txm)">(${entries.length})</span></h3>
    <div class="custom-acts">
      <button class="btn btn-ghost btn-xs" onclick="impKb()">${L('importBtn', loc)}</button>
      <button class="btn btn-ghost btn-xs" onclick="expKb()">${L('exportBtn', loc)}</button>
      <button class="btn btn-pri btn-xs" onclick="showF()">${L('addNew', loc)}</button>
    </div>
  </div>
  <div id="af" class="c-form" style="display:none">
    <div class="form-g"><label>${L('entryId', loc)} *</label><input id="fi" type="text" placeholder="my-lang-err-001" /></div>
    <div class="form-g"><label>${L('entryTitle', loc)} *</label><input id="ft" type="text" placeholder="Error title" /></div>
    <div class="form-g"><label>${L('entryPattern', loc)} *</label><textarea id="fp" rows="2" placeholder="Error: pattern"></textarea></div>
    <div class="form-g"><label>${L('entrySolTitle', loc)} *</label><input id="fst" type="text" placeholder="Solution" /></div>
    <div class="form-g"><label>${L('entrySolSteps', loc)} *</label><textarea id="fss" rows="2" placeholder="1. Step"></textarea></div>
    <div class="form-g"><label>${L('entryCodeFix', loc)}</label><textarea id="fcf" rows="2" placeholder="Code fix"></textarea></div>
    <div class="form-g"><label>${L('entryRef', loc)}</label><input id="fr" type="text" placeholder="https://" /></div>
    <div class="form-acts">
      <button class="btn btn-pri" onclick="save()">${L('saveBtn', loc)}</button>
      <button class="btn btn-ghost" onclick="hideF()">${L('cancelBtn', loc)}</button>
    </div>
  </div>
  <div id="el">${entriesHtml}</div>
</div>
<script>
function showF(){document.getElementById('af').style.display='block'}
function hideF(){document.getElementById('af').style.display='none';['fi','ft','fp','fst','fss','fcf','fr'].forEach(i=>document.getElementById(i).value='')}
function save(){const id=document.getElementById('fi').value.trim(),title=document.getElementById('ft').value.trim(),pats=document.getElementById('fp').value.trim(),st=document.getElementById('fst').value.trim(),ss=document.getElementById('fss').value.trim();if(!id||!title||!pats||!st||!ss){alert('${loc==='zh'?'请填写所有必填字段':'Please fill all required fields'}');return}vscode.postMessage({type:'addCustomEntry',data:{id,title,patterns:pats.split('\\n').filter(p=>p.trim()),solutions:[{type:'fix',title:st,steps:ss.split('\\n').filter(s=>s.trim())}],code_fix:document.getElementById('fcf').value.trim()||undefined,ref:document.getElementById('fr').value.trim()||undefined}})}
function del(id){if(confirm('${loc==='zh'?'确定删除此条目？':'Delete this entry?'}'))vscode.postMessage({type:'deleteCustomEntry',id})}
function impKb(){vscode.postMessage({type:'importKb'})}
function expKb(){vscode.postMessage({type:'exportKb'})}
</script>`;
  }
}
