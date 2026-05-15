import ExcelJS from "exceljs";

export const MAX_EXPORT_ROWS = 10_000;

export const csvSafe = (val) => {
  const str = String(val ?? "");
  return /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
};

export const buildWorkbookBuffer = async (sheetName, rows) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);

  if (rows.length > 0) {
    const headers = Object.keys(rows[0]);
    sheet.addRow(headers);
    rows.forEach((row) => sheet.addRow(headers.map((h) => row[h])));
  }

  return workbook.xlsx.writeBuffer();
};

export const buildMultiSheetWorkbookBuffer = async (sheetsData) => {
  const workbook = new ExcelJS.Workbook();

  sheetsData.forEach(({ name, rows }) => {
    const sheet = workbook.addWorksheet(name);
    if (rows.length > 0) {
      const headers = Object.keys(rows[0]);
      sheet.addRow(headers);
      rows.forEach((row) => sheet.addRow(headers.map((h) => row[h])));
    }
  });

  return workbook.xlsx.writeBuffer();
};
