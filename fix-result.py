#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Replace _getResultHtml with pure string concatenation, NO template literals in JS area."""
import re

path = r"C:\Users\HONOR\.qclaw\workspace-tfxjjhfnjialcuju\blast-vscode\src\panels\sidebar.ts"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

ms = content.find("  private _getResultHtml(result: MatchResult): string {")
me = content.find("\n  // \u2500\u2500 Custom KB Tab")

new = '''  private _getResultHtml(result: MatchResult): string {
    const loc = this._locale;
    const isZh = loc === 'zh';
    const entry = result.entry;
    const entryTitle = isZh && entry.title_zh ? entry.title_zh : entry.title;

    const solHtml = entry.solutions.map(s => {
      const title = isZh && s.title_zh ? s.title_zh : s.title;
      const steps = isZh && s.steps_zh ? s.steps_zh : s.steps;
      return '<div class="sol-card"><div class="sol-type">' + escapeHtml(s.type) + '</div><div class="sol-title">' + escapeHtml(title) + '</div><div class="sol-steps">' + steps.map((st: string) => '<li>' + escapeHtml(st) + '</li>').join('') + '</div></div>';
    }).join('');

    const confHtml = this._showConfidence
      ? '<span class="badge">' + Math.round(result.confidence * 100) + '% ' + L('matchPct', loc) + '</span>'
      : '';

    const codeFixBlock = entry.code_fix
      ? '<div class="code-fix-card"><h3>' + L('codeFixLabel', loc) + '</h3><pre><code>' + escapeHtml(entry.code_fix) + '</code></pre></div>'
      : '';

    const refBlock = entry.ref
      ? '<a class="ref-link" href="' + escapeHtml(entry.ref) + '" target="_blank">' + L('refLink', loc) + '</a>'
      : '';

    const fixIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
    const infoIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';

    const aiLoadingText = L('aiLoading', loc);
    const aiErrorText = L('aiError', loc);
    const aiPanelText = L('aiPanel', loc);
    const aiDisclaimerText = L('aiDisclaimer', loc);
    const codeFixLabelText = L('codeFixLabel', loc);
    const backBtnText = L('backBtn', loc);
    const copyBtnText = L('copyBtn', loc);
    const copiedText = L('copied', loc);
    const fixFoundText = L('fixFound', loc);
    const solutionsText = L('solutions', loc);

    return '<!DOCTYPE html>\\n<html lang="' + loc + '">\\n<head><meta charset="UTF-8">' + this._getCss() + '</head>\\n<body>\\n' +
      '<div class="result-head"><h2><span class="result-icon">' + fixIcon + '</span> ' + fixFoundText + '</h2>' + confHtml + '</div>\\n' +
      '<div class="card"><h3>' + infoIcon + ' ' + escapeHtml(entryTitle) + '</h3><div class="error-id">' + escapeHtml(entry.id) + '</div></div>\\n' +
      '<div class="sols-section"><h3>' + solutionsText + '</h3>' + solHtml + '</div>\\n' +
      codeFixBlock + '\\n' +
      refBlock + '\\n' +
      '<div id="aibox"></div>\\n' +
      '<div style="display:flex;gap:8px;margin-top:16px">\\n' +
      '<button class="back-btn" onclick="B()">' + backBtnText + '</button>\\n' +
      '<button class="copy-btn" id="cb" onclick="C()">' + copyBtnText + '</button>\\n' +
      '</div>\\n' +
      '<script>\\n' +
      'var _v;try{_v=acquireVsCodeApi();document.title="OK"}catch(e){document.title="ERR:"+e.message;document.body.insertAdjacentHTML("afterbegin","<div style=background:red;color:white;padding:4px;font-size:12px>JS CRASH: "+e.message+"</div>")}\\n' +
      'function B(){if(_v)_v.postMessage({type:"back"})}\\n' +
      'function C(){var p=[];try{\\n' +
      'var h=document.querySelector(".result-head h2");if(h)p.push(h.textContent.trim());\\n' +
      'var b=document.querySelector(".badge");if(b)p.push(b.textContent.trim());\\n' +
      'var c=document.querySelector(".card");if(c)p.push("",c.textContent.trim());\\n' +
      'var s=document.querySelector(".sols-section");if(s)p.push("",s.textContent.trim());\\n' +
      'var cf=document.querySelector(".code-fix-card pre");if(cf)p.push("","--- Code Fix ---",cf.textContent);\\n' +
      'var ai=document.getElementById("aibox");if(ai){var t=ai.textContent.trim();if(t&&!t.startsWith("AI "))p.push("","--- AI ---",t)}\\n' +
      'var txt=p.join("\\n").replace(/\\n{3,}/g,"\\n\\n").trim();\\n' +
      'navigator.clipboard.writeText(txt).then(function(){var btn=document.getElementById("cb");' +
      'btn.textContent="' + copiedText + '";btn.classList.add("copied");' +
      'setTimeout(function(){btn.textContent="' + copyBtnText + '";btn.classList.remove("copied")},1500)})\\n' +
      '}catch(x){document.title="CERR:"+x.message}}\\n' +
      'function SHOW(s){var el=document.getElementById("aibox");if(el)el.innerHTML="<div class=ai-loading id=ai-spin><div class=ai-spinner></div><span>' + aiLoadingText + '</span></div>"}\\n' +
      'function ERR(msg){var el=document.getElementById("aibox");if(el)el.innerHTML="<div style=color:#f87171;padding:8px;border:1px solid #dc2626;border-radius:6px;margin-top:8px>' + aiErrorText + ': "+(msg||"Unknown")+"</div>"}\\n' +
      'function SHOWAI(data){if(!data)return;var el=document.getElementById("aibox");if(!el)return;' +
      'var sols=(data.solutions||[]).map(function(s){return "<div class=sol-card><div class=sol-type>"+(s.type||"fix")+"</div><div class=sol-title>"+(s.title||"")+"</div><div class=sol-steps>"+(s.steps||[]).reduce(function(a,b){return a+"<li>"+b+"</li>"},"")+"</div></div>"}).join("");' +
      'var cf=data.code_fix?"<div class=code-fix-card><h3>' + codeFixLabelText + '</h3><pre><code>"+data.code_fix+"</code></pre></div>":"";' +
      'el.innerHTML="<div class=ai-panel><div class=ai-panel-head><h3>' + aiPanelText + '</h3></div><div class=ai-panel-body><div class=ai-summary>"+(data.summary||"")+"</div>"+sols+cf+"</div><div class=ai-disclaimer>' + aiDisclaimerText + '</div></div>"}\\n' +
      'window.addEventListener("message",function(e){var m=e.data;if(m.type=="aiResult")SHOWAI(m.analysis);if(m.type=="aiError")ERR(m.error)}\\n' +
      ');\\n' +
      'SHOW(true);\\n' +
      '<' + '/script>\\n' +
      '</body></html>';
  }
'''

new_content = content[:ms] + new + content[me:]
with open(path, 'w', encoding='utf-8') as f:
    f.write(new_content)
print("Done. New method length:", len(new))
