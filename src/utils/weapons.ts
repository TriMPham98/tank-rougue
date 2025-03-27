import { SecondaryWeapon } from "./gameState";

export const availableWeapons: SecondaryWeapon[] = [
  {
    id: "rocket",
    name: "Rocket Launcher",
    description:
      "Fires powerful rockets that deal high damage and have a large explosion radius.",
    damage: 50,
    cooldown: 3,
    range: 30,
    projectileSpeed: 20,
  },
  {
    id: "laser",
    name: "Laser Cannon",
    description:
      "Fires instant laser beams that deal moderate damage with no travel time.",
    damage: 35,
    cooldown: 1.5,
    range: 40,
    projectileSpeed: 100,
  },
  {
    id: "shotgun",
    name: "Shotgun",
    description:
      "Fires a spread of pellets that deal high damage at close range.",
    damage: 40,
    cooldown: 2,
    range: 15,
    projectileSpeed: 25,
  },
  {
    id: "sniper",
    name: "Sniper Rifle",
    description:
      "Fires high-damage bullets with excellent range but slow fire rate.",
    damage: 60,
    cooldown: 4,
    range: 50,
    projectileSpeed: 35,
  },
];
