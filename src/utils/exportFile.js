import * as XLSX from 'xlsx';

// Export an array of plain objects to Excel (.xlsx)
export function exportToExcel(rows, fileName = 'report.xlsx', sheetName = 'Report') {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, fileName);
}

// PDF export uses the browser's print dialog ("Save as PDF").
// Elements with class "no-print" are hidden by the print stylesheet.
export function exportToPdf() {
  window.print();
}

// Read an uploaded Excel/CSV file into an array of row objects
export function readSpreadsheet(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        resolve(XLSX.utils.sheet_to_json(ws, { defval: '' }));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
