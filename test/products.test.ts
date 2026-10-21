import { describe, expect, it } from 'vitest'
import { parseProductsCsv } from '../server/utils/products'

const CSV = `name,manufacturer,price,description,category
EcoCharge HomeVault 10,EcoCharge,1499,"The HomeVault 10 is a 10kWh LiFePO4 battery, with an advanced BMS.",battery
Solarix Prime 450,Solarix,279.99,A 450W monocrystalline panel.,solar panel
SafeLock Pro Pair,SafeLock,7.99,"MC4-compatible pair, IP67 rated.",connector
Broken Widget,NoCat,10,Should be skipped,widget
`

describe('parseProductsCsv', () => {
  const products = parseProductsCsv(CSV)

  it('skips rows with an unknown category', () => {
    expect(products).toHaveLength(3)
    expect(products.find(p => p.category === ('widget' as never))).toBeUndefined()
  })

  it('preserves commas inside quoted descriptions', () => {
    expect(products[0]!.description).toBe(
      'The HomeVault 10 is a 10kWh LiFePO4 battery, with an advanced BMS.',
    )
  })

  it('parses decimal prices', () => {
    expect(products[1]!.price).toBe(279.99)
  })

  it('enriches batteries with capacity and solar panels with power', () => {
    expect(products[0]).toMatchObject({
      category: 'battery',
      capacityKwh: 10,
      powerW: null,
      specMetric: 'capacity',
      specValue: 10,
    })
    expect(products[1]).toMatchObject({
      category: 'solar panel',
      capacityKwh: null,
      powerW: 450,
      specMetric: 'power',
      specValue: 450,
    })
    expect(products[2]).toMatchObject({
      category: 'connector',
      specMetric: null,
      specValue: null,
    })
  })
})
