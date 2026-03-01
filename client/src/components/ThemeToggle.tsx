import React from "react";

type ThemeToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
};

const ThemeToggle = ({ checked, onChange, label }: ThemeToggleProps) => {
  return (
    <label className="theme-toggle">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="toggle-switch"></span>
      {label ? <span>{label}</span> : null}
    </label>
  );
};

export default ThemeToggle;
