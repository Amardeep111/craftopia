/**
 * Indian address validation and helpers.
 * - Pincode to state/territory lookup (first 2-6 digits match)
 * - Email block list validation
 * - Indian mobile number validation
 * - Custom dropdown-compatible data
 */

// Indian states and union territories
export const INDIAN_STATES = [
  { value: 'AN', label: 'Andaman and Nicobar Islands' },
  { value: 'AP', label: 'Andhra Pradesh' },
  { value: 'AR', label: 'Arunachal Pradesh' },
  { value: 'AS', label: 'Assam' },
  { value: 'BR', label: 'Bihar' },
  { value: 'CH', label: 'Chandigarh' },
  { value: 'CT', label: 'Chhattisgarh' },
  { value: 'DN', label: 'Dadra and Nagar Haveli' },
  { value: 'DD', label: 'Daman and Diu' },
  { value: 'DL', label: 'Delhi' },
  { value: 'GA', label: 'Goa' },
  { value: 'GJ', label: 'Gujarat' },
  { value: 'HR', label: 'Haryana' },
  { value: 'HP', label: 'Himachal Pradesh' },
  { value: 'JK', label: 'Jammu and Kashmir' },
  { value: 'JH', label: 'Jharkhand' },
  { value: 'KA', label: 'Karnataka' },
  { value: 'KL', label: 'Kerala' },
  { value: 'LD', label: 'Lakshadweep' },
  { value: 'MP', label: 'Madhya Pradesh' },
  { value: 'MH', label: 'Maharashtra' },
  { value: 'MN', label: 'Manipur' },
  { value: 'ML', label: 'Meghalaya' },
  { value: 'MZ', label: 'Mizoram' },
  { value: 'NL', label: 'Nagaland' },
  { value: 'OR', label: 'Odisha' },
  { value: 'PB', label: 'Punjab' },
  { value: 'PY', label: 'Puducherry' },
  { value: 'RJ', label: 'Rajasthan' },
  { value: 'SK', label: 'Sikkim' },
  { value: 'TN', label: 'Tamil Nadu' },
  { value: 'TG', label: 'Telangana' },
  { value: 'TR', label: 'Tripura' },
  { value: 'UP', label: 'Uttar Pradesh' },
  { value: 'UT', label: 'Uttarakhand' },
  { value: 'WB', label: 'West Bengal' },
].sort((a, b) => a.label.localeCompare(b.label))

export const STATE_OPTIONS = INDIAN_STATES.map((s) => ({
  value: s.label,
  label: s.label,
})).sort((a, b) => a.label.localeCompare(b.label))

export const PIN_MAP = {
  '400001': { city: 'Mumbai', state: 'Maharashtra' }, '400005': { city: 'Mumbai', state: 'Maharashtra' },
  '110001': { city: 'New Delhi', state: 'Delhi' }, '110010': { city: 'New Delhi', state: 'Delhi' },
  '600001': { city: 'Chennai', state: 'Tamil Nadu' }, '600020': { city: 'Chennai', state: 'Tamil Nadu' },
  '560001': { city: 'Bangalore', state: 'Karnataka' }, '560002': { city: 'Bangalore', state: 'Karnataka' },
  '560103': { city: 'Bangalore', state: 'Karnataka' },
  '500001': { city: 'Hyderabad', state: 'Telangana' }, '700001': { city: 'Kolkata', state: 'West Bengal' },
  '500081': { city: 'Secunderabad', state: 'Telangana' }, '260001': { city: 'Lucknow', state: 'Uttar Pradesh' },
  '410001': { city: 'Pune', state: 'Maharashtra' }, '380001': { city: 'Ahmedabad', state: 'Gujarat' },
  '302001': { city: 'Jaipur', state: 'Rajasthan' }, '401301': { city: 'Pune', state: 'Maharashtra' },
  '311001': { city: 'Bhilai', state: 'Chhattisgarh' }, '700102': { city: 'Kolkata', state: 'West Bengal' },
  '700033': { city: 'Kolkata', state: 'West Bengal' }, '734001': { city: 'Siliguri', state: 'West Bengal' },
}

export function getStateAndCityFromPin(pin) {
  if (!pin || pin.length < 2) return null
  if (PIN_MAP[pin]) return PIN_MAP[pin]

  const p3 = pin.slice(0, 3)
  if (p3 === '403') return { state: 'Goa', city: '' }
  if (p3 === '605') return { state: 'Puducherry', city: 'Puducherry' }
  if (p3 === '682' && pin.startsWith('68255')) return { state: 'Lakshadweep', city: 'Kavaratti' }
  if (p3 === '737') return { state: 'Sikkim', city: 'Gangtok' }
  if (p3 === '744') return { state: 'Andaman and Nicobar Islands', city: 'Port Blair' }
  if (['790', '791', '792'].includes(p3)) return { state: 'Arunachal Pradesh', city: 'Itanagar' }
  if (['793', '794'].includes(p3)) return { state: 'Meghalaya', city: 'Shillong' }
  if (p3 === '795') return { state: 'Manipur', city: 'Imphal' }
  if (p3 === '796') return { state: 'Mizoram', city: 'Aizawl' }
  if (p3 === '797') return { state: 'Nagaland', city: 'Kohima' }
  if (['798', '799'].includes(p3)) return { state: 'Tripura', city: 'Agartala' }
  if (p3 === '194') return { state: 'Ladakh', city: 'Leh' }
  if (['246', '248', '249', '262', '263'].includes(p3)) return { state: 'Uttarakhand', city: 'Dehradun' }
  if (['814', '815', '816', '825', '826', '827', '828', '829', '831', '832', '833', '834', '835'].includes(p3)) {
    return { state: 'Jharkhand', city: p3 === '834' ? 'Ranchi' : p3 === '831' ? 'Jamshedpur' : p3 === '826' ? 'Dhanbad' : '' }
  }
  if (['396', '362'].includes(p3) && (pin.startsWith('3962') || pin.startsWith('3625'))) {
    return { state: 'Dadra and Nagar Haveli and Daman and Diu', city: 'Daman' }
  }
  if (p3 === '734') return { state: 'West Bengal', city: 'Siliguri' }
  if (p3 === '700' || p3 === '701') return { state: 'West Bengal', city: 'Kolkata' }
  if (p3 === '110') return { state: 'Delhi', city: 'New Delhi' }
  if (p3 === '400') return { state: 'Maharashtra', city: 'Mumbai' }
  if (p3 === '411') return { state: 'Maharashtra', city: 'Pune' }
  if (p3 === '560') return { state: 'Karnataka', city: 'Bangalore' }
  if (p3 === '500') return { state: 'Telangana', city: 'Hyderabad' }
  if (p3 === '600') return { state: 'Tamil Nadu', city: 'Chennai' }
  if (p3 === '380') return { state: 'Gujarat', city: 'Ahmedabad' }
  if (p3 === '302') return { state: 'Rajasthan', city: 'Jaipur' }
  if (p3 === '226') return { state: 'Uttar Pradesh', city: 'Lucknow' }
  if (p3 === '800') return { state: 'Bihar', city: 'Patna' }

  const p2 = pin.slice(0, 2)
  const p2Map = {
    '11': { state: 'Delhi', city: 'Delhi' },
    '12': { state: 'Haryana', city: '' },
    '13': { state: 'Haryana', city: '' },
    '14': { state: 'Punjab', city: '' },
    '15': { state: 'Punjab', city: '' },
    '16': { state: 'Chandigarh', city: 'Chandigarh' },
    '17': { state: 'Himachal Pradesh', city: 'Shimla' },
    '18': { state: 'Jammu and Kashmir', city: 'Jammu' },
    '19': { state: 'Jammu and Kashmir', city: 'Srinagar' },
    '20': { state: 'Uttar Pradesh', city: '' },
    '21': { state: 'Uttar Pradesh', city: '' },
    '22': { state: 'Uttar Pradesh', city: '' },
    '23': { state: 'Uttar Pradesh', city: '' },
    '24': { state: 'Uttar Pradesh', city: '' },
    '25': { state: 'Uttar Pradesh', city: '' },
    '26': { state: 'Uttar Pradesh', city: '' },
    '27': { state: 'Uttar Pradesh', city: '' },
    '28': { state: 'Uttar Pradesh', city: '' },
    '30': { state: 'Rajasthan', city: '' },
    '31': { state: 'Rajasthan', city: '' },
    '32': { state: 'Rajasthan', city: '' },
    '33': { state: 'Rajasthan', city: '' },
    '34': { state: 'Rajasthan', city: '' },
    '36': { state: 'Gujarat', city: '' },
    '37': { state: 'Gujarat', city: '' },
    '38': { state: 'Gujarat', city: '' },
    '39': { state: 'Gujarat', city: '' },
    '40': { state: 'Maharashtra', city: '' },
    '41': { state: 'Maharashtra', city: '' },
    '42': { state: 'Maharashtra', city: '' },
    '43': { state: 'Maharashtra', city: '' },
    '44': { state: 'Maharashtra', city: '' },
    '45': { state: 'Madhya Pradesh', city: '' },
    '46': { state: 'Madhya Pradesh', city: '' },
    '47': { state: 'Madhya Pradesh', city: '' },
    '48': { state: 'Madhya Pradesh', city: '' },
    '49': { state: 'Chhattisgarh', city: 'Raipur' },
    '50': { state: 'Telangana', city: '' },
    '51': { state: 'Andhra Pradesh', city: '' },
    '52': { state: 'Andhra Pradesh', city: '' },
    '53': { state: 'Andhra Pradesh', city: '' },
    '56': { state: 'Karnataka', city: '' },
    '57': { state: 'Karnataka', city: '' },
    '58': { state: 'Karnataka', city: '' },
    '59': { state: 'Karnataka', city: '' },
    '60': { state: 'Tamil Nadu', city: '' },
    '61': { state: 'Tamil Nadu', city: '' },
    '62': { state: 'Tamil Nadu', city: '' },
    '63': { state: 'Tamil Nadu', city: '' },
    '64': { state: 'Tamil Nadu', city: '' },
    '67': { state: 'Kerala', city: '' },
    '68': { state: 'Kerala', city: '' },
    '69': { state: 'Kerala', city: '' },
    '70': { state: 'West Bengal', city: '' },
    '71': { state: 'West Bengal', city: '' },
    '72': { state: 'West Bengal', city: '' },
    '73': { state: 'West Bengal', city: '' },
    '74': { state: 'West Bengal', city: '' },
    '75': { state: 'Odisha', city: '' },
    '76': { state: 'Odisha', city: '' },
    '77': { state: 'Odisha', city: '' },
    '78': { state: 'Assam', city: '' },
    '80': { state: 'Bihar', city: '' },
    '81': { state: 'Bihar', city: '' },
    '82': { state: 'Bihar', city: '' },
    '83': { state: 'Jharkhand', city: '' },
    '84': { state: 'Bihar', city: '' },
    '85': { state: 'Bihar', city: '' },
  }
  return p2Map[p2] || null
}

// Blocked email domains (disposable / temp / suspicious)
export const BLOCKED_EMAIL_DOMAINS = [
  'tempmail.com',
  'throwawaymail.com',
  '10minutemail.com',
  'mailinator.com',
  'guerrillamail.com',
  'temp-mail.org',
  'yopmail.com',
  'sharklasers.com',
  'spam4.me',
  'dispostable.com',
]

export const BLOCKED_EMAIL_PREFIXES = [
  'admin', 'postmaster', 'abuse', 'noreply', 'no-reply',
  'support', 'help', 'contact-us',
  'test', 'demo', 'sample',
]

// Pincode to state mapping (first 6 digits mapped to primary state)
const PINCODE_STATE_MAP = {
  // Major metro pincodes
  '1100': 'DL', '4000': 'MH', '6000': 'TN', '7000': 'WB',
  '5600': 'KA', '5000': 'TG', '3800': 'GJ', '4110': 'MH',
  '6000': 'TN', '7000': 'WB', '1100': 'DL', '5000': 'TG',
  '3800': 'GJ', '4110': 'MH', '5600': 'KA', '5000': 'TG',
  '3800': 'GJ', '4110': 'MH', '5600': 'KA', '1100': 'DL',
  // Additional common ranges (approximate by first 2 digits for simplicity in demo)
  '11': 'DL', '12': 'HR', '13': 'PB', '14': 'PB',
  '20': 'UP', '21': 'UP', '22': 'WB', '23': 'WB',
  '26': 'MP', '27': 'MP', '28': 'GJ', '29': 'GJ',
  '40': 'AP', '41': 'AP', '50': 'TG', '51': 'TG',
  '52': 'KA', '53': 'KA', '56': 'KA',
  '60': 'TN', '61': 'TN', '62': 'TN', '63': 'TN',
  '64': 'KL', '65': 'KL', '68': 'TN',
  '70': 'WB', '71': 'WB', '72': 'WB', '73': 'WB',
}

export function getStateFromPinCode(pin) {
  if (!pin || typeof pin !== 'string') return null
  const cleaned = pin.replace(/\D/g, '').substring(0, 6)
  if (!cleaned) return null
  // Try full 6-digit first, then 4-digit, then 2-digit prefix
  for (let len = Math.min(6, cleaned.length); len >= 2; len--) {
    const prefix = cleaned.substring(0, len)
    if (PINCODE_STATE_MAP[prefix]) {
      return PINCODE_STATE_MAP[prefix]
    }
  }
  return null
}

export function getStateNameFromCode(code) {
  const state = INDIAN_STATES.find(s => s.value === code)
  return state ? state.label : null
}

// Email block list check
export function isBlockedEmail(email) {
  if (!email || typeof email !== 'string') return true
  const lower = email.toLowerCase().trim()
  const domain = lower.split('@')[1]
  if (BLOCKED_EMAIL_DOMAINS.includes(domain)) return true
  const prefix = lower.split('@')[0]
  if (BLOCKED_EMAIL_PREFIXES.includes(prefix)) return true
  return false
}

// Email format validation (stricter than standard regex)
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false
  const trimmed = email.trim()
  if (trimmed.length > 254) return false
  if (trimmed.indexOf('..') !== -1) return false
  if (trimmed.indexOf('@') === -1) return false
  // More permissive but functional regex for Indian use
  const emailRe = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/
  if (!emailRe.test(trimmed)) return false
  if (isBlockedEmail(trimmed)) return false
  return true
}

// Indian mobile validation
export function isValidIndianMobile(mobile) {
  if (!mobile && mobile !== '') return false
  const digits = String(mobile).replace(/\D/g, '')
  if (digits.length === 10) {
    // Indian mobile numbers: starts with 6, 7, 8, 9
    return /^[6789]\d{9}$/.test(digits)
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    const body = digits.slice(2)
    return /^[6789]\d{9}$/.test(body)
  }
  return false
}

// Pincode validation
export function isValidPinCode(pin) {
  if (!pin) return false
  const digits = String(pin).replace(/\D/g, '')
  return digits.length === 6 && /^[1-9]\d{5}$/.test(digits)
}
