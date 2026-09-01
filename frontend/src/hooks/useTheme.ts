import { useContext } from "react";
import { ThemeContext, type ThemeContextType, type ThemeMode } from "../contexts/themeContextBase";

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme deve ser utilizado dentro de um ThemeProvider");
  }
  return context;
}

export type { ThemeMode, ThemeContextType };
