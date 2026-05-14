import ExcelJS from "exceljs";
import { Parser } from "json2csv";

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

export const buildCsvBuffer = (rows) => {
  const parser = new Parser();
  return Buffer.from(parser.parse(rows));
};

export const pipelineCursorToCsv = async (cursor, transformer) => {
  const parser = new Parser();
  let csv = "";
  let first = true;

  for await (const doc of cursor) {
    const row = transformer(doc);
    if (first) {
      csv += parser.parse([row]);
      first = false;
    } else {
      const rowCsv = parser.parse([row]).split("\n")[1]; // Skip header
      if (rowCsv) csv += "\n" + rowCsv;
    }
  }
  return Buffer.from(csv);
};
