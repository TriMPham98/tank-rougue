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
