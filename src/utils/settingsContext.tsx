import React, { createContext, useContext, useState, useEffect } from 'react';

interface SettingsContextType {
  masterVolume: number;
  soundEffectsVolume: number;
  setMasterVolume: (volume: number) => void;
  setSoundEffectsVolume: (volume: number) => void;
  getEffectiveVolume: (baseVolume: number) => number;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

interface SettingsProviderProps {
  children: React.ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  // Initialize with default values, but try to load from localStorage
  const [masterVolume, setMasterVolumeState] = useState(() => {
    const saved = localStorage.getItem('game-master-volume');
    return saved ? parseInt(saved, 10) : 50;
  });
  
  const [soundEffectsVolume, setSoundEffectsVolumeState] = useState(() => {
    const saved = localStorage.getItem('game-sound-effects-volume');
    return saved ? parseInt(saved, 10) : 75;
  });

  // Save to localStorage when values change
  useEffect(() => {
    localStorage.setItem('game-master-volume', masterVolume.toString());
  }, [masterVolume]);

  useEffect(() => {
    localStorage.setItem('game-sound-effects-volume', soundEffectsVolume.toString());
  }, [soundEffectsVolume]);

  const setMasterVolume = (volume: number) => {
    const clampedVolume = Math.max(0, Math.min(100, volume));
    setMasterVolumeState(clampedVolume);
  };

  const setSoundEffectsVolume = (volume: number) => {
    const clampedVolume = Math.max(0, Math.min(100, volume));
    setSoundEffectsVolumeState(clampedVolume);
  };

  // Calculate the effective volume by combining master volume and sound effects volume
  const getEffectiveVolume = (baseVolume: number) => {
    const masterMultiplier = masterVolume / 100;
    const effectsMultiplier = soundEffectsVolume / 100;
    return baseVolume * masterMultiplier * effectsMultiplier;
  };

  return (
    <SettingsContext.Provider
      value={{
        masterVolume,
        soundEffectsVolume,
        setMasterVolume,
        setSoundEffectsVolume,
        getEffectiveVolume,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}; 