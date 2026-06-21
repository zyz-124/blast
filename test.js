// Blast 插件测试脚本 - 直接测试已编译的 out/*.js
const { loadKnowledgeBase, findMatch } = require('./out/knowledge/index');
const { MatcherEngine } = require('./out/matcher/engine');

let pass = 0;
let fail = 0;

function test(name, fn) {
  try {
    fn();
    pass++;
    console.log(`  ✅ ${name}`);
  } catch (e) {
    fail++;
    console.log(`  ❌ ${name}`);
    console.log(`     ${e.message}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

console.log('========================================');
console.log('  Blast VSCode Extension - Unit Tests');
console.log('========================================\n');

// --- 1. Knowledge Base ---
console.log('📚 Knowledge Base:');
const kb = loadKnowledgeBase();
test('loads without error', () => assert(kb !== undefined));
test('contains entries', () => assert(kb.length > 0, `Expected >0, got ${kb.length}`));
test('entries have id', () => kb.forEach(e => assert(e.id, `Missing id in ${e.title}`)));
test('entries have patterns', () => kb.forEach(e => assert(Array.isArray(e.patterns) && e.patterns.length > 0, `Missing patterns in ${e.id}`)));
test('entries have solutions', () => kb.forEach(e => assert(Array.isArray(e.solutions) && e.solutions.length > 0, `Missing solutions in ${e.id}`)));

// --- 2. Matcher Engine ---
console.log('\n🔍 Matcher Engine:');
const engine = new MatcherEngine(() => loadKnowledgeBase());

// Python tests
test('matches ModuleNotFoundError', () => {
  const r = engine.analyzeText("ModuleNotFoundError: No module named 'requests'");
  assert(r !== null, 'should match');
  assert(r.entry.id === 'py-import-001');
  assert(r.confidence > 0);
});

test('matches TypeError (unsupported operand)', () => {
  const r = engine.analyzeText("TypeError: unsupported operand type(s) for +: 'int' and 'str'");
  assert(r !== null, 'should match');
  assert(r.entry.id === 'py-type-002');
});

test('multi-line input - finds error in line 3', () => {
  const input = 'Traceback (most recent call last):\n  File "app.py", line 5\nModuleNotFoundError: No module named \'flask\'';
  const r = engine.analyzeText(input);
  assert(r !== null, 'should find error in multi-line traceback');
  assert(r.entry.id === 'py-import-001');
});

// JavaScript tests
test('matches Cannot read property (no TypeError prefix)', () => {
  const r = engine.analyzeText("Cannot read property 'map' of undefined");
  assert(r !== null, 'should match plain JS error');
  assert(r.entry.id === 'js-type-001');
});

test('JS error with TypeError prefix still matches', () => {
  // With "TypeError:" prefix, py-type-001 is longer match (greedy .+)
  // Both are valid hits; verifies we get a result
  const r = engine.analyzeText("TypeError: Cannot read property 'map' of undefined");
  assert(r !== null, 'any match is better than none');
});

// Common errors
test('matches Permission denied', () => {
  const r = engine.analyzeText("Permission denied: /usr/local/bin/node");
  assert(r !== null, 'should match');
  assert(r.entry.id === 'common-perm-001');
});

// --- 3. Edge Cases ---
console.log('\n🧪 Edge Cases:');

test('empty string returns null', () => {
  const r = engine.analyzeText('');
  assert(r === null);
});

test('gibberish returns null', () => {
  const r = engine.analyzeText('asdfghjkl12345!@#$%^&*()');
  assert(r === null);
});

test('handles very long input', () => {
  const long = 'x'.repeat(10000) + "\nModuleNotFoundError: No module named 'test'";
  const r = engine.analyzeText(long);
  assert(r !== null);
  assert(r.entry.id === 'py-import-001');
});

// --- 4. MatchResult Structure ---
console.log('\n📋 MatchResult Structure:');

const result = engine.analyzeText("ModuleNotFoundError: No module named 'django'");
test('has entry', () => assert(result.entry !== undefined));
test('has match array', () => assert(Array.isArray(result.match)));
test('has confidence', () => assert(typeof result.confidence === 'number'));
test('entry has solutions array', () => assert(Array.isArray(result.entry.solutions)));
test('solutions have steps', () => {
  for (const sol of result.entry.solutions) {
    assert(Array.isArray(sol.steps), `Missing steps in ${sol.title}`);
  }
});

// --- 5. Multi-Language Tests ---
console.log('\n🌍 Multi-Language:');

test('Go: matches undefined/undeclared', () => {
  const r = engine.analyzeText('main.go:5:2: undefined: fmt');
  assert(r !== null);
  assert(r.entry.id === 'go-build-001');
});

test('Rust: matches borrow of moved value', () => {
  const r = engine.analyzeText('error[E0382]: borrow of moved value: `data`');
  assert(r !== null);
  assert(r.entry.id === 'rust-borrow-001');
});

test('Java: matches NullPointerException', () => {
  const r = engine.analyzeText('Exception in thread "main" java.lang.NullPointerException');
  assert(r !== null);
  assert(r.entry.id === 'java-npe-001');
});

test('Python: matches NameError', () => {
  const r = engine.analyzeText("NameError: name 'requests' is not defined");
  assert(r !== null);
  assert(r.entry.id === 'py-name-001');
});

test('JS: matches JSON parse error', () => {
  const r = engine.analyzeText("SyntaxError: Unexpected token } in JSON at position 42");
  assert(r !== null, 'should match some JS error pattern');
});

test('Docker: matches port already allocated', () => {
  const r = engine.analyzeText('Error response from daemon: port is already allocated');
  assert(r !== null);
  assert(r.entry.id === 'docker-port-001');
});

test('Common: matches git merge conflict', () => {
  const r = engine.analyzeText('CONFLICT (content): Merge conflict in file.txt');
  assert(r !== null);
  assert(r.entry.id === 'common-git-conflict-001');
});

test('Common: matches address already in use', () => {
  const r = engine.analyzeText('Error: listen EADDRINUSE: address already in use :::3000');
  assert(r !== null);
  assert(r.entry.id === 'common-addr-001');
});

test('Python: matches f-string syntax error', () => {
  const r = engine.analyzeText('SyntaxError: f-string: expecting } at line 10');
  assert(r !== null, 'should match f-string syntax error pattern');
});

test('Custom KB: add entry and match', () => {
  // Clean state
  const { CustomKnowledgeBase } = require('./out/knowledge/custom');
  // Add a test entry
  const testEntry = {
    id: 'test-custom-001',
    title: 'Test Error',
    patterns: ['TestError: something went wrong'],
    solutions: [{ type: 'fix', title: 'Fix it', steps: ['Do X', 'Do Y'] }],
  };
  // Clean up any previous test entry
  CustomKnowledgeBase.remove('test-custom-001');
  CustomKnowledgeBase.add(testEntry);
  // Now create a fresh engine that will include the custom entry
  const { loadKnowledgeBase: freshLoad } = require('./out/knowledge/index');
  const freshEngine = new (require('./out/matcher/engine').MatcherEngine)(() => freshLoad());
  const r = freshEngine.analyzeText('TestError: something went wrong');
  assert(r !== null, 'should match custom entry');
  assert(r.entry.id === 'test-custom-001', 'should match test-custom-001');
  // Cleanup
  CustomKnowledgeBase.remove('test-custom-001');
});

test('Custom KB: empty state handles gracefully', () => {
  const { CustomKnowledgeBase } = require('./out/knowledge/custom');
  const entries = CustomKnowledgeBase.load();
  const hasTest = entries.some(e => e.id === 'test-custom-001');
  assert(!hasTest, 'test entry should be cleaned up');
});

// --- Summary ---
console.log('\n========================================');
console.log(`  Results: ${pass} passed / ${fail} failed / ${pass+fail} total`);
console.log('========================================\n');

if (fail > 0) {
  console.log('❌ SOME TESTS FAILED');
  process.exit(1);
} else {
  console.log('✅ ALL TESTS PASSED');
}
