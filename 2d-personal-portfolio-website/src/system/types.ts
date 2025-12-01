import { ReactNode } from "react";

export type AppKey = "portfolio" | "backgammon" | "quotes" | "blog";

export interface AppDefinition {
  key: AppKey;
  title: string;
  icon: string; // path to icon
  component: (props: WindowAppProps) => ReactNode;
  dockFixed?: boolean; // fixed on left side of dock
}

export interface WindowState {
  key: AppKey;
  title: string;
  icon: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  minimized: boolean;
}

export interface WindowAppProps {
  close: () => void;
  minimize: () => void;
  focus: () => void;
  setSize?: (w: number, h: number) => void;
}

export type OSMode = "desktop" | "lock" | "shutdown";
