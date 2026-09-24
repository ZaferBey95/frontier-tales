// Low-poly models built from simple shapes: trees, cacti, rocks and one small
// scene for every location on the map.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

import { LOCATION_ORDER, type LocationId } from '@/game';
import { createRng } from '@/game/rng';

import { CACTI, RAILROAD, RIVER, ROADS, TREES, distanceToPolyline, locationPoint, sampleBeziers, sampleRoad, type Point } from '../map-data';
import { mountainAt, mesaAt, noise, smoothstep, type HeightGrid } from './terrain';

const mat = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, flatShading: true, ...extra });

/** Shared materials. Windows and flames glow at night. */
export function createMaterials() {
  return {
    wood: mat('#8B5A2B'),
    woodDark: mat('#5E3A1A'),
    woodLight: mat('#B98550'),
    plank: mat('#C49A64'),
    wallWhite: mat('#E8DDC6'),
    wallOchre: mat('#D2A45E'),
    wallBlue: mat('#7C93A8'),
    barnRed: mat('#A63A2A'),
    roofRed: mat('#7E2E1B'),
    roofDark: mat('#4E362A'),
    roofGreen: mat('#4F6B4A'),
    stone: mat('#8E8577'),
    darkStone: mat('#5B544B'),
    metal: mat('#2F2B29', { metalness: 0.6, roughness: 0.4 }),
    wheelRed: mat('#8E2A1A'),
    canvas: mat('#E6D8B8'),
    hay: mat('#D9B85C'),
    cowWhite: mat('#F0EDE6'),
    cowBlack: mat('#2A2522'),
    hole: mat('#140E0A'),
    gold: mat('#F2C14E', { emissive: '#8A5A00', emissiveIntensity: 0.25, metalness: 0.5, roughness: 0.4 }),
    window: mat('#3A2A1A', { emissive: '#FFB547', emissiveIntensity: 0 }),
    flame: mat('#FF8A2A', { emissive: '#FF6A00', emissiveIntensity: 1.6 }),
  };
}

export type Materials = ReturnType<typeof createMaterials>;

function place(object: THREE.Object3D, x: number, y: number, z: number, rotation = 0): THREE.Object3D {
  object.position.set(x, y, z);
  object.rotation.y = rotation;
  object.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return object;
}

/** A box resting on y. */
function box(w: number, h: number, d: number, material: THREE.Material, x = 0, y = 0, z = 0, rotation = 0) {
  return place(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material), x, y + h / 2, z, rotation);
}

function cylinder(rTop: number, rBottom: number, h: number, material: THREE.Material, x = 0, y = 0, z = 0, segments = 8) {
  return place(new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, segments), material), x, y + h / 2, z);
}

/** A triangular roof along the z axis, resting on y. */
function roofGeometry(w: number, h: number, d: number): THREE.BufferGeometry {
  const x = w / 2;
  const z = d / 2;
  const v = [
    [-x, 0, -z], [x, 0, -z], [0, h, -z],
    [-x, 0, z], [x, 0, z], [0, h, z],
  ];
  const faces = [
    [0, 2, 1], [3, 4, 5],
    [0, 3, 5], [0, 5, 2],
    [1, 2, 5], [1, 5, 4],
    [0, 1, 4], [0, 4, 3],
  ];
  const positions: number[] = [];
  for (const face of faces) for (const index of face) positions.push(...v[index]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function roof(w: number, h: number, d: number, material: THREE.Material, x = 0, y = 0, z = 0, rotation = 0) {
  (material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  return place(new THREE.Mesh(roofGeometry(w, h, d), material), x, y, z, rotation);
}

interface BuildingOptions {
  w: number;
  d: number;
  h: number;
  wall: THREE.Material;
  roofMaterial: THREE.Material;
  gable?: boolean;
  falseFront?: number;
  windows?: number;
  porch?: boolean;
}

/** A western building facing +z: walls, roof, door, windows, maybe a false front. */
function building(m: Materials, options: BuildingOptions): THREE.Group {
  const { w, d, h, wall, roofMaterial, gable = true, falseFront = 0, windows = 2, porch = false } = options;
  const group = new THREE.Group();
  group.add(box(w, h, d, wall));
  if (gable) group.add(roof(w + 0.4, h * 0.45, d + 0.4, roofMaterial, 0, h, 0, Math.PI / 2));
  else group.add(box(w + 0.3, 0.2, d + 0.3, roofMaterial, 0, h, 0));
  if (falseFront > 0) {
    group.add(box(w + 0.2, h + falseFront, 0.22, wall, 0, 0, d / 2 + 0.05));
    group.add(box(w + 0.4, 0.18, 0.34, m.woodDark, 0, h + falseFront, d / 2 + 0.05));
  }
  const front = d / 2 + (falseFront > 0 ? 0.18 : 0.02);
  group.add(box(0.7, 1.25, 0.08, m.woodDark, 0, 0, front));
  const windowXs = windows === 1 ? [-w * 0.28] : windows >= 2 ? [-w * 0.3, w * 0.3] : [];
  for (const x of windowXs) {
    group.add(box(0.5, 0.55, 0.08, m.window, x, h * 0.45, front));
    if (h > 3) group.add(box(0.5, 0.55, 0.08, m.window, x, h * 0.72, front));
  }
  if (porch) {
    group.add(box(w + 0.2, 0.12, 1.1, m.plank, 0, h * 0.55, d / 2 + 0.7));
    for (const x of [-w / 2, w / 2]) group.add(box(0.12, h * 0.55, 0.12, m.woodDark, x, 0, d / 2 + 1.2));
  }
  return group;
}

function waterTower(m: Materials): THREE.Group {
  const group = new THREE.Group();
  for (const [x, z] of [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]]) group.add(box(0.14, 2.6, 0.14, m.woodDark, x, 0, z));
  group.add(cylinder(1.05, 1.05, 1.5, m.wood, 0, 2.6, 0, 10));
  group.add(place(new THREE.Mesh(new THREE.ConeGeometry(1.2, 0.6, 10), m.roofDark), 0, 4.4, 0));
  return group;
}

function wheel(material: THREE.Material, radius: number, x: number, y: number, z: number) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.12, 10), material);
  mesh.rotation.x = Math.PI / 2;
  const holder = new THREE.Group();
  holder.add(mesh);
  return place(holder, x, y, z);
}

function campfire(m: Materials): THREE.Group {
  const group = new THREE.Group();
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    group.add(place(new THREE.Mesh(new THREE.DodecahedronGeometry(0.22), m.stone), Math.cos(a) * 0.7, 0.12, Math.sin(a) * 0.7));
  }
  for (const r of [0, Math.PI / 2]) group.add(box(1.1, 0.16, 0.16, m.woodDark, 0, 0.05, 0, r));
  const flame = place(new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.9, 6), m.flame), 0, 0.55, 0);
  flame.name = 'flame';
  group.add(flame);
  return group;
}

function tent(m: Materials): THREE.Group {
  const group = new THREE.Group();
  group.add(roof(1.8, 1.4, 2.2, m.canvas, 0, 0, 0));
  return group;
}

function cow(m: Materials): THREE.Group {
  const group = new THREE.Group();
  group.add(box(1.1, 0.55, 0.5, m.cowWhite, 0, 0.45, 0));
  group.add(box(0.45, 0.35, 0.38, m.cowBlack, 0.12, 0.62, 0));
  group.add(box(0.38, 0.34, 0.32, m.cowWhite, 0.68, 0.72, 0));
  for (const [x, z] of [[-0.38, -0.16], [0.38, -0.16], [-0.38, 0.16], [0.38, 0.16]]) group.add(box(0.12, 0.45, 0.12, m.cowBlack, x, 0, z));
  return group;
}

function town(m: Materials): THREE.Group {
  const group = new THREE.Group();
  group.add(place(building(m, { w: 4.4, d: 3.6, h: 3.2, wall: m.wood, roofMaterial: m.roofDark, gable: false, falseFront: 1.3, windows: 2, porch: true }), 0, 0, -2.6));
  group.add(place(building(m, { w: 3, d: 2.8, h: 2.3, wall: m.wallOchre, roofMaterial: m.roofRed, falseFront: 0.9, windows: 2 }), -4.6, 0, -2.3));
  group.add(place(building(m, { w: 3.2, d: 3, h: 3.4, wall: m.wallWhite, roofMaterial: m.roofGreen, windows: 2 }), 4.8, 0, -2.4));
  group.add(place(building(m, { w: 2.8, d: 2.6, h: 2.1, wall: m.woodLight, roofMaterial: m.roofDark, gable: false, falseFront: 0.7, windows: 1 }), -3.4, 0, 3.4, Math.PI));
  const church = building(m, { w: 2.6, d: 3.6, h: 2.6, wall: m.wallWhite, roofMaterial: m.roofDark, windows: 1 });
  church.add(box(1, 2.2, 1, m.wallWhite, 0, 2.6, 1.2));
  church.add(place(new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.6, 4), m.roofDark), 0, 5.6, 1.2, Math.PI / 4));
  group.add(place(church, 3.6, 0, 3.8, Math.PI));
  group.add(place(waterTower(m), -7.2, 0, 1.2));
  for (const x of [-1.4, 1.4]) group.add(box(1.2, 0.12, 0.3, m.woodDark, x, 0.6, -0.15));
  return group;
}

function ranch(m: Materials): THREE.Group {
  const group = new THREE.Group();
  const barn = building(m, { w: 3.8, d: 4.6, h: 2.8, wall: m.barnRed, roofMaterial: m.roofDark, windows: 0 });
  barn.add(box(1.6, 1.9, 0.08, m.wallWhite, 0, 0, 2.34));
  group.add(place(barn, -1.5, 0, -1.8));
  group.add(cylinder(0.95, 0.95, 4.4, m.wallWhite, 1.6, 0, -2.6, 10));
  group.add(place(new THREE.Mesh(new THREE.SphereGeometry(0.95, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), m.roofRed), 1.6, 4.4, -2.6));
  const house = building(m, { w: 3, d: 2.4, h: 2, wall: m.wallWhite, roofMaterial: m.roofRed, windows: 2, porch: true });
  group.add(place(house, -4.8, 0, 2.2, Math.PI / 5));
  const pen = new THREE.Group();
  const corners: [number, number][] = [[0, 0], [5, 0], [5, 3.6], [0, 3.6]];
  for (let i = 0; i < corners.length; i++) {
    const [x1, z1] = corners[i];
    const [x2, z2] = corners[(i + 1) % corners.length];
    const length = Math.hypot(x2 - x1, z2 - z1);
    const angle = -Math.atan2(z2 - z1, x2 - x1);
    for (let s = 0; s <= Math.round(length / 1.2); s++) {
      const t = s / Math.round(length / 1.2);
      pen.add(box(0.12, 0.8, 0.12, m.woodDark, x1 + (x2 - x1) * t, 0, z1 + (z2 - z1) * t));
    }
    for (const y of [0.35, 0.65]) pen.add(box(length, 0.08, 0.06, m.wood, (x1 + x2) / 2, y, (z1 + z2) / 2, angle));
  }
  pen.add(place(cow(m), 1.4, 0, 1.2, 0.4));
  pen.add(place(cow(m), 3.4, 0, 2.3, -2.2));
  group.add(place(pen, 1.2, 0, 0.8));
  group.add(place(cylinder(0.45, 0.45, 0.8, m.hay, 0, 0, 0), -3.6, 0, -0.9));
  return group;
}

function forest(m: Materials): THREE.Group {
  const group = new THREE.Group();
  group.add(place(building(m, { w: 3, d: 2.6, h: 1.9, wall: m.wood, roofMaterial: m.roofDark, windows: 1 }), 0, 0, -0.6));
  const logs = new THREE.Group();
  const logRows: [number, number, number][] = [[-0.45, 0.22, 0], [0, 0.22, 0], [0.45, 0.22, 0], [-0.22, 0.6, 0], [0.22, 0.6, 0]];
  for (const [x, y, z] of logRows) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 2.2, 7), m.woodLight);
    log.rotation.x = Math.PI / 2;
    const holder = new THREE.Group();
    holder.add(log);
    logs.add(place(holder, x, y, z));
  }
  group.add(place(logs, 2.8, 0, 1.4, 0.3));
  group.add(cylinder(0.4, 0.45, 0.5, m.woodLight, -2.4, 0, 1.6));
  return group;
}

function riverCamp(m: Materials, grid: HeightGrid): THREE.Group {
  const group = new THREE.Group();
  const here = locationPoint('river');
  const nearest = sampleBeziers(RIVER, 60).reduce((best, p) =>
    Math.hypot(p.x - here.x, p.y - here.y) < Math.hypot(best.x - here.x, best.y - here.y) ? p : best,
  );
  const angle = Math.atan2(nearest.y - here.y, nearest.x - here.x);
  const baseY = grid.sample(here.x, here.y);
  const dock = new THREE.Group();
  dock.add(box(5.2, 0.14, 1.4, m.plank, 2.6, 0, 0));
  for (const x of [1.2, 2.8, 4.4]) for (const z of [-0.6, 0.6]) dock.add(box(0.14, 1.6, 0.14, m.woodDark, x, -1.5, z));
  group.add(place(dock, 0, 0.1, 0, -angle));
  const raft = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.8, 6), m.woodLight);
    log.rotation.x = Math.PI / 2;
    const holder = new THREE.Group();
    holder.add(log);
    raft.add(place(holder, i * 0.33 - 0.66, 0, 0));
  }
  const tip = { x: Math.cos(angle) * 5.8, z: Math.sin(angle) * 5.8 };
  group.add(place(raft, tip.x + 1.2, -baseY + 0.12, tip.z + 0.8, -angle + 0.4));
  group.add(place(tent(m), -2.4, 0, -1.6, 0.5));
  group.add(place(campfire(m), -0.6, 0, 2.2));
  return group;
}

function mine(m: Materials): THREE.Group {
  const group = new THREE.Group();
  const mound = new THREE.Mesh(new THREE.DodecahedronGeometry(3.4, 0), m.darkStone);
  mound.scale.set(1.3, 0.85, 1);
  group.add(place(mound, 0, 1.2, -4.2));
  group.add(box(1.6, 1.9, 1.2, m.hole, 0, 0, -0.5));
  group.add(box(0.22, 2.2, 0.22, m.wood, -0.95, 0, 0.15));
  group.add(box(0.22, 2.2, 0.22, m.wood, 0.95, 0, 0.15));
  group.add(box(2.4, 0.26, 0.3, m.wood, 0, 2.1, 0.15));
  const cart = new THREE.Group();
  cart.add(box(1.2, 0.7, 0.9, m.metal, 0, 0.3, 0));
  cart.add(place(new THREE.Mesh(new THREE.DodecahedronGeometry(0.42), m.gold), 0, 1.05, 0));
  for (const x of [-0.4, 0.4]) for (const z of [-0.5, 0.5]) cart.add(wheel(m.metal, 0.22, x, 0.2, z));
  group.add(place(cart, 0.4, 0, 1.8, 0.3));
  for (const [x, z, r] of [[2.6, 0.8, 0.5], [3.2, 1.6, 0.4], [2.2, 1.8, 0.35]] as const) {
    group.add(place(new THREE.Mesh(new THREE.DodecahedronGeometry(r), m.stone), x, r * 0.6, z));
  }
  const frame = new THREE.Group();
  for (const x of [-0.9, 0.9]) {
    const leg = box(0.16, 4.2, 0.16, m.woodDark, x, 0, 0);
    leg.rotation.z = x > 0 ? 0.18 : -0.18;
    frame.add(leg);
  }
  frame.add(box(1.4, 0.16, 0.2, m.woodDark, 0, 3.9, 0));
  const pulley = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.08, 6, 12), m.metal);
  frame.add(place(pulley, 0, 4.3, 0));
  group.add(place(frame, -3.2, 0, 0.6));
  return group;
}

function locomotive(m: Materials): THREE.Group {
  const group = new THREE.Group();
  const boiler = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 2.6, 10), m.metal);
  boiler.rotation.z = Math.PI / 2;
  const boilerHolder = new THREE.Group();
  boilerHolder.add(boiler);
  group.add(place(boilerHolder, 0.4, 1.15, 0));
  group.add(cylinder(0.38, 0.2, 0.9, m.metal, 1.3, 1.5, 0, 8));
  group.add(box(1.2, 1.5, 1.25, m.wheelRed, -1.3, 0.5, 0));
  group.add(box(1.5, 0.14, 1.45, m.roofDark, -1.3, 2, 0));
  group.add(box(3.8, 0.3, 1.2, m.woodDark, 0, 0.3, 0));
  for (const x of [-1.2, 0, 1.1]) for (const z of [-0.62, 0.62]) group.add(wheel(m.wheelRed, 0.36, x, 0.36, z));
  const car = new THREE.Group();
  car.add(box(3, 1.4, 1.3, m.wood, 0, 0.5, 0));
  car.add(box(3.2, 0.12, 1.45, m.roofDark, 0, 1.9, 0));
  for (const x of [-1, 1]) for (const z of [-0.62, 0.62]) car.add(wheel(m.metal, 0.3, x, 0.3, z));
  group.add(place(car, -4, 0, 0));
  return group;
}

function railroad(m: Materials): THREE.Group {
  const group = new THREE.Group();
  const station = building(m, { w: 3.4, d: 2.4, h: 2.3, wall: m.wallOchre, roofMaterial: m.roofRed, windows: 2 });
  group.add(place(station, -3.2, 0, 2.6, Math.PI * 0.85));
  group.add(place(waterTower(m), -4.6, 0, -2.2));
  return group;
}

function canyonCamp(m: Materials): THREE.Group {
  const group = new THREE.Group();
  group.add(place(tent(m), -2.2, 0, -1, 0.3));
  group.add(place(tent(m), 1.8, 0, -1.8, -0.5));
  group.add(place(campfire(m), 0, 0, 1));
  const wagon = new THREE.Group();
  wagon.add(box(2.4, 0.8, 1.3, m.wood, 0, 0.5, 0));
  const cover = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 2.3, 10, 1, false, 0, Math.PI), m.canvas);
  cover.rotation.z = Math.PI / 2;
  const coverHolder = new THREE.Group();
  coverHolder.add(cover);
  wagon.add(place(coverHolder, 0, 1.3, 0));
  for (const x of [-0.8, 0.8]) for (const z of [-0.7, 0.7]) wagon.add(wheel(m.woodDark, 0.45, x, 0.45, z));
  group.add(place(wagon, 3.6, 0, 1.6, 2.2));
  return group;
}

export interface Landmark {
  id: LocationId;
  group: THREE.Group;
  /** Height above the ground where the label sits. */
  labelHeight: number;
}

export function buildLandmarks(m: Materials, grid: HeightGrid): Landmark[] {
  const builders: Record<LocationId, () => THREE.Group> = {
    town: () => town(m),
    ranch: () => ranch(m),
    forest: () => forest(m),
    river: () => riverCamp(m, grid),
    mine: () => mine(m),
    railroad: () => railroad(m),
    canyon: () => canyonCamp(m),
  };
  const heights: Record<LocationId, number> = { town: 7.5, ranch: 6.5, forest: 5, river: 4, mine: 7, railroad: 6.5, canyon: 4.5 };
  return LOCATION_ORDER.map((id) => {
    const p = locationPoint(id);
    const group = builders[id]();
    group.position.set(p.x - 50, grid.sample(p.x, p.y), p.y - 50);
    group.userData.locationId = id;
    group.traverse((child) => {
      child.userData.locationId = id;
    });
    return { id, group, labelHeight: heights[id] };
  });
}

/** The locomotive stands at the end of the line, pointing along the track. */
export function buildTrain(m: Materials, grid: HeightGrid): THREE.Object3D {
  const [a, b] = [RAILROAD[1], RAILROAD[2]];
  const angle = Math.atan2(a.y - b.y, a.x - b.x);
  const at = { x: b.x + (a.x - b.x) * 0.45, y: b.y + (a.y - b.y) * 0.45 };
  const train = locomotive(m);
  train.position.set(at.x - 50, grid.sample(at.x, at.y) + 0.35, at.y - 50);
  train.rotation.y = -angle;
  train.traverse((child) => {
    child.userData.locationId = 'railroad';
  });
  return train;
}

function pineGeometry(): THREE.BufferGeometry {
  const trunk = new THREE.CylinderGeometry(0.12, 0.16, 0.6, 5).translate(0, 0.3, 0);
  const layers = [
    new THREE.ConeGeometry(0.95, 1.3, 7).translate(0, 1.05, 0),
    new THREE.ConeGeometry(0.72, 1.1, 7).translate(0, 1.65, 0),
    new THREE.ConeGeometry(0.46, 0.9, 7).translate(0, 2.2, 0),
  ];
  const colorize = (geometry: THREE.BufferGeometry, hex: string) => {
    const color = new THREE.Color(hex);
    const count = geometry.getAttribute('position').count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) colors.set([color.r, color.g, color.b], i * 3);
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geometry.toNonIndexed();
  };
  return mergeGeometries([colorize(trunk, '#5B3B22'), ...layers.map((layer, i) => colorize(layer, ['#4F6B3A', '#56743F', '#5E7E45'][i]))])!;
}

function cactusGeometry(): THREE.BufferGeometry {
  const parts = [
    new THREE.CylinderGeometry(0.2, 0.24, 1.9, 7).translate(0, 0.95, 0),
    new THREE.CylinderGeometry(0.13, 0.13, 0.55, 6).rotateZ(Math.PI / 2).translate(0.32, 0.85, 0),
    new THREE.CylinderGeometry(0.13, 0.13, 0.6, 6).translate(0.55, 1.1, 0),
    new THREE.CylinderGeometry(0.12, 0.12, 0.45, 6).rotateZ(Math.PI / 2).translate(-0.28, 1.15, 0),
    new THREE.CylinderGeometry(0.12, 0.12, 0.5, 6).translate(-0.47, 1.38, 0),
  ];
  return mergeGeometries(parts.map((part) => part.toNonIndexed()))!;
}

function scatter(
  grid: HeightGrid,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  spots: (Point & { size: number })[],
  scale: number,
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geometry, material, spots.length);
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const rng = createRng(21);
  spots.forEach((spot, i) => {
    quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rng() * Math.PI * 2);
    const s = spot.size * scale;
    matrix.compose(new THREE.Vector3(spot.x - 50, grid.sample(spot.x, spot.y) - 0.05, spot.y - 50), quaternion, new THREE.Vector3(s, s, s));
    mesh.setMatrixAt(i, matrix);
  });
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

const ROAD_LINES = ROADS.map(([a, b, bend]) => sampleRoad(a, b, bend, 24));
const RIVER_LINE = sampleBeziers(RIVER, 40);

function clearSpot(p: Point, clearance: number): boolean {
  if (p.x < 2 || p.x > 98 || p.y < 2 || p.y > 98) return false;
  for (const id of LOCATION_ORDER) {
    const l = locationPoint(id);
    if (Math.hypot(p.x - l.x, p.y - l.y) < (id === 'town' ? 11 : 7.5)) return false;
  }
  if (ROAD_LINES.some((line) => distanceToPolyline(p, line) < clearance)) return false;
  if (distanceToPolyline(p, RIVER_LINE) < clearance + 2.5) return false;
  if (distanceToPolyline(p, RAILROAD) < clearance) return false;
  return true;
}

export function buildVegetation(grid: HeightGrid): THREE.Group {
  const group = new THREE.Group();
  const rng = createRng(33);
  const pines: (Point & { size: number })[] = TREES.filter((tree) => clearSpot(tree, 1.2));
  for (let tries = 0; tries < 900 && pines.length < 150; tries++) {
    const p = { x: rng() * 100, y: rng() * 100 };
    const grass = smoothstep(1, 0.5, Math.hypot((p.x - 16) / 34, (p.y - 22) / 36));
    if (rng() > grass || mountainAt(p.x, p.y) > 0.5 || !clearSpot(p, 1.4)) continue;
    pines.push({ ...p, size: 1.9 + rng() * 1.3 });
  }
  const cacti: (Point & { size: number })[] = CACTI.filter((c) => clearSpot(c, 1.2));
  for (let tries = 0; tries < 900 && cacti.length < 40; tries++) {
    const p = { x: rng() * 100, y: rng() * 100 };
    const desert = smoothstep(1, 0.45, Math.hypot((p.x - 80) / 46, (p.y - 80) / 46));
    if (rng() > desert || mesaAt(p.x, p.y) > 0.3 || mountainAt(p.x, p.y) > 0.3 || !clearSpot(p, 1.2)) continue;
    cacti.push({ ...p, size: 3 + rng() * 1.6 });
  }
  const rocks: (Point & { size: number })[] = [];
  for (let tries = 0; tries < 600 && rocks.length < 26; tries++) {
    const p = { x: rng() * 100, y: rng() * 100 };
    if (noise(p.x * 0.3, p.y * 0.3) < 0.55 || !clearSpot(p, 1)) continue;
    rocks.push({ ...p, size: 0.4 + rng() * 0.7 });
  }
  group.add(
    scatter(grid, pineGeometry(), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 }), pines, 0.62),
    scatter(grid, cactusGeometry(), mat('#5E7E45'), cacti, 0.34),
    scatter(grid, new THREE.DodecahedronGeometry(1, 0), mat('#9A8B78'), rocks, 1),
  );
  return group;
}
