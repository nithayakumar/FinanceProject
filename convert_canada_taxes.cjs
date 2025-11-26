const fs = require('fs');

// Read the source CSV
const sourceData = fs.readFileSync('/Users/nish/Downloads/Untitled spreadsheet - canada.csv', 'utf-8');
const lines = sourceData.trim().split('\n');

// Parse currency string to number
const parseCurrency = (str) => {
  if (!str) return 0;
  // Remove $, commas, and spaces
  return parseFloat(str.replace(/[$,\s]/g, ''));
};

// Parse a bracket description line
const parseBracketLine = (description) => {
  // Extract percentage
  const rateMatch = description.match(/([\d.]+)%/);
  if (!rateMatch) return null;
  const rate = parseFloat(rateMatch[1]) / 100;

  // Check for different patterns:
  // Pattern 1: "X% on the first $Y of taxable income" or "X% on taxable income that is $Y or less"
  // Pattern 2: "X% on taxable income over $Y up to $Z"
  // Pattern 3: "X% on taxable income over $Y"
  // Pattern 4: "X% on on taxable income over $Y up to $Z" (typo with double "on")

  let min = 0;
  let max = null;

  // Pattern 1: First bracket (starts at 0)
  const firstMatch = description.match(/(?:first|that is)\s+\$?([\d,]+)/);
  if (firstMatch && !description.includes('over')) {
    min = 0;
    max = parseCurrency(firstMatch[1]);
    return { rate, min, max };
  }

  // Pattern 2 & 4: Middle brackets with "over X up to Y" or "over X but not more than Y" or "more than X but not more than Y"
  const rangeMatch = description.match(/(?:over|more than)\s+\$?([\d,]+)\s+(?:up to|but not more than)\s+\$?([\d,]+)/);
  if (rangeMatch) {
    min = parseCurrency(rangeMatch[1]);
    max = parseCurrency(rangeMatch[2]);
    return { rate, min, max };
  }

  // Pattern 3: Top bracket with "over X" or "more than X" (no upper limit)
  const overMatch = description.match(/(?:over|more than)\s+\$?([\d,]+)/);
  if (overMatch) {
    min = parseCurrency(overMatch[1]);
    max = null; // No upper limit
    return { rate, min, max };
  }

  console.warn(`Could not parse: ${description}`);
  return null;
};

// Parse the source data
const provinceTaxData = {};
for (let i = 0; i < lines.length; i++) {
  const parts = lines[i].split(',');
  const province = parts[0].trim().replace(/"/g, '');
  const description = parts.slice(1).join(',').trim().replace(/"/g, '');

  if (!province || !description) continue;

  if (!provinceTaxData[province]) {
    provinceTaxData[province] = [];
  }

  const bracket = parseBracketLine(description);
  if (bracket) {
    provinceTaxData[province].push(bracket);
  }
}

// Sort brackets by min value and infer max values
for (const province in provinceTaxData) {
  const brackets = provinceTaxData[province].sort((a, b) => a.min - b.min);

  // Infer max values from next bracket's min
  for (let i = 0; i < brackets.length; i++) {
    if (brackets[i].max === null) {
      if (i < brackets.length - 1) {
        brackets[i].max = brackets[i + 1].min;
      } else {
        brackets[i].max = 99999999; // Top bracket
      }
    }
  }
}

// Generate CSV rows for a province
const generateRows = (province, brackets) => {
  const rows = [];
  const filingStatus = 'Single'; // Canada only has Single filing status

  for (let i = 0; i < brackets.length; i++) {
    const step = i + 1;
    const bracket = brackets[i];
    const min = bracket.min;
    const max = bracket.max;
    const rate = bracket.rate;

    // Bot_Range row
    const botId = `State_Province_${province}_Income_${filingStatus}_Bot_Range_Ladder Step${step}`;
    rows.push([
      botId,
      'State_Province',
      province,
      'Canada',
      'Income',
      'Income',
      filingStatus,
      'Bot_Range',
      min,
      step,
      rate.toFixed(4)
    ].join(','));

    // Top_Range row
    const topId = `State_Province_${province}_Income_${filingStatus}_Top_Range_Ladder Step${step}`;
    rows.push([
      topId,
      'State_Province',
      province,
      'Canada',
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

// Generate all new province rows
const newProvinceRows = [];
const provinceNames = Object.keys(provinceTaxData).sort();

console.log(`Processing ${provinceNames.length} Canadian provinces/territories...`);

for (const province of provinceNames) {
  console.log(`  - ${province}: ${provinceTaxData[province].length} brackets`);

  // Debug first bracket for verification
  if (province === 'British Columbia') {
    console.log(`    First bracket: $${provinceTaxData[province][0].min} - $${provinceTaxData[province][0].max} at ${(provinceTaxData[province][0].rate * 100).toFixed(2)}%`);
    console.log(`    Second bracket: $${provinceTaxData[province][1].min} - $${provinceTaxData[province][1].max} at ${(provinceTaxData[province][1].rate * 100).toFixed(2)}%`);
  }

  // Generate Single filer rows (only filing status for Canada)
  newProvinceRows.push(...generateRows(province, provinceTaxData[province]));
}

// Read existing tax ladders
const existingData = fs.readFileSync('/Users/nish/FinanceProject/src/data/taxLadders.csv', 'utf-8');
const existingLines = existingData.split('\n');

// Keep header
const header = existingLines[0];

// Filter out existing Canadian province data
const provincesToReplace = new Set(provinceNames);
const filteredLines = existingLines.slice(1).filter(line => {
  if (!line.trim()) return false;
  const parts = line.split(',');
  const region = parts[1];
  const state = parts[2];
  const country = parts[3];

  // Keep if not a Canadian province we're replacing
  return !(region === 'State_Province' && country === 'Canada' && provincesToReplace.has(state));
});

// Combine: header + filtered data + new province data
const finalLines = [header, ...filteredLines, ...newProvinceRows];

// Write the new CSV
fs.writeFileSync('/Users/nish/FinanceProject/src/data/taxLadders.csv', finalLines.join('\n') + '\n');

console.log(`\n✅ Success! Updated taxLadders.csv with ${newProvinceRows.length} new rows for ${provinceNames.length} Canadian provinces`);
console.log(`Provinces added: ${provinceNames.join(', ')}`);
