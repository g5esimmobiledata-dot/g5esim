export type DocumentExportFormat = 'excel' | 'word' | 'pdf';

export type DocumentSection = {
  title?: string;
  html: string;
};

export function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function rowsToHtmlTable(rows: Array<Array<string | number | null | undefined>>) {
  if (rows.length === 0) return '<table><tbody></tbody></table>';

  const [head, ...body] = rows;
  const header = head
    .map((cell) => `<th>${escapeHtml(cell)}</th>`)
    .join('');
  const bodyRows = body
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`)
    .join('');

  return `<table><thead><tr>${header}</tr></thead><tbody>${bodyRows}</tbody></table>`;
}

export function buildDocumentHtml({
  title,
  subtitle,
  sections,
}: {
  title: string;
  subtitle?: string;
  sections: DocumentSection[];
}) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      body {
        margin: 0;
        padding: 22px;
        color: #0f172a;
        background: #ffffff;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 13px;
        line-height: 1.35;
      }
      h1 {
        margin: 0;
        font-size: 24px;
      }
      h2 {
        margin: 16px 0 8px;
        font-size: 16px;
      }
      p {
        margin: 5px 0 0;
        color: #475569;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 8px;
      }
      th,
      td {
        border: 1px solid #dbe3ea;
        padding: 7px 9px;
        text-align: left;
        vertical-align: top;
      }
      th {
        background: #f1f5f9;
        color: #0f172a;
        font-weight: 700;
      }
      .section {
        margin-top: 12px;
      }
      .meta {
        color: #64748b;
        font-size: 12px;
      }
      @media print {
        @page {
          size: A4;
          margin: 8mm;
        }
        body {
          padding: 0;
        }
      }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(title)}</h1>
    ${subtitle ? `<p class="meta">${escapeHtml(subtitle)}</p>` : ''}
    ${sections
      .map(
        (section) => `<div class="section">
          ${section.title ? `<h2>${escapeHtml(section.title)}</h2>` : ''}
          ${section.html}
        </div>`,
      )
      .join('')}
  </body>
</html>`;
}

export function downloadBlob(content: string, mimeType: string, filename: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function getFilenameFromDisposition(disposition: string | null) {
  if (!disposition) return '';
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1].replace(/"/g, ''));

  const filenameMatch = disposition.match(/filename="?([^"]+)"?/i);
  return filenameMatch?.[1]?.trim() || '';
}

export function toAbsoluteAssetUrl(pathOrUrl?: string | null) {
  if (!pathOrUrl) return '';
  if (/^(https?:)?\/\//i.test(pathOrUrl) || pathOrUrl.startsWith('data:')) return pathOrUrl;
  return new URL(pathOrUrl, window.location.origin).toString();
}

export async function downloadResponseFile(response: Response, fallbackFilename: string) {
  const blob = await response.blob();
  const filename = getFilenameFromDisposition(response.headers.get('Content-Disposition')) || fallbackFilename;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function printHtmlDocument(html: string) {
  const printWindow = window.open('', '_blank', 'width=1100,height=800');
  if (!printWindow) return false;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  window.setTimeout(() => printWindow.print(), 250);
  return true;
}

export function exportHtmlDocument(html: string, filenameBase: string, format: DocumentExportFormat) {
  const safeFilename = filenameBase
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'export';

  if (format === 'excel') {
    downloadBlob(`\ufeff${html}`, 'application/vnd.ms-excel;charset=utf-8;', `${safeFilename}.xls`);
    return;
  }

  if (format === 'word') {
    downloadBlob(`\ufeff${html}`, 'application/msword;charset=utf-8;', `${safeFilename}.doc`);
    return;
  }

  if (!printHtmlDocument(html)) {
    downloadBlob(`\ufeff${html}`, 'text/html;charset=utf-8;', `${safeFilename}.html`);
  }
}
