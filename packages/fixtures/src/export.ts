/** Spreadsheet-safe cell: quotes doubled, and a leading = + - @ neutralised so a cell never runs as a formula. */
const cell = (value: string | number) => {
  const text = String(value);
  return `"${(/^[=+\-@]/.test(text) ? `'${text}` : text).replace(/"/g, '""')}"`;
};
export const toCsv = (header: string[], rows: (string | number)[][]) => [header, ...rows].map((r) => r.map(cell).join(',')).join('\n');

const escapeHtml = (value: string | number) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** An HTML table that Excel opens as a worksheet. */
export const toExcelHtml = (title: string, header: string[], rows: (string | number)[][]) =>
  `<html><head><meta charset="utf-8"></head><body><h3>${escapeHtml(title)}</h3><table border="1"><tr>${header.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr>${rows.map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
