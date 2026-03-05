import React, { useCallback, useEffect, useMemo, useState } from "react";
import Header from "./components/Header";
import IconList from "./components/IconList";
import AdminPanel from "./components/AdminPanel";
import ThemeToggle from "./components/ThemeToggle";

export type IconEntry = {
  id: string | number;
  name: string;
  mainCategory: string;
  subCategory: string;
  fileData?: string;
  size?: string;
  path?: string;
  tags?: string[];
  fileName?: string;
  fileSize?: string;
  date?: string;
  type?: string;
};

export type Category = {
  _id: string;
  main: string;
  sub: string;
};

type Route = "home" | "library" | "admin" | "admin-panel";

type ImportMetaEnv = {
  VITE_API_URL?: string;
};

type ApiIcon = {
  _id?: string;
  id?: string | number;
  name: string;
  mainCategory: string;
  subCategory: string;
  tags?: string[];
  createdAt?: string;
  file?: {
    url?: string;
    originalName?: string;
    size?: number;
    mimeType?: string;
    bytes?: number;
    format?: string;
    publicId?: string;
    resourceType?: string;
    width?: number;
    height?: number;
  };
};

const API_BASE_URL =
  (import.meta as { env?: ImportMetaEnv }).env?.VITE_API_URL ?? "";

type ErrorBoundaryProps = {
  fallback: React.ReactNode;
  children?: React.ReactNode;
};

class ErrorBoundary extends React.Component<ErrorBoundaryProps, { hasError: boolean }> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {}

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

const normalizeRoute = (hashValue: string): Route => {
  if (hashValue === "library") return "library";
  if (hashValue === "admin") return "admin";
  if (hashValue === "admin-panel") return "admin-panel";
  return "home";
};

const mapIconFromApi = (icon: ApiIcon): IconEntry => {
  const file = icon.file || {};
  const mediaType = file.resourceType || file.mimeType || "image";
  const sizeValue = file.bytes ?? file.size;
  return {
    id: icon._id ?? icon.id ?? icon.name,
    name: icon.name,
    mainCategory: icon.mainCategory,
    subCategory: icon.subCategory,
    tags: icon.tags || [],
    fileData: file.url,
    fileName: file.originalName,
    fileSize: sizeValue ? `${(sizeValue / 1024).toFixed(1)} KB` : undefined,
    date: icon.createdAt ? new Date(icon.createdAt).toLocaleDateString() : undefined,
    type: mediaType,
  };
};

const getStoredToken = () => {
  return (
    localStorage.getItem("authToken") ||
    sessionStorage.getItem("authToken") ||
    ""
  );
};

const getStoredAdminName = () => {
  return (
    localStorage.getItem("adminName") ||
    sessionStorage.getItem("adminName") ||
    "Admin"
  );
};

const App = () => {
  const [route, setRoute] = useState<Route>("home");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [icons, setIcons] = useState<IconEntry[]>([]);
  const [rawCategories, setRawCategories] = useState<Category[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [iconsError, setIconsError] = useState("");
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState("");

  const categories = useMemo(() => {
    const map = new Map<string, Set<string>>();
    rawCategories.forEach((c) => {
      if (!map.has(c.main)) map.set(c.main, new Set());
      map.get(c.main)?.add(c.sub);
    });
    return Array.from(map.entries()).map(([main, subs]) => ({
      main,
      subs: Array.from(subs),
    }));
  }, [rawCategories]);
  const [adminName, setAdminName] = useState("Admin");
  const [loginError, setLoginError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberAdmin, setRememberAdmin] = useState(
    localStorage.getItem("rememberAdmin") === "true"
  );
  const [loginForm, setLoginForm] = useState({
    username: "admin",
    password: "admin123",
  });

  const fetchIcons = useCallback(async (search?: string) => {
    try {
      setIconsError("");
      const params = new URLSearchParams();
      params.set("limit", "200");
      if (search?.trim()) {
        params.set("search", search.trim());
      }
      const response = await fetch(`${API_BASE_URL}/api/icons?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to load icons");
      }
      const payload = await response.json();
      const data = Array.isArray(payload.data) ? payload.data : payload;
      setIcons(Array.isArray(data) ? data.map(mapIconFromApi) : []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load icons";
      setIconsError(message);
      throw error;
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      setCategoriesLoading(true);
      setCategoriesError("");
      const response = await fetch(`${API_BASE_URL}/api/categories?t=${Date.now()}`);
      if (!response.ok) {
        throw new Error(`Failed to load categories: ${response.statusText}`);
      }
      const payload = await response.json();
      const raw: Category[] = payload.categories || [];
      setRawCategories(raw);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load categories";
      setCategoriesError(message);
      console.error("Error fetching categories:", error);
      throw error;
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      setTheme("dark");
    }
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await Promise.all([fetchIcons(), fetchCategories()]);
      } catch (error) {
        console.error("Failed to bootstrap app:", error);
      }
    };
    bootstrap();
  }, [fetchIcons, fetchCategories]);

  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    document.body.setAttribute("data-page", route);
  }, [route]);

  useEffect(() => {
    const token = getStoredToken();
    setIsAdmin(Boolean(token));
    setAdminName(getStoredAdminName());
  }, []);

  useEffect(() => {
    if (route === "admin-panel" && !isAdmin) {
      setRoute("admin");
      window.location.hash = "admin";
    }
  }, [route, isAdmin]);

  useEffect(() => {
    if (route === "admin" && isAdmin && rememberAdmin) {
      setRoute("admin-panel");
      window.location.hash = "admin-panel";
    }
  }, [route, isAdmin, rememberAdmin]);

  useEffect(() => {
    const initialHash = window.location.hash.replace("#", "");
    setRoute(normalizeRoute(initialHash));

    const handleHashChange = () => {
      const hashValue = window.location.hash.replace("#", "");
      setRoute(normalizeRoute(hashValue));
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const totalIcons = useMemo(() => icons.length, [icons]);
  const totalCategories = useMemo(() => categories.length, [categories]);

  const navigate = (next: Route) => {
    setRoute(next);
    window.location.hash = next;
  };

  const toggleTheme = (checked: boolean) => {
    setTheme(checked ? "dark" : "light");
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    const { username, password } = loginForm;
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) {
        throw new Error("Invalid credentials");
      }
      const payload = await response.json();
      const storage = rememberAdmin ? localStorage : sessionStorage;
      storage.setItem("authToken", payload.token);
      storage.setItem("adminName", username);
      if (rememberAdmin) {
        localStorage.setItem("rememberAdmin", "true");
      } else {
        localStorage.removeItem("rememberAdmin");
      }
      setAdminName(username);
      setIsAdmin(true);
      setLoginError("");
      navigate("admin-panel");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed";
      setLoginError(message);
      setTimeout(() => setLoginError(""), 3000);
    }
  };

  const handleLogout = async () => {
    const token = getStoredToken();
    if (token) {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => null);
    }
    localStorage.removeItem("authToken");
    localStorage.removeItem("adminName");
    localStorage.removeItem("rememberAdmin");
    sessionStorage.removeItem("authToken");
    sessionStorage.removeItem("adminName");
    setIsAdmin(false);
    navigate("home");
  };

  const loginPasswordType = showPassword ? "text" : "password";

  return (
    <div className="app">
      {route === "home" && (
        <div className="welcome-page">
          <ThemeToggle
            checked={theme === "dark"}
            onChange={toggleTheme}
            label={theme === "dark" ? "Dark Mode" : "Light Mode"}
          />
          <div className="welcome-container">
            <div className="welcome-card">
              <div className="welcome-header">
                <div className="welcome-icon">
                  <i className="fas fa-icons"></i>
                </div>
                <h1 className="welcome-title">IconLibrary</h1>
                <p className="welcome-subtitle">
                  Your Ultimate Icon Management System
                </p>
              </div>

              <div className="features-grid">
                <div className="feature-card">
                  <div className="feature-icon">
                    <i className="fas fa-cloud-upload-alt"></i>
                  </div>
                  <h3 className="feature-title">Upload Icons</h3>
                  <p className="feature-description">
                    Upload and manage your icon collection with ease
                  </p>
                </div>

                <div className="feature-card">
                  <div className="feature-icon">
                    <i className="fas fa-edit"></i>
                  </div>
                  <h3 className="feature-title">Edit & Organize</h3>
                  <p className="feature-description">
                    Edit, categorize, and organize your icons
                  </p>
                </div>

                <div className="feature-card">
                  <div className="feature-icon">
                    <i className="fas fa-shield-alt"></i>
                  </div>
                  <h3 className="feature-title">Admin Protected</h3>
                  <p className="feature-description">
                    Secure admin access for file management
                  </p>
                </div>

                <div className="feature-card">
                  <div className="feature-icon">
                    <i className="fas fa-moon"></i>
                  </div>
                  <h3 className="feature-title">Light & Dark Mode</h3>
                  <p className="feature-d
escription">
                    Switch themes for comfortable viewing
                  </p>
                </div>
              </div>

              <div className="stats-section">
                <div className="stat-section">
                  <div className="stat-number">{totalIcons}</div>
                  <div className="stat-label">Total Icons</div>
                </div>
                <div className="stat-section">
                  <div className="stat-number">{totalCategories}</div>
                  <div className="stat-label">Categories</div>
                </div>
                <div className="stat-section">
                  <div className="stat-number">1</div>
                  <div className="stat-label">Admin</div>
                </div>
              </div>

              <div className="cta-section">
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={() => navigate("admin")}
                >
                  <i className="fas fa-lock"></i> Admin Login
                </button>
                <button
                  className="btn btn-outline"
                  type="button"
                  onClick={() => navigate("library")}
                >
                  <i className="fas fa-eye"></i> Browse Library
                </button>
              </div>

              <div className="footer">
                <p>
                  &copy; 2026 IconLibrary. All rights reserved.{" "}
                  <a
                    style={{ color: "#4f46e5", textDecoration: "none" }}
                    href="https://yonas-alemu.vercel.app/"
                  >
                    YonasA
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {route === "library" && (
        <div className="library-page">
          <Header
            onNavigate={navigate}
            showThemeToggle
            theme={theme}
            onToggleTheme={toggleTheme}
          />
          <main className="main">
            <IconList icons={icons} apiBaseUrl={API_BASE_URL} />
          </main>
          <div className="footer">
            <p>
              &copy; 2026 IconLibrary. All rights reserved.{" "}
              <a
                style={{ color: "#4f46e5", textDecoration: "none" }}
                href="https://yonas-alemu.vercel.app/"
              >
                YonasA
              </a>
            </p>
          </div>
        </div>
      )}

      {route === "admin" && (
        <div className="admin-page">
          <ThemeToggle
            checked={theme === "dark"}
            onChange={toggleTheme}
            label={theme === "dark" ? "Dark Mode" : "Light Mode"}
          />
          <div className="login-container">
            <div className="login-card">
              <button
                className="back-link"
                type="button"
                onClick={() => navigate("home")}
              >
                <i className="fas fa-arrow-left"></i> Back to Welcome
              </button>

              <div className="login-header">
                <div className="login-icon">
                  <i className="fas fa-lock"></i>
                </div>
                <h1 className="login-title">Admin Login</h1>
                <p className="login-subtitle">
                  Sign in to manage your icon library
                </p>
              </div>

              <div className={`error-message ${loginError ? "show" : ""}`}>
                <i className="fas fa-exclamation-circle"></i> {loginError || "Invalid username or password"}
              </div>

              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label>Username</label>
                  <div className="input-group">
                    <i className="fas fa-user input-icon"></i>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Enter username"
                      value={loginForm.username}
                      onChange={(event) =>
                        setLoginForm((prev) => ({
                          ...prev,
                          username: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Password</label>
                  <div className="input-group">
                    <i className="fas fa-lock input-icon"></i>
                    <input
                      type={loginPasswordType}
                      className="form-control"
                      placeholder="Enter password"
                      value={loginForm.password}
                      onChange={(event) =>
                        setLoginForm((prev) => ({
                          ...prev,
                          password: event.target.value,
                        }))
                      }
                    />
                    <button
                      className="password-toggle"
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                    >
                      <i
                        className={`fas ${
                          showPassword ? "fa-eye-slash" : "fa-eye"
                        }`}
                      ></i>
                    </button>
                  </div>
                </div>

                <div className="remember-forgot">
                  <label className="remember">
                    <input
                      type="checkbox"
                      checked={rememberAdmin}
                      onChange={(event) => setRememberAdmin(event.target.checked)}
                    />{" "}
                    Remember me
                  </label>
                  <button className="forgot-link" type="button">
                    Forgot Password?
                  </button>
                </div>

                <button type="submit" className="btn btn-primary">
                  <i className="fas fa-sign-in-alt"></i> Sign In
                </button>
              </form>

              <div className="demo-credentials">
                <p>
                  <i className="fas fa-info-circle"></i> Demo Credentials:
                </p>
                <p>
                  Username: <code>admin</code> | Password:{" "}
                  <code>admin123</code>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {route === "admin-panel" && (
        <div className="admin-panel-page">
          <ErrorBoundary
            fallback={
              <div className="content">
                <h2 className="content-title">Something went wrong</h2>
                <p>Try reloading the page or navigating back.</p>
                <button className="btn btn-primary" type="button" onClick={() => navigate("admin-panel")}>
                  Retry
                </button>
              </div>
            }
          >
            <AdminPanel
              icons={icons}
              setIcons={setIcons}
              adminName={adminName}
              theme={theme}
              onToggleTheme={toggleTheme}
              onLogout={handleLogout}
              onNavigate={navigate}
              isAdmin={isAdmin}
              apiBaseUrl={API_BASE_URL}
              authToken={getStoredToken()}
              categories={categories}
              rawCategories={rawCategories}
              categoriesLoading={categoriesLoading}
              categoriesError={categoriesError}
              onRefreshIcons={fetchIcons}
              onRefreshCategories={fetchCategories}
            />
          </ErrorBoundary>
          {iconsError ? (
            <div className="toast show">{iconsError}</div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default App;
