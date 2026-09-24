import { describe, expect, it } from 'vitest';

import { LOCATION_ORDER } from '@/game';

import {
  RIVER,
  beziersToSvg,
  distanceToPolyline,
  locationPoint,
  pointAlong,
  polylineLength,
  routeBetween,
} from './map-data';

describe('map routes', () => {
  it('connects every pair of locations by road', () => {
    for (const from of LOCATION_ORDER) {
      for (const to of LOCATION_ORDER) {
        const route = routeBetween(from, to);
        expect(route[0]).toEqual(locationPoint(from));
        expect(route[route.length - 1]).toEqual(locationPoint(to));
        if (from !== to) expect(route.length, `${from}→${to}`).toBeGreaterThan(2);
      }
    }
  });

  it('goes through town between the forest and the mine', () => {
    const route = routeBetween('forest', 'mine');
    expect(distanceToPolyline(locationPoint('town'), route)).toBeLessThan(0.01);
    expect(distanceToPolyline(locationPoint('ranch'), route)).toBeLessThan(0.01);
  });

  it('walks along a route by share', () => {
    const route = routeBetween('town', 'canyon');
    const start = pointAlong(route, 0);
    const end = pointAlong(route, 1);
    expect(start.x).toBeCloseTo(locationPoint('town').x);
    expect(end.y).toBeCloseTo(locationPoint('canyon').y);
    const half = pointAlong(route, 0.5);
    const firstHalf = routeBetween('town', 'canyon');
    expect(distanceToPolyline(half, firstHalf)).toBeLessThan(0.01);
    expect(polylineLength(route)).toBeGreaterThan(Math.hypot(14, 36));
  });

  it('turns Bézier curves into SVG paths', () => {
    expect(beziersToSvg(RIVER, 10).startsWith('M -20 575 C 110 610')).toBe(true);
  });
});
