import React, { useMemo, useState } from "react";

import DesktopIcon from "./DesktopIcon";
import Dock from "./Dock";
import LockScreen from "./LockScreen";
import MenuBar from "./MenuBar";
import ShutdownOverlay from "./ShutdownOverlay";
import type { AppDefinition, AppKey, OSMode, WindowState, WindowAppProps } from "./types";
import Window from "./Window";
// APP COMPONENTS
import BackgammonApp from "../apps/BackgammonApp";
import BlogApp from "../apps/BlogApp";
import PortfolioApp from "../apps/PortfolioApp";
import QuotesApp from "../apps/QuotesApp";
// WALLPAPER
// ICONS
import iconBackgammon from "../assets/icons/app-backgammon.webp";
import iconBlog from "../assets/icons/app-blog.svg";
import iconPortfolio from "../assets/icons/app-portfolio.webp";
import iconQuotes from "../assets/icons/app-quotes.svg";
import iconGithub from "../assets/icons/external-github.svg";
import iconLinkedIn from "../assets/icons/external-linkedin.webp";
import wallpaper from "../assets/wallpapers/desktop-wallpaper.webp";

const Desktop: React.FC = () => {
  const apps: AppDefinition[] = useMemo(
    () => [
      {
        key: "portfolio",
        title: "Portfolio",
        icon: iconPortfolio,
        component: (p) => <PortfolioApp {...p} />,
        dockFixed: true,
      },
      {
        key: "backgammon",
        title: "Backgammon",
        icon: iconBackgammon,
        component: (p) => <BackgammonApp {...p} />,
        dockFixed: true,
      },
      {
        key: "quotes",
        title: "Quotes",
        icon: iconQuotes,
        component: (p) => <QuotesApp {...p} />,
        dockFixed: true,
      },
      {
        key: "blog",
        title: "Blog",
        icon: iconBlog,
        component: (p) => <BlogApp {...p} />,
        dockFixed: true,
      },
    ],
    [],
  );

  const [mode, setMode] = useState<OSMode>("desktop");
  const [zCounter, setZ] = useState(10);

  const [wins, setWins] = useState<Record<AppKey, WindowState>>(() => {
    // Boot with Portfolio open - center it on screen
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const isMobile = screenWidth <= 1024;

    const windowWidth = isMobile ? Math.min(screenWidth - 40, 600) : 1000;
    const windowHeight = isMobile ? Math.min(screenHeight - 100, 500) : 640;
    const x = (screenWidth - windowWidth) / 2;
    const y = isMobile ? 60 : 80;

    return {
      portfolio: mkWindow("portfolio", x, y, windowWidth, windowHeight, 11),
      backgammon: undefined as unknown as WindowState,
      quotes: undefined as unknown as WindowState,
      blog: undefined as unknown as WindowState,
    } as unknown as Record<AppKey, WindowState>;
  });

  function mkWindow(key: AppKey, x = 120, y = 120, w = 900, h = 560, z?: number): WindowState {
    const def = apps.find((a) => a.key === key)!;
    return {
      key,
      title: def.title,
      icon: def.icon,
      x,
      y,
      w,
      h,
      z: z ?? zCounter + 1,
      minimized: false,
    };
  }

  function focus(key: AppKey) {
    setZ((prev) => prev + 1);
    setWins((prev) => (prev[key] ? { ...prev, [key]: { ...prev[key]!, z: zCounter + 1 } } : prev));
  }

  function openApp(key: AppKey) {
    setZ((prev) => prev + 1);
    setWins((prev) => {
      const exists = prev[key];
      if (exists) return { ...prev, [key]: { ...exists, minimized: false, z: zCounter + 1 } };

      // Center new windows responsively
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const isMobile = screenWidth <= 1024;

      const windowWidth = isMobile ? Math.min(screenWidth - 40, 600) : 1000;
      const windowHeight = isMobile ? Math.min(screenHeight - 100, 500) : 640;
      const x = (screenWidth - windowWidth) / 2 + (Math.random() * 40 - 20);
      const y = isMobile ? 60 + Math.random() * 20 : 100 + Math.random() * 60;

      return {
        ...prev,
        [key]: mkWindow(key, x, y, windowWidth, windowHeight, zCounter + 1),
      };
    });
  }

  function closeApp(key: AppKey) {
    setWins((prev) => {
      const cpy = { ...prev };
      delete cpy[key];
      return cpy;
    });
  }

  function minimizeApp(key: AppKey) {
    setWins((prev) => ({ ...prev, [key]: { ...prev[key]!, minimized: true } }));
  }

  function setPos(key: AppKey, x: number, y: number) {
    setWins((prev) => ({ ...prev, [key]: { ...prev[key]!, x, y } }));
  }
  function setSize(key: AppKey, w: number, h: number) {
    setWins((prev) => ({ ...prev, [key]: { ...prev[key]!, w, h } }));
  }

  const minimized = Object.values(wins)
    .filter(Boolean)
    .filter((w) => w.minimized) as WindowState[];

  const appMap = Object.fromEntries(apps.map((a) => [a.key, a])) as Record<AppKey, AppDefinition>;

  // Desktop external links
  const openLink = (url: string) => window.open(url, "_blank", "noopener,noreferrer");

  return (
    <div style={{ position: "absolute", inset: 0, background: "var(--mac-desktop)" }}>
      {/* Desktop wallpaper (optional) */}
      <img
        src={wallpaper}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: 0.8,
        }}
      />

      <MenuBar onShutdown={() => setMode("shutdown")} onLock={() => setMode("lock")} />

      {/* Desktop icons on the right */}
      <DesktopIcon
        title="Portfolio"
        icon={iconPortfolio}
        onOpen={() => openApp("portfolio")}
        rightOffset="var(--desktop-right-offset-row-1 )"
        topOffset="var(--desktop-icon-top-offset)"
        iconGap="var(--desktop-icon-gap)"
        gapMultiplier={0}
      />
      <DesktopIcon
        title="Shesh Besh"
        icon={iconBackgammon}
        onOpen={() => openApp("backgammon")}
        rightOffset="var(--desktop-right-offset-row-1)"
        topOffset="var(--desktop-icon-top-offset)"
        iconGap="var(--desktop-icon-gap)"
        gapMultiplier={1}
      />
      <DesktopIcon
        title="Quotes"
        icon={iconQuotes}
        onOpen={() => openApp("quotes")}
        rightOffset="var(--desktop-right-offset-row-1)"
        topOffset="var(--desktop-icon-top-offset)"
        iconGap="var(--desktop-icon-gap)"
        gapMultiplier={2.1}
      />
      <DesktopIcon
        title="Blog"
        icon={iconBlog}
        onOpen={() => openApp("blog")}
        rightOffset="var(--desktop-right-offset-row-2)"
        topOffset="var(--desktop-icon-top-offset)"
        iconGap="var(--desktop-icon-gap)"
        gapMultiplier={2}
      />

      {/* External-only (not in dock): LinkedIn + GitHub */}
      <DesktopIcon
        title="LinkedIn"
        icon={iconLinkedIn}
        onOpen={() => openLink("https://www.linkedin.com/in/roy-schor")}
        rightOffset="var(--desktop-right-offset-row-2)"
        topOffset="var(--desktop-icon-top-offset)"
        iconGap="var(--desktop-icon-gap)"
        gapMultiplier={0}
      />
      <DesktopIcon
        title="GitHub"
        icon={iconGithub}
        onOpen={() => openLink("https://github.com/RoySchor")}
        rightOffset="var(--desktop-right-offset-row-2)"
        topOffset="var(--desktop-icon-top-offset)"
        iconGap="var(--desktop-icon-gap)"
        gapMultiplier={1}
      />

      {/* Windows */}
      {Object.values(wins)
        .filter(Boolean)
        .map((w) => {
          if (!w || w.minimized) return null;
          const def = appMap[w.key];
          const appProps: WindowAppProps = {
            close: () => closeApp(w.key),
            minimize: () => minimizeApp(w.key),
            focus: () => focus(w.key),
            setSize: (ww, hh) => setSize(w.key, ww, hh),
          };
          return (
            <Window
              key={w.key}
              title={w.title}
              icon={w.icon}
              x={w.x}
              y={w.y}
              w={w.w}
              h={w.h}
              z={w.z}
              active={
                w.z ===
                Math.max(
                  ...Object.values(wins)
                    .filter(Boolean)
                    .map((x) => x!.z),
                )
              }
              onFocus={() => focus(w.key)}
              onClose={() => closeApp(w.key)}
              onMinimize={() => minimizeApp(w.key)}
              onMove={(x, y) => setPos(w.key, x, y)}
              onResize={(ww, hh) => setSize(w.key, ww, hh)}
            >
              {def.component(appProps)}
            </Window>
          );
        })}

      <Dock
        apps={apps}
        openApp={openApp}
        minimizedWindows={minimized}
        restoreWindow={(key) =>
          setWins((prev) => ({ ...prev, [key]: { ...prev[key]!, minimized: false } }))
        }
      />

      {mode === "lock" && <LockScreen onLogin={() => setMode("desktop")} />}
      {mode === "shutdown" && (
        <ShutdownOverlay
          onFinish={() => {
            // After “shutdown”, show a quick power off and then go to lock
            setMode("lock");
          }}
        />
      )}
    </div>
  );
};

export default Desktop;
