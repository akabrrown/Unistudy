export function stripForExport(markdown: string): string {
  return markdown.replace(/<\/?(followups|memory)>/gi, '').trim();
}

function safeFileName(title: string): string {
  return (
    title
      .replace(/[^a-z0-9\-_ ]/gi, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 60) || 'tutor-answer'
  );
}

export function downloadAnswerMarkdown(title: string, markdown: string) {
  const body = `# ${title}\n\n${stripForExport(markdown)}\n\n---\nExported from UniStudy AI Tutor on ${new Date().toLocaleString()}\n`;
  const blob = new Blob([body], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeFileName(title)}.md`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function printAnswerAsPdf(title: string, renderedHtml: string): boolean {
  const win = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1000');
  if (!win) return false;
  const katexCss = Array.from(document.styleSheets)
    .map((sheet) => {
      try {
        return Array.from(sheet.cssRules)
          .map((r) => r.cssText)
          .join('\n');
      } catch {
        return '';
      }
    })
    .join('\n');
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>${katexCss}
body{font-family:Georgia,'Times New Roman',serif;color:#111;max-width:760px;margin:32px auto;padding:0 24px;line-height:1.6}
h1,h2,h3{color:#00004E}table{border-collapse:collapse}td,th{border:1px solid #bbb;padding:6px 10px}
pre{background:#f4f4f6;padding:12px;border-radius:6px;overflow:auto;font-size:12px}code{font-family:Consolas,monospace}
.footer{margin-top:32px;font-size:11px;color:#666;border-top:1px solid #ccc;padding-top:8px}</style></head>
<body><h1>${escapeHtml(title)}</h1>${renderedHtml}<div class="footer">UniStudy AI Tutor · ${new Date().toLocaleDateString()}</div></body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
  return true;
}
