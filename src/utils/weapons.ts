import { SecondaryWeapon } from "./gameState";

export const availableWeapons: SecondaryWeapon[] = [
  {
    id: "rocket",
    name: "Mortar",
    description:
      "Fires shells that deal high damage and have a large explosion radius.",
    damage: 75,
    cooldown: 7,
    range: 20,
    projectileSpeed: 20,
  },
  {
    id: "laser",
    name: "Laser Cannon",
    description:
      "Fires instant laser beams that deal moderate damage with no travel time.",
    damage: 150,
    cooldown: 1.5,
    range: 15,
    projectileSpeed: 100,
  },
  {
    id: "shotgun",
    name: "Shotgun",
    description:
      "Fires a spread of pellets that deal high damage at close range.",
    damage: 200,
    cooldown: 1.25,
    range: 25,
    projectileSpeed: 30,
  },
  {
    id: "sniper",
    name: "Sniper Rifle",
    description:
      "Fires high-damage bullets with excellent range but slow fire rate.",
    damage: 350,
    cooldown: 2.5,
    range: 50,
    projectileSpeed: 50,
  },
];
