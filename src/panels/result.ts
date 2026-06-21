import * as vscode from 'vscode';

export function showResultPanel(result: any) {
  const panel = vscode.window.createWebviewPanel(
    'blastResult',
    'Blast: Analysis Result',
    vscode.ViewColumn.Beside,
    { enableScripts: true }
  );

  panel.webview.html = getResultHtml(result);
}

export function getResultHtml(result: any): string {
  const entry = result.entry;
  let solutionsHtml = '';

  if (entry.solutions) {
    solutionsHtml = '<h3>📋 Solutions:</h3><ul>';
    for (const sol of entry.solutions) {
      solutionsHtml += `<li><strong>${sol.title}</strong><ul>`;
      for (const step of sol.steps) {
        solutionsHtml += `<li>${step}</li>`;
      }
      solutionsHtml += '</ul></li>';
    }
    solutionsHtml += '</ul>';
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: sans-serif; padding: 20px; }
        h2 { color: #0066cc; }
        code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; }
        ul { line-height: 1.8; }
      </style>
    </head>
    <body>
      <h2>🔍 Blast Analysis Result</h2>
      <p><strong>Error:</strong> ${entry.title}</p>
      <p><strong>ID:</strong> <code>${entry.id}</code></p>
      ${solutionsHtml}
      ${entry.ref ? `<p><a href="${entry.ref}">📎 Reference</a></p>` : ''}
    </body>
    </html>
  `;
}
