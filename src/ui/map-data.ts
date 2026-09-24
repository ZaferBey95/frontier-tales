// Geography shared by the 2D and 3D maps. Everything is in map units, where
// both axes run from 0 to 100 like the location coordinates. Plain TypeScript,
// so it can be unit tested.

import { LOCATIONS, type LocationId } from '@/game';
import { createRng } from '@/game/rng';

export interface Point {
  x: number;
  y: number;
}

/** Roads between locations; the number bends the road sideways. */
export const ROADS: [LocationId, LocationId, number][] = [
  ['town', 'ranch', 0.12],
  ['town', 'river', -0.1],
  ['town', 'mine', 0.08],
  ['town', 'railroad', -0.08],
  ['town', 'canyon', 0.1],
  ['ranch', 'forest', -0.15],
  ['ranch', 'river', 0.12],
];

export const RAILROAD: Point[] = [
  { x: 100, y: 65 },
  { x: 93, y: 60.5 },
  { x: 86, y: 56 },
  { x: 85, y: 45 },
  { x: 83.2, y: 33 },
  { x: 80.5, y: 20.5 },
];

/** Cubic Bézier segments: start, control, control, end. */
export type Bezier = [Point, Point, Point, Point];

export const RIVER: Bezier[] = [
  [
    { x: -2, y: 57.5 },
    { x: 11, y: 61 },
    { x: 19, y: 70 },
    { x: 26.2, y: 80 },
  ],
  [
    { x: 26.2, y: 80 },
    { x: 33.4, y: 90 },
    { x: 40.5, y: 95.5 },
    { x: 53, y: 102 },
  ],
];

export const CREEK: Bezier[] = [
  [
    { x: 20.5, y: 17 },
    { x: 24, y: 29 },
    { x: 16, y: 38 },
    { x: 15, y: 47 },
  ],
  [
    { x: 15, y: 47 },
    { x: 14, y: 56 },
    { x: 11, y: 57.5 },
    { x: 7, y: 60 },
  ],
];

export interface Peak {
  x: number;
  /** Where the mountain meets the ground on the 2D map. */
  base: number;
  width: number;
  height: number;
  snow: boolean;
}

export const PEAKS: Peak[] = [
  { x: 60, base: 10.5, width: 12, height: 8.5, snow: false },
  { x: 66.5, base: 16.5, width: 15, height: 12, snow: false },
  { x: 74.5, base: 12, width: 17, height: 15, snow: true },
  { x: 89, base: 11.5, width: 19, height: 17.5, snow: true },
  { x: 98.5, base: 21, width: 15, height: 12.5, snow: true },
  { x: 70, base: 25, width: 12, height: 8.5, snow: false },
  { x: 90, base: 30, width: 15, height: 11, snow: false },
  { x: 97.5, base: 36, width: 12, height: 9, snow: false },
];

export interface Mesa {
  x: number;
  base: number;
  width: number;
  height: number;
}

export const MESAS: Mesa[] = [
  { x: 70.5, base: 76, width: 11, height: 4.5 },
  { x: 52, base: 84.5, width: 10, height: 4.2 },
  { x: 79, base: 91.5, width: 15, height: 7 },
  { x: 56, base: 97.5, width: 17, height: 5.8 },
  { x: 90, base: 98.5, width: 19, height: 6 },
];

export const CACTI: (Point & { size: number })[] = [
  { x: 47, y: 64, size: 4 },
  { x: 58.5, y: 57.5, size: 3.4 },
  { x: 73.5, y: 69, size: 4.4 },
  { x: 91.5, y: 77, size: 3.8 },
  { x: 39, y: 91.5, size: 3.6 },
  { x: 64, y: 44, size: 3 },
  { x: 96, y: 47, size: 3.4 },
];

export function locationPoint(id: LocationId): Point {
  return { x: LOCATIONS[id].x, y: LOCATIONS[id].y };
}

/** Pine trees scattered over the forest and a few near the farm. */
function makeTrees(): (Point & { size: number })[] {
  const rng = createRng(7);
  const trees: (Point & { size: number })[] = [];
  const forest = locationPoint('forest');
  let tries = 0;
  while (trees.length < 46 && tries < 2000) {
    tries += 1;
    const x = 2.5 + rng() * 33;
    const y = 3 + rng() * 28;
    const near = Math.hypot(x - forest.x, y - forest.y);
    if (near < 6.2 || (Math.abs(x - forest.x) < 7 && y > forest.y && y < forest.y + 9.5)) continue;
    if (Math.hypot(x - 18, y - 16) > 20) continue;
    trees.push({ x, y, size: 2 + rng() * 1.6 });
  }
  trees.push({ x: 39, y: 42, size: 2.4 }, { x: 15, y: 33, size: 2.2 }, { x: 33, y: 56, size: 2.2 });
  return trees.sort((a, b) => a.y - b.y);
}

export const TREES = makeTrees();

export function bezierPoint([p0, p1, p2, p3]: Bezier, t: number): Point {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return { x: a * p0.x + b * p1.x + c * p2.x + d * p3.x, y: a * p0.y + b * p1.y + c * p2.y + d * p3.y };
}

export function sampleBeziers(curves: Bezier[], stepsPerCurve = 24): Point[] {
  const points: Point[] = [];
  curves.forEach((curve, index) => {
    for (let i = index === 0 ? 0 : 1; i <= stepsPerCurve; i++) points.push(bezierPoint(curve, i / stepsPerCurve));
  });
  return points;
}

/** SVG path data for Bézier curves, scaled from map units. */
export function beziersToSvg(curves: Bezier[], scale: number): string {
  const s = (p: Point) => `${p.x * scale} ${p.y * scale}`;
  return curves
    .map(([p0, p1, p2, p3], index) => `${index === 0 ? `M ${s(p0)} ` : ''}C ${s(p1)}, ${s(p2)}, ${s(p3)}`)
    .join(' ');
}

/** Control point of a road's quadratic curve. */
export function roadControl(a: LocationId, b: LocationId, bend: number): Point {
  const p = locationPoint(a);
  const q = locationPoint(b);
  const mx = (p.x + q.x) / 2;
  const my = (p.y + q.y) / 2;
  return { x: mx - (q.y - p.y) * bend, y: my + (q.x - p.x) * bend };
}

export function sampleRoad(a: LocationId, b: LocationId, bend: number, steps = 32): Point[] {
  const p = locationPoint(a);
  const q = locationPoint(b);
  const c = roadControl(a, b, bend);
  const points: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    points.push({ x: u * u * p.x + 2 * u * t * c.x + t * t * q.x, y: u * u * p.y + 2 * u * t * c.y + t * t * q.y });
  }
  return points;
}

export function polylineLength(points: Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  return total;
}

/** The point a given share of the way along a polyline, and the direction there. */
export function pointAlong(points: Point[], share: number): Point & { angle: number } {
  const target = Math.min(1, Math.max(0, share)) * polylineLength(points);
  let walked = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const step = Math.hypot(b.x - a.x, b.y - a.y);
    if (walked + step >= target || i === points.length - 1) {
      const t = step > 0 ? Math.min(1, (target - walked) / step) : 0;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, angle: Math.atan2(b.y - a.y, b.x - a.x) };
    }
    walked += step;
  }
  const last = points[points.length - 1] ?? { x: 0, y: 0 };
  return { ...last, angle: 0 };
}

/** Shortest route along the roads, or a straight line when there is none. */
export function routeBetween(from: LocationId, to: LocationId): Point[] {
  if (from === to) return [locationPoint(from)];
  const edges = new Map<LocationId, { to: LocationId; points: Point[] }[]>();
  for (const [a, b, bend] of ROADS) {
    const points = sampleRoad(a, b, bend);
    edges.set(a, [...(edges.get(a) ?? []), { to: b, points }]);
    edges.set(b, [...(edges.get(b) ?? []), { to: a, points: [...points].reverse() }]);
  }
  const distance = new Map<LocationId, number>([[from, 0]]);
  const previous = new Map<LocationId, { from: LocationId; points: Point[] }>();
  const open = new Set<LocationId>([from]);
  while (open.size > 0) {
    let current: LocationId | null = null;
    for (const node of open) if (current === null || distance.get(node)! < distance.get(current)!) current = node;
    if (current === null || current === to) break;
    open.delete(current);
    for (const edge of edges.get(current) ?? []) {
      const next = distance.get(current)! + polylineLength(edge.points);
      if (next < (distance.get(edge.to) ?? Infinity)) {
        distance.set(edge.to, next);
        previous.set(edge.to, { from: current, points: edge.points });
        open.add(edge.to);
      }
    }
  }
  if (!previous.has(to)) return [locationPoint(from), locationPoint(to)];
  const legs: Point[][] = [];
  let node: LocationId = to;
  while (node !== from) {
    const step = previous.get(node)!;
    legs.unshift(step.points);
    node = step.from;
  }
  return legs.flatMap((leg, index) => (index === 0 ? leg : leg.slice(1)));
}

/** Shortest distance from a point to a polyline. */
export function distanceToPolyline(p: Point, points: Point[]): number {
  let best = Infinity;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSq = dx * dx + dy * dy;
    const t = lengthSq > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq)) : 0;
    best = Math.min(best, Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t)));
  }
  return best;
}
