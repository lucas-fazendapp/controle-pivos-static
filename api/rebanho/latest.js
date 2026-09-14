const { readSheetValues } = require('../_lib/googleSheetsReadonly');

const HERD_SPREADSHEET_ID = '1f8NtubYs6QzEfkj2zZ7hP8Au1f-uiWIMMPZx-2dWa9U';
const HERD_SHEET_NAME = 'Controle';
const HERD_RANGE = 'A18:N38';

module.exports = async function latestRebanho(request, response) {
  try {
    const values = await readSheetValues({
      spreadsheetId: HERD_SPREADSHEET_ID,
      sheetName: HERD_SHEET_NAME,
      range: HERD_RANGE,
    });

    response.setHeader('Cache-Control', 'no-store');
    response.status(200).json({
      status: 'ok',
      spreadsheetId: HERD_SPREADSHEET_ID,
      sheetName: HERD_SHEET_NAME,
      range: `${HERD_SHEET_NAME}!${HERD_RANGE}`,
      updatedAt: new Date().toISOString(),
      values,
    });
  } catch (error) {
    response.status(500).json({
      status: 'error',
      error: error.message,
    });
  }
};
