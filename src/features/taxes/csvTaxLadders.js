/**
 * CSV Tax Ladders Parser and Data Service
 * Parses the tax ladder CSV and provides indexed access to tax brackets
 */

import taxLaddersCSV from '../../data/taxLadders.csv?raw';

// Parsed and indexed tax ladder data
let parsedData = null;

/**
 * Parse CSV string into array of objects
 */
function parseCSV(csvString) {
  const lines = csvString.trim().split('\n');
  const headers = lines[0].split(',');

  return lines.slice(1).map(line => {
    const values = line.split(',');
    const row = {};
    headers.forEach((header, index) => {
      row[header.trim()] = values[index]?.trim() || '';
    });
    return row;
  });
}

/**
 * Build indexed tax ladder structure from CSV rows
 */
function buildTaxLadderIndex(rows) {
  const ladders = {};
  const metadata = {
    states: new Set(),
    countries: new Set(),
    filingStatuses: new Set(),
    taxTypes: new Set(),
    statesByCountry: {}
  };

  // Group rows by ladder key (Region_State_TaxType_FilingStatus)
  const grouped = {};

  rows.forEach(row => {
    const region = row.Region;
    const state = row.State;
    const parentRegion = row['Parent Region'];
    const taxType = row.TaxType;
    const filingStatus = row['Filing Status'];
    const range = row.Range;
    const rangeValue = parseFloat(row.RangeValue);
    const step = parseInt(row['Ladder Step']);
    const rate = parseFloat(row.Rate);
    const taxedIncome = row.TaxedIncome;

    // Build metadata
    if (region === 'State_Province') {
      metadata.states.add(state);
      if (!metadata.statesByCountry[parentRegion]) {
        metadata.statesByCountry[parentRegion] = new Set();
      }
      metadata.statesByCountry[parentRegion].add(state);
    }
    metadata.countries.add(parentRegion);
    metadata.filingStatuses.add(filingStatus);
    metadata.taxTypes.add(taxType);

    // Create ladder key
    const ladderKey = `${region}_${state}_${taxType}_${filingStatus}`;

    if (!grouped[ladderKey]) {
      grouped[ladderKey] = {
        region,
        state,
        parentRegion,
        taxType,
        filingStatus,
        taxedIncome,
        steps: {}
      };
    }

    // Store range value by step
    if (!grouped[ladderKey].steps[step]) {
      grouped[ladderKey].steps[step] = { step, rate };
    }

    if (range === 'Bot_Range') {
      grouped[ladderKey].steps[step].min = rangeValue;
    } else if (range === 'Top_Range') {
      grouped[ladderKey].steps[step].max = rangeValue;
    }
  });

  // Convert grouped data to final ladder format
  Object.entries(grouped).forEach(([key, data]) => {
    const brackets = Object.values(data.steps)
      .sort((a, b) => a.step - b.step)
      .map(step => ({
        min: step.min,
        max: step.max,
        rate: step.rate,
        step: step.step
      }));

    // For ladders that only have Bot_Range (federal income), infer max from next step's min
    brackets.forEach((bracket, index) => {
      if (bracket.max === undefined) {
        if (index < brackets.length - 1) {
          bracket.max = brackets[index + 1].min;
        } else {
          bracket.max = 99999999;
        }
      }
      if (bracket.min === undefined) {
        bracket.min = 0;
      }
    });

    ladders[key] = {
      region: data.region,
      state: data.state,
      parentRegion: data.parentRegion,
      taxType: data.taxType,
      filingStatus: data.filingStatus,
      taxedIncome: data.taxedIncome,
      brackets
    };
  });

  // Convert Sets to arrays
  return {
    ladders,
    metadata: {
      states: Array.from(metadata.states).sort(),
      countries: Array.from(metadata.countries).sort(),
      filingStatuses: Array.from(metadata.filingStatuses).filter(s => s !== 'All').sort(),
      taxTypes: Array.from(metadata.taxTypes).sort(),
      statesByCountry: Object.fromEntries(
        Object.entries(metadata.statesByCountry).map(([country, states]) => [
          country,
          Array.from(states).sort()
        ])
      )
    }
  };
}

/**
 * Initialize and parse the tax ladder data
 */
export function initializeTaxLadders() {
  if (!parsedData) {
    const rows = parseCSV(taxLaddersCSV);
    parsedData = buildTaxLadderIndex(rows);
    console.log('Tax ladders initialized:', {
      totalLadders: Object.keys(parsedData.ladders).length,
      states: parsedData.metadata.states,
      countries: parsedData.metadata.countries,
      sampleKeys: Object.keys(parsedData.ladders).slice(0, 5)
    });
  }
  return parsedData;
}

/**
 * Get a specific tax ladder by parameters
 * @param {string} region - 'Federal' or 'State_Province'
 * @param {string} state - State name or country for federal
 * @param {string} taxType - 'Income', 'CapitalGains', 'FICA Social Security', etc.
 * @param {string} filingStatus - 'Single', 'Married', 'Head_of_Household', 'Separate', 'All'
 * @returns {Object|null} Ladder object with brackets or null if not found
 */
export function getTaxLadder(region, state, taxType, filingStatus) {
  if (!parsedData) {
    initializeTaxLadders();
  }

  const key = `${region}_${state}_${taxType}_${filingStatus}`;
  let ladder = parsedData.ladders[key];

  // If not found, apply country-specific fallbacks
  if (!ladder && filingStatus !== 'All') {
    // Determine country for fallback logic
    const country = region === 'Federal' ? state : getCountryForState(state);

    if (country === 'Canada') {
      // Canada: All filing statuses fall back to Single
      const singleKey = `${region}_${state}_${taxType}_Single`;
      ladder = parsedData.ladders[singleKey];
      if (ladder) {
        console.log(`Canada fallback: ${filingStatus} → Single for ${state} ${taxType}`);
      }
    } else if (country === 'USA') {
      // USA fallback chain
      let fallbackStatus = null;

      if (filingStatus === 'Head_of_Household') {
        // Head of Household → Married
        fallbackStatus = 'Married';
      } else if (filingStatus === 'Separate') {
        // Married Filing Separately → Single
        fallbackStatus = 'Single';
      }

      if (fallbackStatus) {
        const fallbackKey = `${region}_${state}_${taxType}_${fallbackStatus}`;
        ladder = parsedData.ladders[fallbackKey];
        if (ladder) {
          console.log(`USA fallback: ${filingStatus} → ${fallbackStatus} for ${state} ${taxType}`);
        }
      }
    }

    // Final fallback to 'All' if still not found
    if (!ladder) {
      const allKey = `${region}_${state}_${taxType}_All`;
      ladder = parsedData.ladders[allKey];
    }
  }

  if (!ladder) {
    console.warn(`Tax ladder not found for key: ${key}`);
  }

  return ladder || null;
}

/**
 * Get state tax ladder
 */
export function getStateTaxLadder(state, taxType, filingStatus) {
  return getTaxLadder('State_Province', state, taxType, filingStatus);
}

/**
 * Get federal tax ladder
 */
export function getFederalTaxLadder(country, taxType, filingStatus) {
  return getTaxLadder('Federal', country, taxType, filingStatus);
}

/**
 * Get all available states/provinces from the CSV
 */
export function getAvailableStates() {
  if (!parsedData) {
    initializeTaxLadders();
  }
  return parsedData.metadata.states;
}

/**
 * Get states by country
 */
export function getStatesByCountry(country) {
  if (!parsedData) {
    initializeTaxLadders();
  }
  return parsedData.metadata.statesByCountry[country] || [];
}

/**
 * Get all available countries
 */
export function getAvailableCountries() {
  if (!parsedData) {
    initializeTaxLadders();
  }
  return parsedData.metadata.countries;
}

/**
 * Get available filing statuses
 */
export function getAvailableFilingStatuses() {
  if (!parsedData) {
    initializeTaxLadders();
  }
  return parsedData.metadata.filingStatuses;
}

/**
 * Get all tax types available in the data
 */
export function getAvailableTaxTypes() {
  if (!parsedData) {
    initializeTaxLadders();
  }
  return parsedData.metadata.taxTypes;
}

/**
 * Get the parent country for a state
 */
export function getCountryForState(state) {
  if (!parsedData) {
    initializeTaxLadders();
  }

  for (const [country, states] of Object.entries(parsedData.metadata.statesByCountry)) {
    if (states.includes(state)) {
      return country;
    }
  }
  return null;
}

/**
 * Get all ladder data (for debugging/inspection)
 */
export function getAllLadderData() {
  if (!parsedData) {
    initializeTaxLadders();
  }
  return parsedData;
}

/**
 * Get available tax types for a specific jurisdiction
 * @param {string} region - 'State_Province' or 'Federal'
 * @param {string} jurisdiction - State name or country name
 * @returns {Array} Available tax types
 */
export function getTaxTypesForJurisdiction(region, jurisdiction) {
  if (!parsedData) {
    initializeTaxLadders();
  }

  const taxTypes = new Set();
  const prefix = `${region}_${jurisdiction}_`;

  // Known filing statuses to identify where tax type ends
  const filingStatuses = ['Single', 'Married', 'Separate', 'Head_of_Household', 'All'];

  Object.keys(parsedData.ladders).forEach(key => {
    if (key.startsWith(prefix)) {
      const afterJurisdiction = key.substring(prefix.length);

      // Find which filing status this key ends with
      for (const status of filingStatuses) {
        if (afterJurisdiction.endsWith(`_${status}`)) {
          const taxType = afterJurisdiction.substring(0, afterJurisdiction.length - status.length - 1);
          taxTypes.add(taxType);
          break;
        }
      }
    }
  });

  return Array.from(taxTypes).sort();
}

/**
 * Get available filing statuses for a specific jurisdiction and tax type
 * @param {string} region - 'State_Province' or 'Federal'
 * @param {string} jurisdiction - State name or country name
 * @param {string} taxType - Tax type
 * @returns {Array} Available filing statuses
 */
export function getFilingStatusesForTaxType(region, jurisdiction, taxType) {
  if (!parsedData) {
    initializeTaxLadders();
  }

  const filingStatuses = new Set();
  const prefix = `${region}_${jurisdiction}_${taxType}_`;

  Object.keys(parsedData.ladders).forEach(key => {
    if (key.startsWith(prefix)) {
      const filingStatus = key.substring(prefix.length);
      filingStatuses.add(filingStatus);
    }
  });

  return Array.from(filingStatuses).sort();
}

/**
 * Map user-friendly filing status to CSV format
 */
export function mapFilingStatusToCSV(filingStatus) {
  // Handle both capitalized and lowercase input
  const normalized = filingStatus?.toLowerCase();
  const mapping = {
    'single': 'Single',
    'married': 'Married',
    'married filing jointly': 'Married',
    'married filing separately': 'Separate',
    'head of household': 'Head_of_Household',
    'head': 'Head_of_Household',
    'separate': 'Separate'
  };
  return mapping[normalized] || filingStatus;
}

/**
 * Map CSV filing status to user-friendly format
 */
export function mapFilingStatusFromCSV(filingStatus) {
  const mapping = {
    'Single': 'Single',
    'Married': 'Married',
    'Separate': 'Married Filing Separately',
    'Head_of_Household': 'Head of Household'
  };
  return mapping[filingStatus] || filingStatus;
}

export default {
  initializeTaxLadders,
  getTaxLadder,
  getStateTaxLadder,
  getFederalTaxLadder,
  getAvailableStates,
  getStatesByCountry,
  getAvailableCountries,
  getAvailableFilingStatuses,
  getAvailableTaxTypes,
  getCountryForState,
  getAllLadderData,
  mapFilingStatusToCSV,
  mapFilingStatusFromCSV,
  getTaxTypesForJurisdiction,
  getFilingStatusesForTaxType
};
