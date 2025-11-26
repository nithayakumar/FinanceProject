const fs = require('fs');

// Simple CSV parser that handles quoted fields
const parseCSVLine = (line) => {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
};

// Read the source CSV
const sourceData = fs.readFileSync('/Users/nish/Downloads/Untitled spreadsheet - Sheet4.csv', 'utf-8');
const lines = sourceData.trim().split('\n');

// Fix state name typos
const fixStateName = (name) => {
  if (name === 'Arkanasas') return 'Arkansas';
  if (name === 'Oregan') return 'Oregon';
  return name;
};

// Parse currency string to number
const parseCurrency = (str) => {
  if (!str || str.trim() === '' || str.trim() === '$0') return 0;
  return parseFloat(str.replace(/[$,\s]/g, ''));
};

// Parse the source data
const stateTaxData = {};
for (let i = 2; i < lines.length; i++) {
  const parts = parseCSVLine(lines[i]);
  const state = fixStateName(parts[0]);

  if (!state) continue;

  if (!stateTaxData[state]) {
    stateTaxData[state] = {
      single: [],
      married: []
    };
  }

  // Single filer data
  const singleRate = parseFloat(parts[1].replace('%', '')) / 100;
  const singleBracket = parseCurrency(parts[3]);

  // Married filer data
  const marriedRate = parseFloat(parts[4].replace('%', '')) / 100;
  const marriedBracket = parseCurrency(parts[6]);

  stateTaxData[state].single.push({ rate: singleRate, min: singleBracket });
  stateTaxData[state].married.push({ rate: marriedRate, min: marriedBracket });
}

// Generate CSV rows for a state/filing status combination
const generateRows = (state, filingStatus, brackets) => {
  const rows = [];

  for (let i = 0; i < brackets.length; i++) {
    const step = i + 1;
    const bracket = brackets[i];
    const min = bracket.min;
    const max = i < brackets.length - 1 ? brackets[i + 1].min : 99999999;
    const rate = bracket.rate;

    // Bot_Range row
    const botId = `State_Province_${state}_Income_${filingStatus}_Bot_Range_Ladder Step${step}`;
    rows.push([
      botId,
      'State_Province',
      state,
      'USA',
      'Income',
      'Income',
      filingStatus,
      'Bot_Range',
      min,
      step,
      rate.toFixed(4)
    ].join(','));

    // Top_Range row
    const topId = `State_Province_${state}_Income_${filingStatus}_Top_Range_Ladder Step${step}`;
    rows.push([
      topId,
      'State_Province',
      state,
      'USA',
      'Income',
      'Income',
      filingStatus,
      'Top_Range',
      max,
      step,
      rate.toFixed(4)
    ].join(','));
  }

  return rows;
};

// Generate all new state rows
const newStateRows = [];
const stateNames = Object.keys(stateTaxData).sort();

console.log(`Processing ${stateNames.length} states...`);

for (const state of stateNames) {
  console.log(`  - ${state}: ${stateTaxData[state].single.length} brackets`);

  // Debug first bracket
  if (state === 'California') {
    console.log(`    First Single bracket: $${stateTaxData[state].single[0].min} at ${stateTaxData[state].single[0].rate * 100}%`);
    console.log(`    Second Single bracket: $${stateTaxData[state].single[1].min} at ${stateTaxData[state].single[1].rate * 100}%`);
  }

  // Generate Single filer rows
  newStateRows.push(...generateRows(state, 'Single', stateTaxData[state].single));

  // Generate Married filer rows
  newStateRows.push(...generateRows(state, 'Married', stateTaxData[state].married));
}

// Read existing tax ladders
const existingData = fs.readFileSync('/Users/nish/FinanceProject/src/data/taxLadders.csv', 'utf-8');
const existingLines = existingData.split('\n');

// Keep header
const header = existingLines[0];

// Filter out existing state data for the 27 states we're replacing
const statesToReplace = new Set(stateNames);
const filteredLines = existingLines.slice(1).filter(line => {
  if (!line.trim()) return false;
  const parts = line.split(',');
  const region = parts[1];
  const state = parts[2];

  // Keep if not a state province, or if it's a state we're not replacing
  return region !== 'State_Province' || !statesToReplace.has(state);
});

// Combine: header + filtered federal/other data + new state data
const finalLines = [header, ...filteredLines, ...newStateRows];

// Write the new CSV
fs.writeFileSync('/Users/nish/FinanceProject/src/data/taxLadders.csv', finalLines.join('\n') + '\n');

console.log(`\n✅ Success! Updated taxLadders.csv with ${newStateRows.length} new rows for ${stateNames.length} states`);
console.log(`States added: ${stateNames.join(', ')}`);
