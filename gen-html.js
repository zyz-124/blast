// Generate the actual HTML from _getResultHtml and validate the JS
const vm = require('vm');
const fs = require('fs');

// Mock functions that the method calls
function L(key, loc) {
  const dict = { fixFound:'Fix Found', matchPct:'match', solutions:'Solutions', codeFixLabel:'Code Fix', refLink:'Reference', backBtn:'← Return', copyBtn:'Copy', copied:'Copied!', aiLoading:'AI analyzing...', aiError:'AI Error', aiPanel:'AI Analysis', aiSource:'AI', aiRootCause:'Root Cause', aiDisclaimer:'AI-generated advice. Verify before applying.', saveToKB:'Save', noMatch:'No match' };
  return dict[key] || '[' + key + ']';
}
function escapeHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// Mock this
const mockThis = {
  _locale: 'zh',
  _showConfidence: true,
  _getCss: () => '<style>body{color:#fff}</style>',
};

// Load the compiled sidebar.js
const sidebarCode = fs.readFileSync('out/panels/sidebar.js', 'utf8');

// Create a fake module context
const sandbox = {
  module: { exports: {} },
  require: (mod) => {
    if (mod === 'vscode') return { window: { createTextEditorDecorationType: () => ({ dispose: () => {} }) } };
    const req = require(mod);
    if (mod.endsWith('./dictionary')) return { L, escapeHtml };
    if (mod.endsWith('./custom') || mod.endsWith('../knowledge/custom')) return { CustomKnowledgeBase: { load: () => [] } };
    return req;
  },
  exports: {},
  console: console,
  setTimeout: setTimeout,
};
vm.createContext(sandbox);

// Evaluate the sidebar code
try {
  vm.runInContext(sidebarCode, sandbox);
} catch (e) {
  console.error('Failed to eval sidebar.js:', e.message);
}

// Get SidebarProvider class
const SidebarProvider = sandbox.module.exports?.SidebarProvider || sandbox.SidebarProvider;
if (!SidebarProvider) {
  console.log('SidebarProvider not found in exports');
  process.exit(1);
}

// Create instance
const provider = new SidebarProvider(null);
provider._locale = 'zh';
provider._showConfidence = true;

// Mock _getCss
provider._getCss = () => '<style>body{color:#fff}</style>';

// Create a mock MatchResult
const mockResult = {
  entry: {
    id: 'E0001',
    title: 'ModuleNotFoundError',
    title_zh: '模块未找到错误',
    confidence: 0.98,
    solutions: [
      { type: 'fix', title: 'Install the module', title_zh: '安装模块', steps: ['pip install module-name'], steps_zh: ['pip install module-name'] },
      { type: 'info', title: 'Check virtual environment', title_zh: '检查虚拟环境', steps: ['source venv/bin/activate'], steps_zh: ['venv\\Scripts\\activate'] }
    ],
    code_fix: 'pip install fastapi',
    ref: 'https://docs.python.org/3/library/exceptions.html#ModuleNotFoundError'
  },
  confidence: 0.98
};

// Generate HTML
const html = provider._getResultHtml(mockResult);
console.log('Generated HTML length:', html.length);

// Extract <script> content
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) {
  console.error('NO <script> TAG FOUND IN OUTPUT!');
  fs.writeFileSync('debug-output.html', html);
  console.log('Full HTML written to debug-output.html');
  process.exit(1);
}

const js = scriptMatch[1];
console.log('Script JS length:', js.length);
console.log('');
console.log('=== SCRIPT CONTENT ===');
console.log(js);
console.log('');
console.log('=== CHECKING JS SYNTAX ===');

// Try to validate
try {
  new vm.Script(js);
  console.log('✅ JavaScript syntax is VALID!');
} catch (e) {
  console.error('❌ JavaScript syntax ERROR:', e.message);
  console.error('At line:', e.stack?.split('\n')[0]);
}

// Write full HTML for inspection
fs.writeFileSync('debug-output.html', html);
console.log('\nFull HTML written to debug-output.html');
