import { SecondaryWeapon } from "./gameState";

export const availableWeapons: SecondaryWeapon[] = [
  {
    id: "rocket",
    name: "MK-19",
    description:
      "Fires grenades that deal high damage and have a large explosion radius.",
    damage: 75,
    cooldown: 7,
    range: 30,
    projectileSpeed: 20,
  },
  {
    id: "laser",
    name: "Laser Cannon",
    description:
      "Fires instant laser beams that deal moderate damage with no travel time.",
    damage: 30,
    cooldown: 0.5,
    range: 40,
    projectileSpeed: 100,
  },
  {
    id: "shotgun",
    name: "Shotgun",
    description:
      "Fires a spread of pellets that deal high damage at close range.",
    damage: 100,
    cooldown: 1.5,
    range: 15,
    projectileSpeed: 25,
  },
  {
    id: "sniper",
    name: "Sniper Rifle",
    description:
      "Fires high-damage bullets with excellent range but slow fire rate.",
    damage: 200,
    cooldown: 5,
    range: 50,
    projectileSpeed: 35,
  },
];
