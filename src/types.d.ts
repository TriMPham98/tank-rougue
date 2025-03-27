// Declare missing module types
declare module "../models/PowerUpItem" {
  import { PowerUp } from "./utils/gameState";

  interface PowerUpItemProps {
    powerUp: PowerUp;
  }

  const PowerUpItem: React.FC<PowerUpItemProps>;
  export default PowerUpItem;
}

declare module "../models/Ground" {
  const Ground: React.FC;
  export default Ground;
}

export interface SecondaryWeapon {
  id: string;
  name: string;
  description: string;
  damage: number;
  cooldown: number;
  range: number;
  projectileSpeed: number;
}

export interface WeaponSelectionState {
  availableWeapons: SecondaryWeapon[];
  selectedWeapons: SecondaryWeapon[];
  level: number;
  canSelect: boolean;
}

export interface WeaponSelectionProps {
  onWeaponSelect: (weapon: SecondaryWeapon) => void;
  onClose: () => void;
  state: WeaponSelectionState;
}
