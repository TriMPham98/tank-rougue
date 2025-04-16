import { useState, useCallback } from "react";
import { SecondaryWeapon, WeaponSelectionState } from "../types";

const WEAPON_SELECTION_LEVELS = [10, 20, 30, 40];
const MAX_SELECTED_WEAPONS = 4;

export const useWeaponSelection = (currentLevel: number) => {
  const [selectedWeapons, setSelectedWeapons] = useState<SecondaryWeapon[]>([]);

  const canSelectWeapon = useCallback(() => {
    // Only allow selection at specific levels and ensure we don't exceed the maximum
    return (
      WEAPON_SELECTION_LEVELS.includes(currentLevel) &&
      selectedWeapons.length <
        Math.min(Math.floor(currentLevel / 10), MAX_SELECTED_WEAPONS) &&
      // Ensure we only add one weapon per level
      selectedWeapons.length === Math.floor((currentLevel - 1) / 10)
    );
  }, [currentLevel, selectedWeapons.length]);

  const selectWeapon = useCallback(
    (weapon: SecondaryWeapon) => {
      if (canSelectWeapon()) {
        // Create a new weapon instance with a unique instanceId
        const weaponInstance = {
          ...weapon,
          instanceId: Math.random().toString(36).substr(2, 9),
        };

        setSelectedWeapons((prev) => [...prev, weaponInstance]);
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
