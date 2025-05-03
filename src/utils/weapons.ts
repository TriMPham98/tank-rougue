// Consolidated weapon types and instances

export interface WeaponInstance {
  id: string;
  instanceId?: string;
  name: string;
  description: string;
  damage: number;
  cooldown: number;
  range: number;
  projectileSpeed: number;
}

export type SecondaryWeapon = WeaponInstance;

export const availableWeapons: SecondaryWeapon[] = [
  {
    id: "rocket",
    name: "Mortar",
    description:
      "Fires shells that deal high damage and have a large explosion radius.",
    damage: 150,
    cooldown: 5,
    range: 20,
    projectileSpeed: 1,
  },
  {
    id: "laser",
    name: "Laser Cannon",
    description:
      "Fires instant laser beams that deal moderate damage with no travel time.",
    damage: 200,
    cooldown: 1.5,
    range: 15,
    projectileSpeed: 100,
  },
  {
    id: "shotgun",
    name: "Shotgun",
    description:
      "Fires a spread of pellets that deal high damage at close range.",
    damage: 275,
    cooldown: 1.25,
    range: 25,
    projectileSpeed: 30,
  },
  {
    id: "sniper",
    name: "Sniper Rifle",
    description:
      "Fires penetrating bullets with excellent range but slow fire rate.",
    damage: 350,
    cooldown: 3.0,
    range: 50,
    projectileSpeed: 50,
  },
  {
    id: "tesla",
    name: "Tesla Coil",
    description: "Emits electricity that chains between nearby enemies.",
    damage: 125,
    cooldown: 1.0,
    range: 7.5,
    projectileSpeed: 80,
  },
];
