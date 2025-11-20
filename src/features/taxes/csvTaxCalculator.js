/**
 * CSV-Based Tax Calculator
 * Calculates taxes using the parsed CSV tax ladder data
 */

import {
  getStateTaxLadder,
  getFederalTaxLadder,
  getTaxLadder,
  getCountryForState,
  mapFilingStatusToCSV
} from './csvTaxLadders';
import { storage } from '../../shared/storage';

// Helper to get data from storage
const getData = (key) => storage.load(key);

/**
 * Apply inflation adjustment to tax brackets
 * @param {Array} brackets - Array of bracket objects
 * @param {number} inflationMultiplier - Cumulative inflation multiplier
 * @returns {Array} Inflation-adjusted brackets
 */
function applyInflation(brackets, inflationMultiplier) {
  if (!brackets || inflationMultiplier === 1) return brackets;

  return brackets.map(bracket => ({
    ...bracket,
    min: Math.round(bracket.min * inflationMultiplier),
    max: bracket.max === 99999999 ? 99999999 : Math.round(bracket.max * inflationMultiplier)
  }));
}

/**
 * Calculate progressive tax using brackets
 * @param {number} income - Taxable income
 * @param {Array} brackets - Tax brackets
 * @returns {Object} Tax amount and bracket breakdown
 */
function calculateProgressiveTax(income, brackets) {
  if (!brackets || brackets.length === 0) {
    return { tax: 0, breakdown: [], effectiveRate: 0 };
  }

  let totalTax = 0;
  const breakdown = [];

  for (const bracket of brackets) {
    if (income <= bracket.min) break;

    const taxableInBracket = Math.min(income, bracket.max) - bracket.min;
    if (taxableInBracket > 0) {
      const taxInBracket = taxableInBracket * bracket.rate;
      totalTax += taxInBracket;
      breakdown.push({
        min: bracket.min,
        max: bracket.max,
        rate: bracket.rate,
        taxableAmount: taxableInBracket,
        taxAmount: taxInBracket
      });
    }
  }

  return {
    tax: totalTax,
    breakdown,
    effectiveRate: income > 0 ? totalTax / income : 0
  };
}

/**
 * Get filing status with remapping applied
 * @param {string} filingStatus - User's filing status
 * @param {string} state - State/province
 * @returns {string} Remapped filing status
 */
function getRemappedFilingStatus(filingStatus, state) {
  const remapping = getData('filingStatusRemapping') || {};
  const stateRemapping = remapping[state];

  if (stateRemapping && stateRemapping[filingStatus]) {
    return stateRemapping[filingStatus];
  }

  return filingStatus;
}

/**
 * Calculate state/provincial income tax
 */
function calculateStateIncomeTax(income, state, filingStatus, inflationMultiplier) {
  const csvFilingStatus = mapFilingStatusToCSV(filingStatus);
  const ladder = getStateTaxLadder(state, 'Income', csvFilingStatus);

  if (!ladder) {
    return { tax: 0, breakdown: [], effectiveRate: 0, notAvailable: true };
  }

  const adjustedBrackets = applyInflation(ladder.brackets, inflationMultiplier);
  return calculateProgressiveTax(income, adjustedBrackets);
}

/**
 * Calculate state/provincial capital gains tax
 */
function calculateStateCapitalGainsTax(income, state, filingStatus, inflationMultiplier) {
  const csvFilingStatus = mapFilingStatusToCSV(filingStatus);
  const ladder = getStateTaxLadder(state, 'CapitalGains', csvFilingStatus);

  if (!ladder) {
    return { tax: 0, breakdown: [], effectiveRate: 0, notAvailable: true };
  }

  const adjustedBrackets = applyInflation(ladder.brackets, inflationMultiplier);
  return calculateProgressiveTax(income, adjustedBrackets);
}

/**
 * Calculate federal income tax
 */
function calculateFederalIncomeTax(income, country, filingStatus, inflationMultiplier) {
  const csvFilingStatus = mapFilingStatusToCSV(filingStatus);
  const ladder = getFederalTaxLadder(country, 'Income', csvFilingStatus);

  if (!ladder) {
    // Try combined income and capital gains (Canada)
    const combinedLadder = getFederalTaxLadder(country, 'Income_and_CapitalGains', csvFilingStatus);
    if (combinedLadder) {
      const adjustedBrackets = applyInflation(combinedLadder.brackets, inflationMultiplier);
      return calculateProgressiveTax(income, adjustedBrackets);
    }
    return { tax: 0, breakdown: [], effectiveRate: 0, notAvailable: true };
  }

  const adjustedBrackets = applyInflation(ladder.brackets, inflationMultiplier);
  return calculateProgressiveTax(income, adjustedBrackets);
}

/**
 * Calculate federal capital gains tax
 */
function calculateFederalCapitalGainsTax(income, country, filingStatus, inflationMultiplier) {
  const csvFilingStatus = mapFilingStatusToCSV(filingStatus);
  const ladder = getFederalTaxLadder(country, 'CapitalGains', csvFilingStatus);

  if (!ladder) {
    return { tax: 0, breakdown: [], effectiveRate: 0, notAvailable: true };
  }

  const adjustedBrackets = applyInflation(ladder.brackets, inflationMultiplier);
  return calculateProgressiveTax(income, adjustedBrackets);
}

/**
 * Calculate US FICA taxes (Social Security + Medicare)
 */
function calculateUSFICA(income, filingStatus, inflationMultiplier) {
  const csvFilingStatus = mapFilingStatusToCSV(filingStatus);

  // Social Security
  const ssLadder = getFederalTaxLadder('USA', 'FICA Social Security', csvFilingStatus);
  let ssTax = 0;
  if (ssLadder) {
    const adjustedBrackets = applyInflation(ssLadder.brackets, inflationMultiplier);
    const result = calculateProgressiveTax(income, adjustedBrackets);
    ssTax = result.tax;
  }

  // Medicare
  const medicareLadder = getFederalTaxLadder('USA', 'FICA Medicare', csvFilingStatus);
  let medicareTax = 0;
  if (medicareLadder) {
    const adjustedBrackets = applyInflation(medicareLadder.brackets, inflationMultiplier);
    const result = calculateProgressiveTax(income, adjustedBrackets);
    medicareTax = result.tax;
  }

  // Additional Medicare
  const additionalMedicareLadder = getFederalTaxLadder('USA', 'FICA Medicare Additional', csvFilingStatus);
  let additionalMedicareTax = 0;
  if (additionalMedicareLadder) {
    const adjustedBrackets = applyInflation(additionalMedicareLadder.brackets, inflationMultiplier);
    const result = calculateProgressiveTax(income, adjustedBrackets);
    additionalMedicareTax = result.tax;
  }

  return {
    socialSecurity: ssTax,
    medicare: medicareTax,
    additionalMedicare: additionalMedicareTax,
    total: ssTax + medicareTax + additionalMedicareTax
  };
}

/**
 * Calculate Canadian CPP (Canada Pension Plan)
 */
function calculateCPP(income, inflationMultiplier) {
  const ladder = getFederalTaxLadder('Canada', 'CPP', 'All');

  if (!ladder) {
    return { tax: 0, breakdown: [], effectiveRate: 0 };
  }

  const adjustedBrackets = applyInflation(ladder.brackets, inflationMultiplier);
  return calculateProgressiveTax(income, adjustedBrackets);
}

/**
 * Calculate Canadian EI (Employment Insurance)
 */
function calculateEI(income, inflationMultiplier) {
  const ladder = getFederalTaxLadder('Canada', 'EI', 'All');

  if (!ladder) {
    return { tax: 0, breakdown: [], effectiveRate: 0 };
  }

  const adjustedBrackets = applyInflation(ladder.brackets, inflationMultiplier);
  return calculateProgressiveTax(income, adjustedBrackets);
}

/**
 * Calculate all taxes using CSV data
 * @param {number} income - Gross income
 * @param {string} incomeType - 'salary' or 'investment'
 * @param {string} filingStatus - Filing status
 * @param {string} state - State/province
 * @param {number} year - Tax year for inflation
 * @param {number} inflationRate - Annual inflation rate
 * @returns {Object} Complete tax breakdown
 */
export function calculateTaxesCSV(income, incomeType, filingStatus, state, year, inflationRate) {
  // Calculate inflation multiplier (base year 2025)
  const baseYear = 2025;
  const yearsFromBase = year - baseYear;
  const inflationMultiplier = yearsFromBase > 0
    ? Math.pow(1 + inflationRate, yearsFromBase)
    : 1;

  // Determine country from state
  const country = getCountryForState(state) || 'USA';

  // Apply filing status remapping
  const remappedFilingStatus = getRemappedFilingStatus(filingStatus, state);

  // Check for custom ladder
  const customLadder = getData('customTaxLadder');
  let useCustom = customLadder && customLadder.enabled;

  let stateTax, federalTax, payrollTaxes;

  if (useCustom) {
    // Use custom ladder
    const customBrackets = incomeType === 'investment'
      ? customLadder.capitalGainsTax
      : customLadder.incomeTax;

    const adjustedBrackets = applyInflation(customBrackets, inflationMultiplier);
    const customResult = calculateProgressiveTax(income, adjustedBrackets);

    stateTax = { tax: 0, breakdown: [], effectiveRate: 0, custom: true };
    federalTax = customResult;
    federalTax.custom = true;

    // Calculate payroll taxes based on custom selection
    payrollTaxes = calculateCustomPayrollTaxes(
      income,
      remappedFilingStatus,
      customLadder.payrollTaxes || [],
      inflationMultiplier
    );
  } else {
    // Use CSV data
    if (incomeType === 'investment') {
      stateTax = calculateStateCapitalGainsTax(income, state, remappedFilingStatus, inflationMultiplier);
      federalTax = calculateFederalCapitalGainsTax(income, country, remappedFilingStatus, inflationMultiplier);
      payrollTaxes = { socialSecurity: 0, medicare: 0, additionalMedicare: 0, cpp: 0, ei: 0, total: 0 };
    } else {
      stateTax = calculateStateIncomeTax(income, state, remappedFilingStatus, inflationMultiplier);
      federalTax = calculateFederalIncomeTax(income, country, remappedFilingStatus, inflationMultiplier);

      // Calculate payroll taxes based on country
      if (country === 'USA') {
        const fica = calculateUSFICA(income, remappedFilingStatus, inflationMultiplier);
        payrollTaxes = {
          socialSecurity: fica.socialSecurity,
          medicare: fica.medicare,
          additionalMedicare: fica.additionalMedicare,
          cpp: 0,
          ei: 0,
          total: fica.total
        };
      } else if (country === 'Canada') {
        const cpp = calculateCPP(income, inflationMultiplier);
        const ei = calculateEI(income, inflationMultiplier);
        payrollTaxes = {
          socialSecurity: 0,
          medicare: 0,
          additionalMedicare: 0,
          cpp: cpp.tax,
          ei: ei.tax,
          total: cpp.tax + ei.tax
        };
      } else {
        payrollTaxes = { socialSecurity: 0, medicare: 0, additionalMedicare: 0, cpp: 0, ei: 0, total: 0 };
      }
    }
  }

  const totalTax = stateTax.tax + federalTax.tax + payrollTaxes.total;
  const effectiveRate = income > 0 ? totalTax / income : 0;

  return {
    grossIncome: income,
    incomeType,
    filingStatus: remappedFilingStatus,
    originalFilingStatus: filingStatus,
    state,
    country,
    year,

    stateTax: {
      amount: stateTax.tax,
      effectiveRate: stateTax.effectiveRate,
      breakdown: stateTax.breakdown,
      notAvailable: stateTax.notAvailable,
      custom: stateTax.custom
    },

    federalTax: {
      amount: federalTax.tax,
      effectiveRate: federalTax.effectiveRate,
      breakdown: federalTax.breakdown,
      notAvailable: federalTax.notAvailable,
      custom: federalTax.custom
    },

    payrollTaxes: {
      socialSecurity: payrollTaxes.socialSecurity,
      medicare: payrollTaxes.medicare,
      additionalMedicare: payrollTaxes.additionalMedicare,
      cpp: payrollTaxes.cpp,
      ei: payrollTaxes.ei,
      total: payrollTaxes.total
    },

    totalTax,
    effectiveRate,
    takeHome: income - totalTax
  };
}

/**
 * Calculate payroll taxes based on custom ladder selection
 */
function calculateCustomPayrollTaxes(income, filingStatus, selectedTaxes, inflationMultiplier) {
  const result = {
    socialSecurity: 0,
    medicare: 0,
    additionalMedicare: 0,
    cpp: 0,
    ei: 0,
    total: 0
  };

  if (selectedTaxes.includes('FICA Social Security')) {
    const ladder = getFederalTaxLadder('USA', 'FICA Social Security', filingStatus);
    if (ladder) {
      const adjusted = applyInflation(ladder.brackets, inflationMultiplier);
      result.socialSecurity = calculateProgressiveTax(income, adjusted).tax;
    }
  }

  if (selectedTaxes.includes('FICA Medicare')) {
    const ladder = getFederalTaxLadder('USA', 'FICA Medicare', filingStatus);
    if (ladder) {
      const adjusted = applyInflation(ladder.brackets, inflationMultiplier);
      result.medicare = calculateProgressiveTax(income, adjusted).tax;

      // Also check for additional Medicare
      const additionalLadder = getFederalTaxLadder('USA', 'FICA Medicare Additional', filingStatus);
      if (additionalLadder) {
        const additionalAdjusted = applyInflation(additionalLadder.brackets, inflationMultiplier);
        result.additionalMedicare = calculateProgressiveTax(income, additionalAdjusted).tax;
      }
    }
  }

  if (selectedTaxes.includes('CPP')) {
    const ladder = getFederalTaxLadder('Canada', 'CPP', 'All');
    if (ladder) {
      const adjusted = applyInflation(ladder.brackets, inflationMultiplier);
      result.cpp = calculateProgressiveTax(income, adjusted).tax;
    }
  }

  if (selectedTaxes.includes('EI')) {
    const ladder = getFederalTaxLadder('Canada', 'EI', 'All');
    if (ladder) {
      const adjusted = applyInflation(ladder.brackets, inflationMultiplier);
      result.ei = calculateProgressiveTax(income, adjusted).tax;
    }
  }

  result.total = result.socialSecurity + result.medicare + result.additionalMedicare + result.cpp + result.ei;
  return result;
}

export default {
  calculateTaxesCSV,
  applyInflation,
  calculateProgressiveTax
};
