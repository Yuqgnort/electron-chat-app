import { TBootstrapReturn } from "@/bootstrap";
import { createContext, PropsWithChildren, useContext } from "react";

type TAppProviderProps = PropsWithChildren<TBootstrapReturn>;

const AppContext = createContext<TBootstrapReturn | null>(null);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};

export function AppProvider({ children, ...props }: TAppProviderProps) {
  return <AppContext.Provider value={props}>{children}</AppContext.Provider>;
}

export const AppContextProvider = AppProvider;
