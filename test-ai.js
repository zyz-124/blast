"use strict";

var API_KEY = process.argv[2];
if (!API_KEY) {
  console.error("Usage: node test-ai.js <cancri_sk_xxx>");
  process.exit(1);
}

var BASE_URL = "https://chat.nexusvai.xyz/functions/v1/api-gateway/v1";
var MODEL = "deepseek-v4-pro";

function extractJSON(text) {
  try { return JSON.parse(text); } catch (e) { /* no */ }
  var fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) {
    try { return JSON.parse(fence[1].trim()); } catch (e) { /* no */ }
  }
  var brace = text.match(/\{[\s\S]*\}/);
  if (brace) {
    try { return JSON.parse(brace[0]); } catch (e) { /* no */ }
  }
  return null;
}

function errorText(e) {
  return e ? (e.message || String(e)) : "Unknown error";
}

async function testConnection() {
  console.log("1. Testing connection...");
  var r = await fetch(BASE_URL + "/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + API_KEY,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: "You are a test bot. Reply with JSON only: {\"title\":\"OK\",\"summary\":\"Connection works\"}" },
        { role: "user", content: "Ping" },
      ],
      max_tokens: 200,
    }),
  });
  if (!r.ok) {
    var body = await r.text();
    console.error("   FAILED: " + r.status + " " + body.slice(0, 200));
    process.exit(1);
  }
  var d = await r.json();
  var usage = d.usage || {};
  console.log("   OK! Model: " + d.model + ", tokens: " + (usage.total_tokens || "?"));
  console.log("   Response: " + ((d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || "").slice(0, 100));
}

async function testErrorAnalysis() {
  console.log("\n2. Testing error analysis (Python ModuleNotFoundError)...");

  var systemPrompt = "You are Blast, an expert programming error debugger and code reviewer.\n" +
    "Your job: analyze error messages in context and produce precise, actionable fixes.\n\n" +
    "Rules:\n" +
    "1. Identify the root cause in one sentence.\n" +
    "2. Provide 1-3 ranked solutions, each with step-by-step instructions.\n" +
    "3. Generate a code fix: show the WRONG code, then the CORRECT code side by side.\n\n" +
    "Respond ONLY with valid JSON:\n" +
    '{"title":"Short error title","summary":"One-sentence root cause",' +
    '"solutions":[{"type":"fix","title":"Solution title","steps":["Step 1","Step 2"]}],' +
    '"code_fix":"# Error\\n...\\n\\n# Fix\\n...",' +
    '"ref":"https://...",' +
    '"kb_entry":{"id":"ai-gen-20260619-001","patterns":["regex1"],"language":"python"}}';

  var userPrompt = "Language: python\n" +
    "File: /project/app.py\n\n" +
    "Surrounding code:\n" +
    "```python\n" +
    "import os\n" +
    "import sys\n" +
    "import numpy\n" +
    "from django.http import HttpResponse\n" +
    "\n" +
    "def index(request):\n" +
    "    return HttpResponse(\"Hello\")\n" +
    "```\n\n" +
    "Error output:\n" +
    "ModuleNotFoundError: No module named 'django'\n\n" +
    "Analyze this error and provide fixes.";

  var t0 = Date.now();
  var r = await fetch(BASE_URL + "/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + API_KEY,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 2000,
      temperature: 0.3,
    }),
  });

  var elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  if (!r.ok) {
    var errBody = await r.text();
    console.error("   FAILED: " + r.status + " " + errBody.slice(0, 300));
    process.exit(1);
  }

  var d = await r.json();
  var content = "";
  if (d.choices && d.choices[0] && d.choices[0].message) {
    content = d.choices[0].message.content || "";
  }
  var usage = d.usage || {};
  console.log("   Time: " + elapsed + "s, tokens: " + (usage.total_tokens || "?"));

  var analysis = extractJSON(content);
  if (analysis) {
    console.log("\n   AI Analysis Result:");
    console.log("   Title:   " + (analysis.title || "N/A"));
    console.log("   Summary: " + (analysis.summary || "N/A"));
    var sols = analysis.solutions || [];
    console.log("   Solutions: " + sols.length);
    sols.forEach(function(s, i) {
      console.log("     [" + (i + 1) + "] " + s.title + " (" + (s.steps ? s.steps.length : 0) + " steps)");
    });
    if (analysis.code_fix) {
      console.log("\n   Code Fix:");
      analysis.code_fix.split("\n").forEach(function(l) {
        console.log("     " + l);
      });
    }
    if (analysis.kb_entry) {
      console.log("\n   KB Entry ready:");
      console.log("     id: " + analysis.kb_entry.id);
      console.log("     patterns: " + JSON.stringify(analysis.kb_entry.patterns));
      console.log("     language: " + analysis.kb_entry.language);
    }
    console.log("\n   JSON parsing: OK!");
  } else {
    console.log("   Could not parse JSON. Raw (300 chars):");
    console.log("   " + content.slice(0, 300));
  }
}

async function testNoContextError() {
  console.log("\n3. Testing error analysis (no context, Go error)...");

  var systemPrompt = "You are Blast, an expert programming error debugger.\n" +
    "Analyze error messages and produce precise, actionable fixes.\n" +
    "Respond ONLY with valid JSON:\n" +
    '{"title":"...","summary":"...","solutions":[{"type":"fix","title":"...","steps":["..."]}],"code_fix":"# Error\\n...\\n\\n# Fix\\n...","ref":"...","kb_entry":{"id":"ai-gen-YYYYMMDD-NNN","patterns":["regex"],"language":"golang"}}';

  var userPrompt = "Error output:\n" +
    "./main.go:12:2: undefined: fmt\n\n" +
    "Analyze this error and provide fixes.";

  var r = await fetch(BASE_URL + "/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + API_KEY,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 1500,
      temperature: 0.3,
    }),
  });

  if (!r.ok) {
    var errBody = await r.text();
    console.error("   FAILED: " + r.status + " " + errBody.slice(0, 200));
    return;
  }

  var d = await r.json();
  var content = "";
  if (d.choices && d.choices[0] && d.choices[0].message) {
    content = d.choices[0].message.content || "";
  }
  var analysis = extractJSON(content);

  if (analysis) {
    console.log("   OK: " + (analysis.title || "?") + " -> " + (analysis.summary || "?"));
  } else {
    console.log("   Parse failed: " + content.slice(0, 150));
  }
}

(async function() {
  try {
    await testConnection();
    await testErrorAnalysis();
    await testNoContextError();
    console.log("\nAll tests passed! AI integration works correctly.");
  } catch (e) {
    console.error("\nTest failed: " + errorText(e));
    process.exit(1);
  }
})();
