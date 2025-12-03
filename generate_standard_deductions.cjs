const fs = require('fs');

// Get all US states and Canadian provinces from taxLadders.csv
const taxLadders = fs.readFileSync('/Users/nish/FinanceProject/src/data/taxLadders.csv', 'utf-8');
const lines = taxLadders.trim().split('\n').slice(1); // Skip header

const states = new Set();
const provinces = new Set();

lines.forEach(line => {
  const parts = line.split(',');
  const region = parts[1];
  const jurisdiction = parts[2];
  const country = parts[3];

  if (region === 'State_Province') {
    if (country === 'USA') {
      states.add(jurisdiction);
    } else if (country === 'Canada') {
      provinces.add(jurisdiction);
    }
  }
});

const usStates = Array.from(states).sort();
const canadianProvinces = Array.from(provinces).sort();

console.log(`Found ${usStates.length} US states`);
console.log(`Found ${canadianProvinces.length} Canadian provinces`);

// Generate CSV
const rows = ['Region,Jurisdiction,Country,Filing_Status,Deduction_Amount'];

// Federal USA deductions
rows.push('Federal,USA,USA,Single,100000');
rows.push('Federal,USA,USA,Married,200000');

// Federal Canada deductions
rows.push('Federal,Canada,Canada,Single,100000');
rows.push('Federal,Canada,Canada,Married,200000');

// US State deductions
usStates.forEach(state => {
  rows.push(`State_Province,${state},USA,Single,100000`);
  rows.push(`State_Province,${state},USA,Married,200000`);
});

// Canadian Province deductions
canadianProvinces.forEach(province => {
  rows.push(`State_Province,${province},Canada,Single,100000`);
  rows.push(`State_Province,${province},Canada,Married,200000`);
});

const csv = rows.join('\n');
fs.writeFileSync('/Users/nish/FinanceProject/src/data/standardDeductions.csv', csv);

console.log(`✅ Generated standardDeductions.csv with ${rows.length - 1} entries`);
console.log(`   Federal: 4 entries (USA + Canada × 2 filing statuses)`);
console.log(`   US States: ${usStates.length * 2} entries`);
console.log(`   Canadian Provinces: ${canadianProvinces.length * 2} entries`);
