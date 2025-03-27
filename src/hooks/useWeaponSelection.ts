import { useState, useCallback } from "react";
import { SecondaryWeapon, WeaponSelectionState } from "../types";

const WEAPON_SELECTION_LEVELS = [5, 10, 15];
const MAX_SELECTED_WEAPONS = 3;

export const useWeaponSelection = (currentLevel: number) => {
  const [selectedWeapons, setSelectedWeapons] = useState<SecondaryWeapon[]>([]);

  const canSelectWeapon = useCallback(() => {
    return (
      WEAPON_SELECTION_LEVELS.includes(currentLevel) &&
      selectedWeapons.length < MAX_SELECTED_WEAPONS
    );
  }, [currentLevel, selectedWeapons.length]);

  const selectWeapon = useCallback(
    (weapon: SecondaryWeapon) => {
      if (canSelectWeapon()) {
        setSelectedWeapons((prev) => [...prev, weapon]);
      }
    },
    [canSelectWeapon]
  );

  const getWeaponSelectionState = useCallback((): WeaponSelectionState => {
    return {
      availableWeapons: [], // This will be populated with actual weapons later
      selectedWeapons,
      level: currentLevel,
      canSelect: canSelectWeapon(),
    };
  }, [selectedWeapons, currentLevel, canSelectWeapon]);

  return {
    selectedWeapons,
    selectWeapon,
    getWeaponSelectionState,
    canSelectWeapon,
  };
};
