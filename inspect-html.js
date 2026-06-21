// Extract and evaluate the _getResultHtml method to see what HTML it generates
const fs = require('fs');
const src = fs.readFileSync('out/panels/sidebar.js', 'utf8');

// Find the _getResultHtml method - in compiled JS it uses prototype
const methodStart = src.indexOf('SidebarProvider.prototype._getResultHtml');
console.log('Method found at:', methodStart);

// Extract 200 chars starting from the return statement
const returnIdx = src.indexOf('return ', methodStart);
if (returnIdx > 0) {
  const snippet = src.substring(returnIdx, returnIdx + 300);
  console.log('Return statement area:\n', snippet);
  
  // Check if it uses template literal (backtick) or string concat
  const hasTemplate = snippet.includes('`<!DOCTYPE html>');
  console.log('\nUses template literal:', hasTemplate);
}
