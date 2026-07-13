import React, { createContext, useContext, useState, ReactNode } from "react";

interface AppState {
  user: {
    name: string;
    avatar: string;
    role: string;
  };
  notifications: number;
  setUser: (user: AppState["user"]) => void;
  setNotifications: (count: number) => void;
}

const defaultUser = {
  name: "Sophie Laurent",
  avatar: "SL",
  role: "Éditeur",
};

const AppStateContext = createContext<AppState | undefined>(undefined);

export const AppStateProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState(defaultUser);
  const [notifications, setNotifications] = useState(3);

  return (
    <AppStateContext.Provider
      value={{
        user,
        notifications,
        setUser,
        setNotifications,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
};

export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error("useAppState must be used within an AppStateProvider");
  }
  return context;
};