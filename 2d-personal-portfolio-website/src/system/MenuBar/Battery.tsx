import React, { useState, useEffect, useRef } from "react";
import "./styles.css";

interface BatteryManager extends EventTarget {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;
}

interface NavigatorWithBattery extends Navigator {
  getBattery?: () => Promise<BatteryManager>;
}

const Battery: React.FC = () => {
  // Default to 72% if unsupported or error
  const [battery, setBattery] = useState<{
    level: number;
    charging: boolean;
  }>({
    level: 0.72,
    charging: false,
  });

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const nav = navigator as NavigatorWithBattery;

    if (!nav.getBattery) return;

    let batteryManager: BatteryManager | null = null;

    const updateBattery = () => {
      if (batteryManager) {
        setBattery({
          level: batteryManager.level,
          charging: batteryManager.charging,
        });
      }
    };

    nav
      .getBattery()
      .then((bat) => {
        batteryManager = bat;
        updateBattery();
        bat.addEventListener("levelchange", updateBattery);
        bat.addEventListener("chargingchange", updateBattery);
      })
      .catch(() => {
        // Silent catch: if fails, we stay at default (72%)
      });

    return () => {
      if (batteryManager) {
        batteryManager.removeEventListener("levelchange", updateBattery);
        batteryManager.removeEventListener("chargingchange", updateBattery);
      }
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div
      ref={containerRef}
      className="battery-icon-container"
      onMouseDown={() => setIsOpen(!isOpen)}
    >
      <div className="battery-body">
        <div
          className="battery-fill"
          style={{
            width: `${battery.level * 100}%`,
            backgroundColor: battery.charging ? "#4CD964" : "var(--mac-menubar-text)",
          }}
        />
        <div className="battery-tip" />
        {battery.charging && <div className="battery-bolt">⚡</div>}
      </div>

      {isOpen && (
        <div className="mac-blur glass-menu battery-dropdown">
          <span style={{ fontWeight: 400 }}>Battery</span>
          <span style={{ color: "rgba(0,0,0,0.5)" }}>
            {Math.round(battery.level * 100)}%
          </span>
        </div>
      )}
    </div>
  );
};

export default Battery;
