#!/usr/bin/env node
/**
 * Generate Static Returns Data
 *
 * Fetches pre-computed monthly returns for all curated ETFs from the
 * deployed Nami API and writes them to a static JS file.
 *
 * This makes the entire curated universe load instantly — zero network
 * calls needed for historical data.
 *
 * Usage:
 *   node scripts/generate-static-returns.js
 *   node scripts/generate-static-returns.js https://custom-domain.vercel.app
 */

const API_BASE = process.argv[2] || 'https://nami-peach.vercel.app';

// All curated ETFs from etfUniverse.js
const ALL_TICKERS = [
  'SPY', 'VOO', 'VTI', 'IVV',           // US Broad
  'QQQ', 'IWM', 'IJH', 'IJR',           // US Size
  'VTV', 'VUG', 'MTUM', 'USMV',         // US Style
  'XLK', 'XLF', 'XLV', 'XLE', 'XLU', 'XLI', // US Sectors
  'VEA', 'VWO', 'IEFA', 'EEM', 'VXUS', 'EFA', // International
  'SHY', 'IEF', 'TLT', 'TIP', 'GOVT', 'VGSH', // Gov Bonds
  'LQD', 'HYG', 'VCIT', 'VCSH',         // Corporate Bonds
  'AGG', 'BND', 'BNDX',                  // Broad Bonds
  'VNQ', 'VNQI', 'IYR',                  // Real Estate
  'GLD', 'IAU', 'SLV', 'DBC', 'GSG',    // Commodities
];

const BATCH_SIZE = 15; // Stay well within Vercel's 10s timeout
const OUTPUT_FILE = new URL('../src/data/generatedStaticReturns.js', import.meta.url);

async function fetchBatch(tickers) {
  const url = `${API_BASE}/api/returns?tickers=${tickers.join(',')}`;
  console.log(`  Fetching: ${tickers.join(', ')}`);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  console.log(`  Got ${data.meta.resolved}/${data.meta.requested} tickers (${data.meta.fromCache} cached, ${data.meta.computed} computed)`);
  return data.returns;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log(`\nGenerating static returns data from ${API_BASE}\n`);
  console.log(`Total tickers: ${ALL_TICKERS.length}`);
  console.log(`Batch size: ${BATCH_SIZE}\n`);

  const allReturns = {};
  const failed = [];

  // Fetch in batches
  for (let i = 0; i < ALL_TICKERS.length; i += BATCH_SIZE) {
    const batch = ALL_TICKERS.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(ALL_TICKERS.length / BATCH_SIZE);

    console.log(`Batch ${batchNum}/${totalBatches}:`);

    try {
      const returns = await fetchBatch(batch);

      for (const ticker of batch) {
        if (returns[ticker]?.returns?.length > 0) {
          allReturns[ticker] = {
            returns: returns[ticker].returns,
            dates: returns[ticker].dates,
          };
        } else {
          console.warn(`  Warning: No data for ${ticker}`);
          failed.push(ticker);
        }
      }
    } catch (err) {
      console.error(`  Batch failed: ${err.message}`);
      failed.push(...batch);
    }

    // Brief pause between batches to be polite
    if (i + BATCH_SIZE < ALL_TICKERS.length) {
      await sleep(1000);
    }
  }

  console.log(`\nResults: ${Object.keys(allReturns).length} tickers fetched, ${failed.length} failed`);
  if (failed.length > 0) {
    console.log(`Failed: ${failed.join(', ')}`);
  }

  // Generate the JS file
  const tickers = Object.keys(allReturns).sort();
  const tickerList = tickers.map(t => `'${t}'`).join(', ');

  // Find the common date range for summary
  const sampleDates = allReturns[tickers[0]]?.dates || [];
  const firstDate = sampleDates[0] || 'unknown';
  const lastDate = sampleDates[sampleDates.length - 1] || 'unknown';

  let js = `/**
 * Generated Static Returns Data
 *
 * Pre-computed monthly returns for ${tickers.length} curated ETFs.
 * Generated on ${new Date().toISOString().split('T')[0]} from EODHD data via /api/returns.
 *
 * To regenerate: node scripts/generate-static-returns.js
 *
 * Coverage: ${firstDate} to ${lastDate}
 * Tickers: ${tickers.length}
 */

// All tickers with static data available
export const STATIC_TICKERS = [${tickerList}];

// Pre-computed monthly returns keyed by ticker
export const STATIC_RETURNS_DATA = {\n`;

  for (const ticker of tickers) {
    const { returns, dates } = allReturns[ticker];

    // Format returns as compact numbers (6 decimal places)
    const returnsStr = returns.map(r => Number(r.toFixed(8))).join(',');
    const datesStr = dates.map(d => `'${d}'`).join(',');

    js += `  '${ticker}': {\n`;
    js += `    returns: [${returnsStr}],\n`;
    js += `    dates: [${datesStr}],\n`;
    js += `  },\n`;
  }

  js += `};\n\n`;
  js += `/**\n * Check if a ticker has static returns data\n */\n`;
  js += `export function hasStaticReturns(ticker) {\n`;
  js += `  return ticker in STATIC_RETURNS_DATA;\n`;
  js += `}\n\n`;
  js += `/**\n * Get static returns for a ticker\n * @returns {{ returns: number[], dates: string[] } | null}\n */\n`;
  js += `export function getStaticReturns(ticker) {\n`;
  js += `  const data = STATIC_RETURNS_DATA[ticker];\n`;
  js += `  if (!data) return null;\n`;
  js += `  return { returns: [...data.returns], dates: [...data.dates] };\n`;
  js += `}\n`;

  // Write the file
  const { writeFileSync } = await import('fs');
  const { fileURLToPath } = await import('url');
  const outputPath = fileURLToPath(OUTPUT_FILE);

  writeFileSync(outputPath, js, 'utf-8');

  const fileSizeKB = (Buffer.byteLength(js, 'utf-8') / 1024).toFixed(1);
  console.log(`\nWritten to: ${outputPath}`);
  console.log(`File size: ${fileSizeKB} KB`);
  console.log(`Tickers: ${tickers.length}`);
  console.log(`Date range: ${firstDate} to ${lastDate}`);
  console.log(`\nDone!\n`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
