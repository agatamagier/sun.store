import type { Category, SpecMetric } from '../../shared/types/product'

/**
 * Spec extraction.
 *
 * The CSV has no dedicated capacity/power column, so we derive it from the
 * `name` and `description`. Strategy, per category:
 *   - battery     -> capacity in kWh  (e.g. "10kWh", "2.5kWh")
 *   - solar panel -> power in W       (e.g. "450W")
 *   - connector   -> neither (rated by A / V / AWG) -> null
 *
 * We read the value from the *description* first (it carries an explicit unit),
 * and cross-check it against the trailing number in the product name. When a
 * description contains several values (e.g. a 7.5kWh module that stacks to a
 * "total of 30kWh"), we prefer the one that matches the name's own number;
 * otherwise we take the first unit-tagged value. The name's number is only a
 * last-resort fallback when the description has no unit at all.
 */

// A decimal or integer number: 450, 2.5, 13.5
const NUMBER = String.raw`\d+(?:\.\d+)?`

// "10kWh" / "2.5 kWh" — case-insensitive.
const KWH_RE = new RegExp(`(${NUMBER})\\s*kWh`, 'gi')

// "450W" / "450 W" — the \b after W prevents matching the W inside "kWh"
// (W followed by the letter h) and the W inside "AWG" never has a leading number.
const WATT_RE = new RegExp(`(${NUMBER})\\s*W\\b`, 'gi')

/** All numeric values that precede the given unit, in document order. */
function matchUnit(text: string, pattern: RegExp): number[] {
  const values: number[] = []
  for (const match of text.matchAll(pattern)) {
    const parsed = Number.parseFloat(match[1]!)
    if (Number.isFinite(parsed)) values.push(parsed)
  }
  return values
}

/** The last standalone number appearing in a product name (its model/spec number). */
export function extractNumberFromName(name: string): number | null {
  const matches = name.match(new RegExp(NUMBER, 'g'))
  if (!matches || matches.length === 0) return null
  const parsed = Number.parseFloat(matches[matches.length - 1]!)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Pick the primary value given unit-tagged candidates from the description and
 * the number found in the name.
 */
function resolveValue(fromDescription: number[], fromName: number | null): number | null {
  if (fromDescription.length > 0) {
    // Prefer the candidate that matches the name's number (the primary rating),
    // guarding against "…total of 30kWh" style secondary values.
    if (fromName !== null && fromDescription.includes(fromName)) return fromName
    return fromDescription[0]!
  }
  // No unit in the description: fall back to the name's number.
  return fromName
}

export function extractCapacityKwh(name: string, description: string): number | null {
  return resolveValue(matchUnit(description, KWH_RE), extractNumberFromName(name))
}

export function extractPowerW(name: string, description: string): number | null {
  return resolveValue(matchUnit(description, WATT_RE), extractNumberFromName(name))
}

export interface DerivedSpec {
  capacityKwh: number | null
  powerW: number | null
  specMetric: SpecMetric | null
  specValue: number | null
}

/** Derive the capacity/power fields for a product based on its category. */
export function deriveProductSpec(
  category: Category,
  name: string,
  description: string,
): DerivedSpec {
  switch (category) {
    case 'battery': {
      const capacityKwh = extractCapacityKwh(name, description)
      return { capacityKwh, powerW: null, specMetric: 'capacity', specValue: capacityKwh }
    }
    case 'solar panel': {
      const powerW = extractPowerW(name, description)
      return { capacityKwh: null, powerW, specMetric: 'power', specValue: powerW }
    }
    case 'connector':
    default:
      return { capacityKwh: null, powerW: null, specMetric: null, specValue: null }
  }
}

/** Human-readable unit for a spec metric. */
export function specUnit(metric: SpecMetric): 'kWh' | 'W' {
  return metric === 'capacity' ? 'kWh' : 'W'
}

/** Human-readable label for a spec metric. */
export function specLabel(metric: SpecMetric): string {
  return metric === 'capacity' ? 'Capacity' : 'Power'
}
