import React, { createContext, useContext, useEffect, useState } from 'react';
import { powersync, setupPowerSync } from './System';
import { PowerSyncContext } from '@powersync/react-native';

const PowerSyncInstanceContext = createContext<{ url: string | null; setUrl: (url: string) => void }>({
  url: null,
  setUrl: () => {}
});

export const usePowerSyncInstance = () => useContext(PowerSyncInstanceContext);

export const PowerSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [url, setUrl] = useState<string | null>('https://6a648f9b91ecf2aec48d5093.powersync.journeyapps.com');

  useEffect(() => {
    if (url) {
      setupPowerSync(url);
    }
  }, [url]);

  return (
    <PowerSyncInstanceContext.Provider value={{ url, setUrl }}>
      <PowerSyncContext.Provider value={powersync}>
        {children}
      </PowerSyncContext.Provider>
    </PowerSyncInstanceContext.Provider>
  );
};
