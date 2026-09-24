// The player's figure on the 3D map: a cowboy, on horseback when a horse is
// equipped. Faces +x; animate() makes the legs move while travelling.

import * as THREE from 'three';

import type { ClassId } from '@/game';

const mat = (color: string) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true });

const OUTFITS: Record<ClassId, { shirt: string; hat: string }> = {
  gunslinger: { shirt: '#2F2A28', hat: '#1E1814' },
  rancher: { shirt: '#A63A2A', hat: '#C9A36B' },
  scout: { shirt: '#5E7440', hat: '#6B4A2B' },
  lawman: { shirt: '#56708F', hat: '#E6D8BC' },
};

const HORSES: Record<string, { coat: string; mane: string }> = {
  old_mule: { coat: '#8C7B6B', mane: '#4A3F36' },
  bay_horse: { coat: '#7A4A26', mane: '#1E1612' },
  mustang: { coat: '#B98A55', mane: '#4A3422' },
  arabian: { coat: '#ECE6DA', mane: '#A7A29A' },
};

function part(w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

/** A limb that swings around its top end. */
function limb(w: number, h: number, material: THREE.Material, x: number, y: number, z: number) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, z);
  const mesh = part(w, h, w, material, 0, -h / 2, 0);
  pivot.add(mesh);
  return pivot;
}

export interface Rider {
  root: THREE.Group;
  /** Moves the legs; `moving` is false while standing still. */
  animate: (time: number, moving: boolean) => void;
}

export function createRider(classId: ClassId, horseId: string | undefined): Rider {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const outfit = OUTFITS[classId];
  const shirt = mat(outfit.shirt);
  const hatMaterial = mat(outfit.hat);
  const skin = mat('#D9A77C');
  const pants = mat('#4A3B2E');
  const horseLook = horseId ? (HORSES[horseId] ?? HORSES.bay_horse) : null;
  const legs: THREE.Group[] = [];
  const humanLegs: THREE.Group[] = [];
  let seat = 0;

  if (horseLook) {
    const coat = mat(horseLook.coat);
    const mane = mat(horseLook.mane);
    body.add(part(1.35, 0.55, 0.5, coat, 0, 1.05, 0));
    const neck = part(0.36, 0.72, 0.32, coat, 0.62, 1.42, 0);
    neck.rotation.z = -0.55;
    body.add(neck);
    const head = part(0.6, 0.3, 0.3, coat, 0.95, 1.72, 0);
    head.rotation.z = -0.35;
    body.add(head);
    body.add(part(0.34, 0.5, 0.08, mane, 0.5, 1.55, 0));
    for (const z of [-0.08, 0.08]) body.add(part(0.08, 0.16, 0.06, coat, 0.8, 1.95, z));
    const tail = part(0.1, 0.62, 0.1, mane, -0.75, 1.0, 0);
    tail.rotation.z = 0.5;
    body.add(tail);
    for (const [x, z] of [[0.5, 0.17], [0.5, -0.17], [-0.5, 0.17], [-0.5, -0.17]]) {
      const leg = limb(0.15, 0.82, coat, x, 0.84, z);
      legs.push(leg);
      body.add(leg);
    }
    body.add(part(0.5, 0.08, 0.56, mat('#5E3A1A'), -0.05, 1.36, 0));
    seat = 1.36;
    for (const z of [-0.2, 0.2]) {
      const leg = part(0.13, 0.5, 0.13, pants, 0, seat - 0.05, z);
      leg.rotation.x = z > 0 ? -0.25 : 0.25;
      body.add(leg);
    }
  } else {
    for (const z of [-0.12, 0.12]) {
      const leg = limb(0.16, 0.72, pants, 0, 0.72, z);
      humanLegs.push(leg);
      body.add(leg);
    }
    seat = 0.72;
  }

  body.add(part(0.3, 0.55, 0.4, shirt, 0, seat + 0.32, 0));
  for (const z of [-0.23, 0.23]) {
    const arm = part(0.12, 0.42, 0.12, shirt, 0.12, seat + 0.35, z);
    arm.rotation.z = horseLook ? -0.8 : 0;
    body.add(arm);
  }
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), skin);
  head.position.set(0.02, seat + 0.78, 0);
  head.castShadow = true;
  body.add(head);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.04, 12), hatMaterial);
  brim.position.set(0.02, seat + 0.9, 0);
  brim.castShadow = true;
  body.add(brim);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.22, 10), hatMaterial);
  crown.position.set(0.02, seat + 1.02, 0);
  crown.castShadow = true;
  body.add(crown);

  const animate = (time: number, moving: boolean) => {
    if (horseLook) {
      const speed = 11;
      legs.forEach((leg, i) => {
        leg.rotation.z = moving ? Math.sin(time * speed + (i % 2 === 0 ? 0 : Math.PI) + (i > 1 ? 0.6 : 0)) * 0.65 : 0;
      });
      body.position.y = moving ? Math.abs(Math.sin(time * speed)) * 0.12 : Math.sin(time * 1.5) * 0.01;
    } else {
      humanLegs.forEach((leg, i) => {
        leg.rotation.z = moving ? Math.sin(time * 9 + i * Math.PI) * 0.6 : 0;
      });
      body.position.y = moving ? Math.abs(Math.sin(time * 9)) * 0.05 : 0;
    }
  };

  return { root, animate };
}
