import { createContext, useContext, useEffect, useState } from 'react';
import { settingsAPI } from '../services/api';

const SettingsContext = createContext({ seasonName: '2024/25', reload: () => {} });

export function SettingsProvider({ children }) {
  const [seasonName, setSeasonName] = useState('2024/25');

  const load = () => {
    settingsAPI.getAll()
      .then((res) => {
        if (res.data.season_name) setSeasonName(res.data.season_name);
      })
      .catch(() => {}); // silently fall back to default
  };

  useEffect(() => { load(); }, []);

  return (
    <SettingsContext.Provider value={{ seasonName, reload: load }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
