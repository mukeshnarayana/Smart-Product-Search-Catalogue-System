/**
 * Formats a numeric price into Indian Rupee (INR / ₹) currency string.
 * @param {number|string} amount
 * @param {string} [currency='INR']
 * @param {string} [locale='en-IN']
 * @returns {string}
 */
export function formatPrice(amount, currency = 'INR', locale = 'en-IN') {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return '₹0.00';
  }
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount));
}
