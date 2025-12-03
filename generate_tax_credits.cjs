const fs = require('fs');

// Get all states from existing standardDeductions.csv
const standardDeductionsCSV = fs.readFileSync('/Users/nish/FinanceProject/src/data/standardDeductions.csv', 'utf-8');
const lines = standardDeductionsCSV.trim().split('\n').slice(1); // Skip header

// Extract unique jurisdictions
const jurisdictions = new Map();

lines.forEach(line => {
  const parts = line.split(',');
  const region = parts[0];
  const jurisdiction = parts[1];
  const country = parts[2];
  const filingStatus = parts[3];

  const key = `${region}_${jurisdiction}_${country}`;
  if (!jurisdictions.has(key)) {
    jurisdictions.set(key, { region, jurisdiction, country });
  }
});

console.log(`Found ${jurisdictions.size} unique jurisdictions`);

// Canadian province-specific tax credits
const canadianProvincialCredits = {
  'Alberta': 22323,
  'British Columbia': 12932,
  'Manitoba': 15780,
  'New Brunswick': 13396,
  'Newfoundland and Labrador': 11067,
  'Nova Scotia': 11744,
  'Ontario': 12747,
  'Prince Edward Island': 14650,
  'Québec': 18571,
  'Saskatchewan': 19491,
  'Yukon': 16129,
  'Northwest Territories': 17842,
  'Nunavut': 19274
};

// Federal Canada tax credit
const federalCanadaCredit = 15705;

// Build the tax credits CSV
const csvRows = ['Region,Jurisdiction,Country,Filing_Status,Tax_Credit_Amount,Credit_Type'];

// For each jurisdiction, add credits
jurisdictions.forEach(({ region, jurisdiction, country }) => {
  let creditAmount = 0;
  const creditType = region === 'Federal' ? 'federal' : 'state';

  if (country === 'Canada') {
    if (region === 'Federal') {
      creditAmount = federalCanadaCredit;
    } else {
      // Provincial credit
      creditAmount = canadianProvincialCredits[jurisdiction] || 0;
      if (creditAmount === 0) {
        console.log(`Warning: No credit found for ${jurisdiction}`);
      }
    }
  } else {
    // USA - $0 credit
    creditAmount = 0;
  }

  // Add for both Single and Married
  csvRows.push(`${region},${jurisdiction},${country},Single,${creditAmount},${creditType}`);
  csvRows.push(`${region},${jurisdiction},${country},Married,${creditAmount},${creditType}`);
});

const finalCSV = csvRows.join('\n');

// Write to file
fs.writeFileSync('/Users/nish/FinanceProject/src/data/taxCredits.csv', finalCSV);

console.log(`\n✅ Generated taxCredits.csv`);
console.log(`   Total entries: ${csvRows.length - 1}`);
console.log(`   USA entries (federal + states): ${[...jurisdictions.values()].filter(j => j.country === 'USA').length * 2}`);
console.log(`   Canada entries (federal + provinces): ${[...jurisdictions.values()].filter(j => j.country === 'Canada').length * 2}`);

// Show sample values
console.log(`\n📊 Sample Values:`);
console.log(`   Federal USA: $0`);
console.log(`   Federal Canada: $${federalCanadaCredit.toLocaleString()}`);
console.log(`   California (state): $0`);
console.log(`   Ontario (provincial): $${canadianProvincialCredits['Ontario'].toLocaleString()}`);
console.log(`   British Columbia (provincial): $${canadianProvincialCredits['British Columbia'].toLocaleString()}`);
