const fs = require('fs');

// Parse CSV properly handling quoted values with commas
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

// Parse the actual standard deductions CSV
const csv = fs.readFileSync('/Users/nish/Downloads/Standard Deductions_Personal Exemptions - Sheet2.csv', 'utf-8');
const lines = csv.trim().split('\n');

// Skip first two header lines
const dataLines = lines.slice(2);

const stateDeductions = [];
const issues = [];

dataLines.forEach((line, idx) => {
  const parts = parseCSVLine(line);
  if (parts.length < 3) return;

  const state = parts[0].trim();
  const singleRaw = parts[1].trim();
  const coupleRaw = parts[2].trim();

  // Clean up values - remove quotes, dollar signs, commas, spaces
  const cleanValue = (val) => {
    if (!val) return null;

    // Remove quotes first
    val = val.replace(/['"]/g, '').trim();

    // Check for n.a.
    if (val.toLowerCase() === 'n.a.' || val.toLowerCase() === 'n.a') {
      return 0; // No state tax = $0 deduction
    }

    // Check for "credit" (Utah case)
    if (val.toLowerCase().includes('credit')) {
      issues.push(`${state}: Has credit instead of deduction - ${val}`);
      // Extract the number from credit
      const match = val.match(/[\d,]+/);
      if (match) {
        return parseInt(match[0].replace(/,/g, ''));
      }
      return 0;
    }

    // Extract all digits and commas, then parse
    const match = val.match(/[\d,]+/);
    if (!match) {
      issues.push(`${state}: Could not parse value - ${val}`);
      return null;
    }

    // Remove commas and parse
    const num = parseInt(match[0].replace(/,/g, ''));

    if (isNaN(num)) {
      issues.push(`${state}: Could not parse value - ${val}`);
      return null;
    }

    return num;
  };

  const singleValue = cleanValue(singleRaw);
  const coupleValue = cleanValue(coupleRaw);

  if (singleValue !== null && coupleValue !== null) {
    stateDeductions.push({
      state,
      single: singleValue,
      married: coupleValue
    });
  }
});

console.log(`\n✅ Parsed ${stateDeductions.length} states`);

if (issues.length > 0) {
  console.log(`\n⚠️  Issues found:`);
  issues.forEach(issue => console.log(`  - ${issue}`));
}

// Add Federal USA standard deductions
const federalUSA = {
  single: 15750,
  married: 31500
};

// Add Canada federal - set to 0 per user request
const federalCanada = {
  single: 0,
  married: 0
};

// Build the final CSV
const csvRows = ['Region,Jurisdiction,Country,Filing_Status,Deduction_Amount'];

// Add Federal USA
csvRows.push(`Federal,USA,USA,Single,${federalUSA.single}`);
csvRows.push(`Federal,USA,USA,Married,${federalUSA.married}`);

// Add Federal Canada
csvRows.push(`Federal,Canada,Canada,Single,${federalCanada.single}`);
csvRows.push(`Federal,Canada,Canada,Married,${federalCanada.married}`);

// Add US States
stateDeductions.forEach(({ state, single, married }) => {
  csvRows.push(`State_Province,${state},USA,Single,${single}`);
  csvRows.push(`State_Province,${state},USA,Married,${married}`);
});

// Add Canadian provinces (using federal amounts as placeholder)
const canadianProvinces = [
  'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick',
  'Newfoundland and Labrador', 'Northwest Territories', 'Nova Scotia',
  'Nunavut', 'Ontario', 'Prince Edward Island', 'Québec',
  'Saskatchewan', 'Yukon'
];

canadianProvinces.forEach(province => {
  // Set to 0 per user request
  csvRows.push(`State_Province,${province},Canada,Single,${federalCanada.single}`);
  csvRows.push(`State_Province,${province},Canada,Married,${federalCanada.married}`);
});

const finalCSV = csvRows.join('\n');

// Write to file
fs.writeFileSync('/Users/nish/FinanceProject/src/data/standardDeductions.csv', finalCSV);

console.log(`\n✅ Generated standardDeductions.csv`);
console.log(`   Total entries: ${csvRows.length - 1}`);
console.log(`   Federal: 4 (USA + Canada)`);
console.log(`   US States: ${stateDeductions.length * 2}`);
console.log(`   Canadian Provinces: ${canadianProvinces.length * 2}`);

// Show some sample values
console.log(`\n📊 Sample Values:`);
console.log(`   Federal USA - Single: $${federalUSA.single.toLocaleString()}, Married: $${federalUSA.married.toLocaleString()}`);
console.log(`   Federal Canada - Single: $${federalCanada.single.toLocaleString()}, Married: $${federalCanada.married.toLocaleString()}`);

const california = stateDeductions.find(s => s.state === 'California');
if (california) {
  console.log(`   California - Single: $${california.single.toLocaleString()}, Married: $${california.married.toLocaleString()}`);
}

const ny = stateDeductions.find(s => s.state === 'New York');
if (ny) {
  console.log(`   New York - Single: $${ny.single.toLocaleString()}, Married: $${ny.married.toLocaleString()}`);
}

const florida = stateDeductions.find(s => s.state === 'Florida');
if (florida) {
  console.log(`   Florida - Single: $${florida.single.toLocaleString()}, Married: $${florida.married.toLocaleString()}`);
}
