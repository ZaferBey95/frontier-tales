// The ground of the 3D map: a low-poly height field with mountains, mesas and
// a river bed, plus water, roads and the railway laid on top of it.

import * as THREE from 'three';

import { LOCATION_ORDER, type LocationId } from '@/game';
import { createRng } from '@/game/rng';

import {
  CREEK,
  MESAS,
  PEAKS,
  RAILROAD,
  RIVER,
  ROADS,
  distanceToPolyline,
  locationPoint,
  sampleBeziers,
  sampleRoad,
  type Point,
} from '../map-data';

/** Map units (0-100) to world coordinates, with the map centred on the origin. */
export function toWorld(p: Point, y = 0): THREE.Vector3 {
  return new THREE.Vector3(p.x - 50, y, p.y - 50);
}

export const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function makeNoise(seed: number) {
  const rng = createRng(seed);
  const size = 64;
  const grid = Array.from({ length: size * size }, () => rng());
  const at = (ix: number, iy: number) => grid[(((iy % size) + size) % size) * size + (((ix % size) + size) % size)];
  return (x: number, y: number) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const a = at(ix, iy);
    const b = at(ix + 1, iy);
    const c = at(ix, iy + 1);
    const d = at(ix + 1, iy + 1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
}

export const noise = makeNoise(3);

const RIVER_POINTS = sampleBeziers(RIVER, 40);
const CREEK_POINTS = sampleBeziers(CREEK, 30);
const PAD_RADIUS: Partial<Record<LocationId, number>> = { town: 10.5 };

export function baseHeight(x: number, y: number): number {
  return 0.7 + 0.55 * noise(x * 0.08, y * 0.08) + 0.2 * noise(x * 0.21 + 11, y * 0.21 + 5);
}

export function mountainAt(x: number, y: number): number {
  let h = 0;
  for (const peak of PEAKS) {
    const cx = peak.x;
    const cy = peak.base - peak.height * 0.45;
    const r = peak.width * 0.62;
    const d = Math.hypot(x - cx, (y - cy) * 1.15) / r;
    if (d >= 1) continue;
    const ridge = 1 + 0.18 * (noise(x * 0.4 + 3, y * 0.4 + 9) - 0.5);
    h = Math.max(h, peak.height * 0.85 * Math.pow(1 - d, 1.2) * ridge);
  }
  return h;
}

export function mesaAt(x: number, y: number): number {
  let h = 0;
  for (const mesa of MESAS) {
    const cx = mesa.x;
    const cy = mesa.base - mesa.height * 0.6;
    const rx = mesa.width * 0.42;
    const ry = mesa.height * 0.9 + 1.2;
    const d = Math.pow(Math.pow(Math.abs(x - cx) / rx, 4) + Math.pow(Math.abs(y - cy) / ry, 4), 0.25);
    const top = 2.4 + mesa.height * 0.4;
    h = Math.max(h, top * (1 - smoothstep(0.84, 1, d)));
  }
  return h;
}

/** Height of the ground at a map position, before it is cut into triangles. */
export function heightAt(x: number, y: number): number {
  const base = baseHeight(x, y);
  let h = Math.max(base + mountainAt(x, y), base + mesaAt(x, y));
  for (const id of LOCATION_ORDER) {
    const l = locationPoint(id);
    const outer = PAD_RADIUS[id] ?? 7;
    const d = Math.hypot(x - l.x, y - l.y);
    if (d < outer) h = lerp(baseHeight(l.x, l.y), h, smoothstep(outer - 2.5, outer, d));
  }
  const toRiver = distanceToPolyline({ x, y }, RIVER_POINTS);
  if (toRiver < 3.6) h = lerp(-0.8, h, smoothstep(1.7, 3.6, toRiver));
  const toCreek = distanceToPolyline({ x, y }, CREEK_POINTS);
  if (toCreek < 1.8) h = lerp(-0.5, h, smoothstep(0.7, 1.8, toCreek));
  return h;
}

/** Heights on a regular grid, so objects can be placed without recomputing. */
export class HeightGrid {
  readonly size: number;
  readonly heights: Float32Array;

  constructor(size: number) {
    this.size = size;
    this.heights = new Float32Array((size + 1) * (size + 1));
    for (let j = 0; j <= size; j++) {
      for (let i = 0; i <= size; i++) this.heights[j * (size + 1) + i] = heightAt((i / size) * 100, (j / size) * 100);
    }
  }

  at(i: number, j: number): number {
    const n = this.size;
    return this.heights[Math.min(n, Math.max(0, j)) * (n + 1) + Math.min(n, Math.max(0, i))];
  }

  /** Bilinear height at a map position. */
  sample(x: number, y: number): number {
    const fx = (Math.min(100, Math.max(0, x)) / 100) * this.size;
    const fy = (Math.min(100, Math.max(0, y)) / 100) * this.size;
    const i = Math.min(this.size - 1, Math.floor(fx));
    const j = Math.min(this.size - 1, Math.floor(fy));
    const tx = fx - i;
    const ty = fy - j;
    const top = lerp(this.at(i, j), this.at(i + 1, j), tx);
    const bottom = lerp(this.at(i, j + 1), this.at(i + 1, j + 1), tx);
    return lerp(top, bottom, ty);
  }
}

const GROUND = {
  tan: new THREE.Color('#D6BB86'),
  grass: new THREE.Color('#8C9F58'),
  grassDark: new THREE.Color('#71854A'),
  sand: new THREE.Color('#E3B26E'),
  bank: new THREE.Color('#B9A07A'),
  rock: new THREE.Color('#978672'),
  rockDark: new THREE.Color('#766654'),
  snow: new THREE.Color('#F2EFE8'),
  mesaA: new THREE.Color('#C0673E'),
  mesaB: new THREE.Color('#A8522E'),
  mesaTop: new THREE.Color('#D08A5C'),
  earth: new THREE.Color('#5A3D26'),
  earthDark: new THREE.Color('#3E2A1A'),
};

function groundColor(x: number, y: number, h: number, up: number, out: THREE.Color): THREE.Color {
  if (h < 0.08) return out.copy(GROUND.bank);
  const mountain = mountainAt(x, y);
  if (mountain > 1.2) {
    if (h > 10.5 && up > 0.45) return out.copy(GROUND.snow);
    return out.copy(up < 0.72 ? GROUND.rockDark : GROUND.rock);
  }
  const mesa = mesaAt(x, y);
  if (mesa > 0.5) {
    if (up > 0.93 && mesa > 2.2) return out.copy(GROUND.mesaTop);
    return out.copy(Math.floor(h * 1.7) % 2 === 0 ? GROUND.mesaA : GROUND.mesaB);
  }
  const grass = smoothstep(1, 0.55, Math.hypot((x - 17) / 36, (y - 24) / 40));
  const desert = smoothstep(1, 0.5, Math.hypot((x - 86) / 44, (y - 90) / 44));
  out.copy(GROUND.tan);
  out.lerp(noise(x * 0.5, y * 0.5) > 0.5 ? GROUND.grass : GROUND.grassDark, grass);
  out.lerp(GROUND.sand, desert * 0.85);
  const jitter = 0.94 + noise(x * 1.7 + 40, y * 1.7) * 0.12;
  return out.multiplyScalar(jitter);
}

/** Faceted terrain mesh with one colour per triangle, plus the earthen sides. */
export function buildTerrain(grid: HeightGrid): THREE.Group {
  const n = grid.size;
  const step = 100 / n;
  const positions: number[] = [];
  const colors: number[] = [];
  const color = new THREE.Color();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();

  const pushTriangle = (p: THREE.Vector3, q: THREE.Vector3, r: THREE.Vector3) => {
    ab.subVectors(q, p);
    ac.subVectors(r, p);
    const normal = ab.cross(ac).normalize();
    const cx = (p.x + q.x + r.x) / 3 + 50;
    const cy = (p.z + q.z + r.z) / 3 + 50;
    const ch = (p.y + q.y + r.y) / 3;
    groundColor(cx, cy, ch, Math.abs(normal.y), color);
    for (const v of [p, q, r]) {
      positions.push(v.x, v.y, v.z);
      colors.push(color.r, color.g, color.b);
    }
  };

  const vertex = (i: number, j: number, out: THREE.Vector3) => out.set(i * step - 50, grid.at(i, j), j * step - 50);
  const d = new THREE.Vector3();
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      vertex(i, j, a);
      vertex(i + 1, j, b);
      vertex(i, j + 1, c);
      vertex(i + 1, j + 1, d);
      if ((i + j) % 2 === 0) {
        pushTriangle(a.clone(), c.clone(), b.clone());
        pushTriangle(b.clone(), c.clone(), d.clone());
      } else {
        pushTriangle(a.clone(), c.clone(), d.clone());
        pushTriangle(a.clone(), d.clone(), b.clone());
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const ground = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95, metalness: 0 }),
  );
  ground.receiveShadow = true;

  const group = new THREE.Group();
  group.add(ground, buildSides(grid));
  return group;
}

/** The cut edges of the diorama, in layers of earth. */
function buildSides(grid: HeightGrid): THREE.Mesh {
  const n = grid.size;
  const step = 100 / n;
  const bottom = -5;
  const positions: number[] = [];
  const colors: number[] = [];
  const edges: [number, number, number, number][] = [];
  for (let k = 0; k < n; k++) {
    edges.push([k, 0, k + 1, 0], [k + 1, n, k, n], [0, k + 1, 0, k], [n, k, n, k + 1]);
  }
  for (const [i1, j1, i2, j2] of edges) {
    const x1 = i1 * step - 50;
    const z1 = j1 * step - 50;
    const x2 = i2 * step - 50;
    const z2 = j2 * step - 50;
    const h1 = grid.at(i1, j1);
    const h2 = grid.at(i2, j2);
    const quad = [
      [x1, h1, z1],
      [x2, h2, z2],
      [x2, bottom, z2],
      [x1, h1, z1],
      [x2, bottom, z2],
      [x1, bottom, z1],
    ];
    for (const [x, y, z] of quad) {
      positions.push(x, y, z);
      const tone = y > -1.5 ? GROUND.earth : GROUND.earthDark;
      colors.push(tone.r, tone.g, tone.b);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, side: THREE.DoubleSide }),
  );
}

export function buildWater(): THREE.Mesh {
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.MeshStandardMaterial({ color: '#4E8DB6', roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.86 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.02;
  water.receiveShadow = true;
  return water;
}

/** A flat strip following a line of map points, draped over the ground. */
export function ribbon(grid: HeightGrid, points: Point[], width: number, lift: number, offset = 0): THREE.BufferGeometry {
  const positions: number[] = [];
  const left: THREE.Vector3[] = [];
  const right: THREE.Vector3[] = [];
  for (let i = 0; i < points.length; i++) {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length;
    const ny = dx / length;
    const p = points[i];
    const place = (side: number) => {
      const x = p.x + nx * (offset + side * width * 0.5);
      const y = p.y + ny * (offset + side * width * 0.5);
      return new THREE.Vector3(x - 50, Math.max(grid.sample(x, y), 0.05) + lift, y - 50);
    };
    left.push(place(-1));
    right.push(place(1));
  }
  for (let i = 1; i < points.length; i++) {
    const quad = [left[i - 1], right[i - 1], right[i], left[i - 1], right[i], left[i]];
    for (const v of quad) positions.push(v.x, v.y, v.z);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/** Evenly spaced points along a polyline. */
export function resample(points: Point[], spacing: number): Point[] {
  const out: Point[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / spacing));
    for (let s = 1; s <= steps; s++) out.push({ x: a.x + ((b.x - a.x) * s) / steps, y: a.y + ((b.y - a.y) * s) / steps });
  }
  return out;
}

export function buildRoads(grid: HeightGrid): THREE.Group {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: '#B8905E',
    roughness: 1,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  for (const [a, b, bend] of ROADS) {
    const road = new THREE.Mesh(ribbon(grid, resample(sampleRoad(a, b, bend, 40), 0.5), 1.1, 0.12), material);
    road.receiveShadow = true;
    group.add(road);
  }
  return group;
}

export function buildRailway(grid: HeightGrid): THREE.Group {
  const group = new THREE.Group();
  const points = resample(RAILROAD, 0.45);
  const railMaterial = new THREE.MeshStandardMaterial({ color: '#3A3430', roughness: 0.5, metalness: 0.6 });
  for (const side of [-0.42, 0.42]) {
    const rail = new THREE.Mesh(ribbon(grid, points, 0.14, 0.32, side), railMaterial);
    group.add(rail);
  }
  const ties = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.28, 0.14, 1.4),
    new THREE.MeshStandardMaterial({ color: '#5E3A1E', roughness: 1 }),
    Math.floor(points.length / 2),
  );
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  let count = 0;
  for (let i = 1; i < points.length - 1 && count < ties.count; i += 2) {
    const p = points[i];
    const angle = Math.atan2(points[i + 1].y - points[i - 1].y, points[i + 1].x - points[i - 1].x);
    quaternion.setFromAxisAngle(up, -angle);
    matrix.compose(new THREE.Vector3(p.x - 50, Math.max(grid.sample(p.x, p.y), 0.05) + 0.16, p.y - 50), quaternion, new THREE.Vector3(1, 1, 1));
    ties.setMatrixAt(count, matrix);
    count += 1;
  }
  ties.count = count;
  ties.receiveShadow = true;
  group.add(ties);
  return group;
}
