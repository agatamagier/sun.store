import { describe, expect, it } from 'vitest'
import {
  deriveProductSpec,
  extractCapacityKwh,
  extractNumberFromName,
  extractPowerW,
} from '../server/utils/spec'

describe('extractNumberFromName', () => {
  it('reads the trailing model number', () => {
    expect(extractNumberFromName('EcoCharge HomeVault 10')).toBe(10)
    expect(extractNumberFromName('Solarix Prime 450')).toBe(450)
  })

  it('handles decimals', () => {
    expect(extractNumberFromName('VoltStorage Core 2.5')).toBe(2.5)
    expect(extractNumberFromName('EcoCharge HomeVault 13.5')).toBe(13.5)
  })

  it('returns the last number when several are present', () => {
    expect(extractNumberFromName('PV-Link T-Branch 2-1')).toBe(1)
    // Embedded numbers count too (e.g. "H4"); the name fallback is only ever
    // consulted for battery/solar panel, where the trailing number is the spec.
    expect(extractNumberFromName('SolarSnap H4 Pair')).toBe(4)
  })

  it('returns null when there is no number', () => {
    expect(extractNumberFromName('Amphenol Connector Pair')).toBeNull()
  })
})

describe('extractCapacityKwh', () => {
  it('reads kWh from the description', () => {
    expect(extractCapacityKwh('EcoCharge HomeVault 10', 'A 10kWh LiFePO4 battery.')).toBe(10)
  })

  it('handles decimal kWh', () => {
    expect(extractCapacityKwh('ZenithStorage Z-Bank 2.4', 'This 2.4kWh rack module.')).toBe(2.4)
  })

  it('prefers the value matching the name over a secondary "total" value', () => {
    // "…stack up to four units for a total of 30kWh" must NOT win over 7.5kWh.
    expect(
      extractCapacityKwh(
        'PowerFlow Stack 7.5',
        'The 7.5kWh modular LFP battery. Stack up to four units for a total of 30kWh.',
      ),
    ).toBe(7.5)
    expect(
      extractCapacityKwh(
        'PowerFlow Stack 10.5',
        'This 10.5kWh battery system is comprised of three 3.5kWh modules.',
      ),
    ).toBe(10.5)
  })

  it('falls back to the name number when the description has no unit', () => {
    expect(extractCapacityKwh('HomeBase 10', 'Dependable energy storage.')).toBe(10)
  })

  it('does not treat W-only text as kWh', () => {
    expect(extractCapacityKwh('No Number Here', 'A 450W panel.')).toBeNull()
  })
})

describe('extractPowerW', () => {
  it('reads W from the description', () => {
    expect(extractPowerW('Solarix Prime 450', 'An impressive 450W output.')).toBe(450)
  })

  it('does not match the W inside "kWh"', () => {
    // Description has only "10kWh" (no standalone W) -> falls back to name 450.
    expect(extractPowerW('Panel 450', 'Paired with a 10kWh battery.')).toBe(450)
  })

  it('does not match the W inside "AWG" or a voltage', () => {
    expect(extractPowerW('No Number', 'For 12 AWG cable, certified to 1500V.')).toBeNull()
  })
})

describe('deriveProductSpec', () => {
  it('maps battery to capacity (kWh) and leaves power null', () => {
    expect(deriveProductSpec('battery', 'HomeVault 10', 'A 10kWh battery.')).toEqual({
      capacityKwh: 10,
      powerW: null,
      specMetric: 'capacity',
      specValue: 10,
    })
  })

  it('maps solar panel to power (W) and leaves capacity null', () => {
    expect(deriveProductSpec('solar panel', 'Prime 450', 'A 450W panel.')).toEqual({
      capacityKwh: null,
      powerW: 450,
      specMetric: 'power',
      specValue: 450,
    })
  })

  it('maps connector to no spec at all (edge case)', () => {
    expect(deriveProductSpec('connector', 'MC4 Pair 15A', 'An inline 15A fuse, 1500V rated.')).toEqual({
      capacityKwh: null,
      powerW: null,
      specMetric: null,
      specValue: null,
    })
  })
})
