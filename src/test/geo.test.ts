import { describe, expect, it } from 'vitest';
import { mergeGeo, normalizeGeo } from '@/lib/geo';

describe('geo targeting', () => {
  it('converts mile radius to kilometres', () => {
    const geo = normalizeGeo({ custom_locations: [{ latitude: -1.45, longitude: -48.5, radius: 10, distance_unit: 'mile' }] }, null);
    expect(geo?.customLocations?.[0]?.radiusKm).toBe(16.09);
  });
  it('keeps names and exclusions, hides empty targeting', () => {
    expect(normalizeGeo({ cities: [{ name: 'Belém' }] }, { regions: [{ name: 'Minas Gerais' }] })).toMatchObject({ locationNames: ['Belém'], excludedNames: ['Minas Gerais'] });
    expect(normalizeGeo({}, null)).toBeUndefined();
  });
  it('merges ad sets without duplicate pins', () => {
    const pin = { lat: 1, lng: 2, radiusKm: 3 };
    expect(mergeGeo([{ customLocations: [pin] }, { customLocations: [pin] }])?.customLocations).toHaveLength(1);
  });
});

describe('named areas on the map', () => {
  it('keeps neighbourhoods for map search and leaves pins untouched', async () => {
    const { namesToGeocode } = await import('@/lib/geo');
    const geo = normalizeGeo({ neighborhoods: [{ name: 'Jardim Ângela' }], countries: ['BR'] }, null)!;
    expect(namesToGeocode(geo)).toEqual(['Jardim Ângela']);
    const pinned = normalizeGeo({ custom_locations: [{ latitude: 1, longitude: 2, radius: 3, name: 'Loja' }] }, null)!;
    expect(namesToGeocode(pinned)).toEqual([]);
    expect(pinned.customLocations).toHaveLength(1);
  });
});
