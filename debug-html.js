// Simulate _getResultHtml output by extracting the template from sidebar.ts
const fs = require('fs');
const src = fs.readFileSync('src/panels/sidebar.ts', 'utf8');

// Mock functions
function L(key, loc) {
  const dict = {
    'fixFound': '✅ Fix Found',
    'matchPct': 'match',
    'solutions': 'Solutions',
    'codeFixLabel': 'Code Fix',
    'refLink': 'Reference',
    'backBtn': '← Return',
    'copyBtn': 'Copy',
    'copied': 'Copied!',
    'aiLoading': 'AI analyzing...',
    'aiError': 'AI Error',
    'aiPanel': 'AI Analysis',
    'aiSource': 'AI',
    'aiRootCause': 'Root Cause',
    'aiDisclaimer': 'AI-generated. Verify before applying.',
    'saveToKB': 'Save to KB',
  };
  return dict[key] || key;
}
function escapeHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// Mock _getCss
const mockCss = '<style>body{color:#fff}</style>';

// Find the method return statement (the template literal)
const methodStart = src.indexOf("  private _getResultHtml(result: MatchResult): string {");
if (methodStart < 0) { console.log("Method not found"); process.exit(1); }

// Find the return statement
const retIdx = src.indexOf("return `<", methodStart);
if (retIdx < 0) { console.log("Return statement not found"); process.exit(1); }

// Extract the template literal content (from `<` to `;\n  }`)
// Find the method closing brace
const closeIdx = src.indexOf("  }\n\n  // ── Custom KB Tab", methodStart);
if (closeIdx < 0) { console.log("Closing not found"); process.exit(1); }

// The return is: return `...\`;\n  }
// Extract from after `return ` to before `;\n  }`
const tlStart = retIdx + 7; // after 'return '
const tlEnd = src.lastIndexOf('`;', closeIdx);
const template = src.substring(tlStart, tlEnd + 1); // include the backtick

// Now we need to evaluate this template literal.
// The template uses ${L(...)} and ${escapeHtml(...)} etc.
// We can't directly eval because it references 'this._getCss()', 'this._locale', etc.
// Instead, let's manually extract the JS from the generated HTML

// Alternative: look at the compiled JS instead
console.log("Template literal length:", template.length);
console.log("Checking compiled JS...");

const compiled = fs.readFileSync('out/panels/sidebar.js', 'utf8');
const cStart = compiled.indexOf('_getResultHtml(');
if (cStart < 0) { console.log("Compiled method not found"); process.exit(1); }

// In compiled JS at target ES2020, the return is: return `<!DOCTYPE html>...
const cRet = compiled.indexOf('return `', cStart);
if (cRet < 0) { console.log("Compiled return not found"); process.exit(1); }

// Find the end - look for `;\n    }` or similar
const cEnd = compiled.indexOf('\n    }\n    // \u2500\u2500 Custom KB Tab', cRet);
if (cEnd < 0) { console.log("Compiled end not found"); process.exit(1); }

const compMethod = compiled.substring(cStart, cEnd);
console.log("Compiled method length:", compMethod.length);

// Now evaluable? No, still has this._locale references.
// Let me try a different approach: extract just the JS <script> block from the compiled method
const scriptStart = compMethod.indexOf('<script>');
const scriptEnd = compMethod.lastIndexOf('</script>');
if (scriptStart >= 0 && scriptEnd >= 0) {
  const jsBlock = compMethod.substring(scriptStart + 8, scriptEnd);
  console.log("\n=== EXTRACTED JS FROM COMPILED METHOD ===");
  console.log(jsBlock.substring(0, 500));
  console.log("\n... (truncated, total:", jsBlock.length, "chars)");
  
  // The JS still contains ${L('...', loc)} etc because it's part of the template literal
  // These get evaluated at Node.js runtime, not when we read the file
  console.log("\nContains template ${} expressions:", jsBlock.includes('${'));
}
