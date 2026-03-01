import * as React from "react";
import ThemeToggle from "./ThemeToggle";

type HeaderProps = {
  onNavigate: (route: "home" | "library" | "admin" | "admin-panel") => void;
  showThemeToggle?: boolean;
  theme?: "light" | "dark";
  onToggleTheme?: (checked: boolean) => void;
};

const Header = ({
  onNavigate,
  showThemeToggle = true,
  theme,
  onToggleTheme
}: HeaderProps) => {
  return (
    <header className="header" role="banner">
      <div className="header-content" key="header-content">
        <div className="logo">
          <i className="fas fa-icons"></i>
          <span>IconLibrary</span>
        </div>

        <div className="nav-links">
          <button
            type="button"
            className="nav-link nav-button"
            onClick={() => onNavigate("home")}
          >
            <i className="fas fa-home"></i> Home
          </button>
          <button
            type="button"
            className="nav-link nav-button"
            onClick={() => onNavigate("admin")}
          >
            <i className="fas fa-lock"></i> Admin
          </button>
          {showThemeToggle && onToggleTheme ? (
            <ThemeToggle
              checked={theme === "dark"}
              onChange={onToggleTheme}
            />
          ) : null}
        </div>
      </div>
    </header>
  );
};

export default Header;
