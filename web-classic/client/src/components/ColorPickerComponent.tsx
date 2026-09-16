// ColorPickerComponent.tsx
import { useTheme } from "@/contexts/ThemeContext";
import React, { useState } from "react";
import { ChromePicker } from "react-color";

const ColorPickerComponent = () => {
  const {
    colors,
    updateColor,
    saveColorsToAPI,
    loadColorsFromAPI,
    resetColorsToDefault,
  } = useTheme();
  const [showPickers, setShowPickers] = useState({
    primary: false,
    primarySecond: false,
    primaryLight: false,
    primaryDark: false,
  });

  const colorKeys = [
    { key: "primary" as const, label: "Primary" },
    { key: "primarySecond" as const, label: "Primary Second" },
    { key: "primaryLight" as const, label: "Primary Light" },
    { key: "primaryDark" as const, label: "Primary Dark" },
  ];

  return (
    <div className="color-picker-container">
      <div className="color-pickers-grid">
        {colorKeys.map(({ key, label }) => (
          <div key={key} className="color-picker-item">
            <label>{label}</label>
            <div
              className="color-preview"
              style={{ backgroundColor: colors[key] }}
              onClick={() =>
                setShowPickers((prev) => ({ ...prev, [key]: !prev[key] }))
              }
            />
            {showPickers[key] && (
              <ChromePicker
                color={colors[key]}
                onChange={(color) => updateColor(key, color.hex)}
              />
            )}
            <input
              value={colors[key]}
              onChange={(e) => updateColor(key, e.target.value)}
            />
          </div>
        ))}
      </div>

      <div className="action-buttons">
        <button onClick={saveColorsToAPI}>💾 Save to Server</button>
        <button onClick={loadColorsFromAPI}>☁️ Load from Server</button>
        <button onClick={resetColorsToDefault}>🔄 Reset Default</button>
      </div>
    </div>
  );
};

export default ColorPickerComponent;
