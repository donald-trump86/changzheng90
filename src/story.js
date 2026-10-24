// ESM adapter; all factual literals and deep freezing live in history-data.js.
import './history-data.js';

export const { sources, chapters, eras, timeline, epilogue } = globalThis.ChishuiHistory;
