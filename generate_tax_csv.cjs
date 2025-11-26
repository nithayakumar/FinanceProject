const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, 'src/data/taxLadders.csv');
const rawData = fs.readFileSync(csvPath, 'utf8');

// Parse CSV
const lines = rawData.trim().split('\n');
const header = lines[0];
const rows = lines.slice(1).map(line => {
    const values = line.split(',');
    const row = {};
    header.split(',').forEach((h, i) => row[h.trim()] = values[i]);
    return row;
});

// Configuration
const zeroTaxStates = [
    "Alaska", "Florida", "Nevada", "New Hampshire", "South Dakota",
    "Tennessee", "Wyoming", "Texas", "Washington"
];

const flatTaxStates = {
    "Arizona": 0.025,
    "Georgia": 0.0539,
    "Illinois": 0.0495,
    "Indiana": 0.03,
    "Iowa": 0.038,
    "Louisiana": 0.03,
    "Kentucky": 0.04,
    "North Carolina": 0.0425,
    "Utah": 0.0455,
    "Pennsylvania": 0.0307
};

// Filter out existing Income tax rows for these states to avoid duplicates
const statesToUpdate = [...zeroTaxStates, ...Object.keys(flatTaxStates)];

const keptRows = rows.filter(row => {
    // Keep if not in our update list
    if (!statesToUpdate.includes(row.State)) return true;
    // Keep if not Income tax (e.g. keep CapitalGains)
    if (row.TaxType !== 'Income') return true;
    return false;
});

// Generate new rows
const newRows = [];

function addStateRows(state, rate) {
    // For flat/zero tax, we use "All" filing status and a single bracket
    // Range 0 to Infinity (represented as 99999999)

    // Bot Range
    const botId = `State_Province_${state}_Income_All_Bot_Range_Ladder Step1`;
    newRows.push({
        ID: botId,
        Region: 'State_Province',
        State: state,
        'Parent Region': 'USA',
        TaxType: 'Income',
        TaxedIncome: 'Income',
        'Filing Status': 'All',
        Range: 'Bot_Range',
        RangeValue: '0',
        'Ladder Step': '1',
        Rate: rate.toFixed(4)
    });

    // Top Range
    const topId = `State_Province_${state}_Income_All_Top_Range_Ladder Step1`;
    newRows.push({
        ID: topId,
        Region: 'State_Province',
        State: state,
        'Parent Region': 'USA',
        TaxType: 'Income',
        TaxedIncome: 'Income',
        'Filing Status': 'All',
        Range: 'Top_Range',
        RangeValue: '99999999',
        'Ladder Step': '1',
        Rate: rate.toFixed(4)
    });
}

// Add Zero Tax States
zeroTaxStates.forEach(state => {
    addStateRows(state, 0.0000);
});

// Add Flat Tax States
Object.entries(flatTaxStates).forEach(([state, rate]) => {
    addStateRows(state, rate);
});

// Combine and Write
const finalRows = [...keptRows, ...newRows];

// Sort for consistency (optional but nice)
// Sort by Region, then State, then TaxType
finalRows.sort((a, b) => {
    if (a.Region !== b.Region) return a.Region.localeCompare(b.Region);
    if (a.State !== b.State) return a.State.localeCompare(b.State);
    if (a.TaxType !== b.TaxType) return a.TaxType.localeCompare(b.TaxType);
    return 0;
});

const csvContent = [
    header,
    ...finalRows.map(row => header.split(',').map(h => row[h.trim()]).join(','))
].join('\n');

fs.writeFileSync(csvPath, csvContent);
console.log(`Updated ${csvPath} with ${finalRows.length} rows.`);
console.log(`Added/Updated ${statesToUpdate.length} states.`);
