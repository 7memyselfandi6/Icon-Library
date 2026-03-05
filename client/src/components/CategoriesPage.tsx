import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import ThemeToggle from "./ThemeToggle";
import styles from "./CategoriesPage.module.css";
import { Category, IconEntry } from "../App";

type CategoriesPageProps = {
  adminName: string;
  theme: "light" | "dark";
  onToggleTheme: (checked: boolean) => void;
  onLogout: () => void;
  onNavigate: (route: "home" | "library" | "admin" | "admin-panel") => void;
  apiBaseUrl: string;
  authToken: string;
  icons: IconEntry[];
  rawCategories: Category[];
  categoriesLoading: boolean;
  categoriesError: string;
  onRefreshCategories: () => Promise<void>;
};

const mainCategoryOptions = [
  { value: "icon", label: "Icon" },
  { value: "image", label: "Image" },
  { value: "video", label: "Video" },
  { value: "logo", label: "Logo" }
];

const CategoriesPage = ({
  adminName,
  theme,
  onToggleTheme,
  onLogout,
  onNavigate,
  apiBaseUrl,
  authToken,
  icons,
  rawCategories,
  categoriesLoading,
  categoriesError,
  onRefreshCategories
}: CategoriesPageProps) => {
  const [activeMenu, setActiveMenu] = useState("categories");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [mainValue, setMainValue] = useState("icon");
  const [subValue, setSubValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const safeIcons = useMemo(() => icons ?? [], [icons]);
  const safeCategories = useMemo(() => rawCategories ?? [], [rawCategories]);

  const iconCounts = useMemo(() => {
    const map = new Map<string, number>();
    safeIcons.forEach((icon) => {
      const key = `${icon.mainCategory.toLowerCase()}::${icon.subCategory.toLowerCase()}`;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [safeIcons]);

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(""), 3000);
  };

  useEffect(() => {
    if (safeCategories.length || categoriesLoading) return;
    setIsRefreshing(true);
    onRefreshCategories()
      .catch((error) => {
        showToast(error instanceof Error ? error.message : "Failed to load categories");
      })
      .finally(() => setIsRefreshing(false));
  }, [safeCategories.length, categoriesLoading, onRefreshCategories]);

  const normalizeKey = (main: string, sub: string) =>
    `${main.trim().toLowerCase()}::${sub.trim().toLowerCase()}`;

  const hasDuplicate = (main: string, sub: string, excludeId?: string | null) => {
    const key = normalizeKey(main, sub);
    return safeCategories.some(
      (category) =>
        normalizeKey(category.main, category.sub) === key &&
        category._id !== excludeId
    );
  };

  const handleOpenAdd = () => {
    setEditingCategoryId(null);
    setMainValue("icon");
    setSubValue("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (category: Category) => {
    setEditingCategoryId(category._id);
    setMainValue(category.main);
    setSubValue(category.sub);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    const trimmedSub = subValue.trim();
    if (!trimmedSub) {
      showToast("Sub category is required");
      return;
    }
    if (hasDuplicate(mainValue, trimmedSub, editingCategoryId)) {
      showToast("Category already exists");
      return;
    }
    try {
      setIsSaving(true);
      const payload = { main: mainValue, sub: trimmedSub };
      const response = await fetch(
        `${apiBaseUrl}/api/categories${editingCategoryId ? `/${editingCategoryId}` : ""}`,
        {
          method: editingCategoryId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`
          },
          body: JSON.stringify(payload)
        }
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || response.statusText || "Request failed");
      }
      await onRefreshCategories();
      setIsModalOpen(false);
      setEditingCategoryId(null);
      showToast(editingCategoryId ? "Category updated" : "Category added");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to save category");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (category: Category) => {
    const countKey = normalizeKey(category.main, category.sub);
    const count = iconCounts.get(countKey) || 0;
    const confirmed = window.confirm(
      count
        ? `This category is used by ${count} icon(s). Delete anyway?`
        : "Delete this category?"
    );
    if (!confirmed) return;
    try {
      setDeletingId(category._id);
      const response = await fetch(`${apiBaseUrl}/api/categories/${category._id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || response.statusText || "Delete failed");
      }
      await onRefreshCategories();
      showToast("Category deleted");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to delete category");
    } finally {
      setDeletingId(null);
    }
  };

  const handleMenuClick = (menu: string) => {
    setActiveMenu(menu);
    if (menu !== "categories") {
      showToast("This section is coming soon");
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshCategories();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to refresh categories");
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className="header">
        <div className="header-content">
          <div className="logo" role="button" onClick={() => onNavigate("home")}>
            <i className="fas fa-icons"></i>
            <span>IconLibrary Admin</span>
          </div>
          <div className="header-actions">
            <div className="admin-badge">
              <i className="fas fa-shield-alt"></i>
              <span>{adminName}</span>
            </div>
            <ThemeToggle checked={theme === "dark"} onChange={onToggleTheme} />
            <button className="logout-btn" type="button" onClick={onLogout}>
              <i className="fas fa-sign-out-alt"></i>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="main">
        <aside className="sidebar">
          <div className="admin-info">
            <div className="admin-avatar">
              <i className="fas fa-user"></i>
            </div>
            <div className="admin-name">{adminName}</div>
            <div className="admin-role">Super Admin</div>
          </div>

          <div className="stats-grid">
            <div className="stat-box">
              <div className="stat-value">{safeIcons.length}</div>
              <div className="stat-label">Total Icons</div>
            </div>
            <div className="stat-box">
              <div className="stat-value">{safeCategories.length}</div>
              <div className="stat-label">Categories</div>
            </div>
          </div>

          <div
            className={`menu-item ${activeMenu === "upload" ? "active" : ""}`}
            onClick={() => handleMenuClick("upload")}
          >
            <i className="fas fa-cloud-upload-alt"></i>
            <span>Upload Icon</span>
          </div>
          <div
            className={`menu-item ${activeMenu === "manage" ? "active" : ""}`}
            onClick={() => handleMenuClick("manage")}
          >
            <i className="fas fa-edit"></i>
            <span>Manage Icons</span>
          </div>
          <div
            className={`menu-item ${activeMenu === "categories" ? "active" : ""}`}
            onClick={() => handleMenuClick("categories")}
          >
            <i className="fas fa-tags"></i>
            <span>Categories</span>
          </div>
          <div
            className={`menu-item ${activeMenu === "settings" ? "active" : ""}`}
            onClick={() => handleMenuClick("settings")}
          >
            <i className="fas fa-cog"></i>
            <span>Settings</span>
          </div>
        </aside>

        <section className="content">
          <div className={`content-header ${styles.contentHeader}`}>
            <h2 className="content-title">Categories</h2>
            <button
              className={`btn btn-primary ${styles.addButton}`}
              type="button"
              onClick={handleOpenAdd}
            >
              <i className="fas fa-plus"></i>
              Add Category
            </button>
          </div>

          <div className="table-container">
            <table className={styles.table}>
              <thead className={styles.tableHead}>
                <tr>
                  <th>Main Category</th>
                  <th>Sub Category</th>
                  <th>Icon Count</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categoriesLoading || isRefreshing ? (
                  <tr>
                    <td colSpan={4} className={styles.cellMuted}>
                      Loading categories...
                    </td>
                  </tr>
                ) : categoriesError ? (
                  <tr>
                    <td colSpan={4} className={styles.cellMuted}>
                      {categoriesError}
                      <div className={styles.modalActions}>
                        <button
                          type="button"
                          className={`btn btn-outline ${styles.secondaryButton}`}
                          onClick={handleRefresh}
                          disabled={isRefreshing}
                        >
                          {isRefreshing ? "Refreshing..." : "Retry"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : safeCategories.length === 0 ? (
                  <tr>
                    <td colSpan={4} className={styles.cellMuted}>
                      No categories found. Add one to get started.
                    </td>
                  </tr>
                ) : (
                  safeCategories.map((category) => {
                    const count = iconCounts.get(normalizeKey(category.main, category.sub)) || 0;
                    return (
                      <tr key={category._id} className={styles.tableRow}>
                        <td>{category.main}</td>
                        <td>{category.sub}</td>
                        <td className={styles.cellMuted}>{count}</td>
                        <td>
                          <div className={styles.actionButtons}>
                            <button
                              type="button"
                              className={styles.iconButton}
                              onClick={() => handleOpenEdit(category)}
                              aria-label="Edit category"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button
                              type="button"
                              className={`${styles.iconButton} ${styles.iconButtonDelete}`}
                              onClick={() => handleDelete(category)}
                              disabled={deletingId === category._id}
                              aria-label="Delete category"
                            >
                              <i className={`fas ${deletingId === category._id ? "fa-spinner fa-spin" : "fa-trash"}`}></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <div className={`modal ${isModalOpen ? "active" : ""}`}>
        <div className="modal-content">
          <div className={styles.modalHeader}>
            <h3 className={styles.modalTitle}>
              {editingCategoryId ? "Edit Category" : "Add Category"}
            </h3>
            <button className="modal-close" type="button" onClick={() => setIsModalOpen(false)}>
              &times;
            </button>
          </div>
          <div className="form-group">
            <label>Main Category</label>
            <select
              className="category-select"
              value={mainValue}
              onChange={(event) => setMainValue(event.target.value)}
            >
              {mainCategoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Sub Category Name</label>
            <input
              className="form-control"
              type="text"
              placeholder="e.g., Food"
              value={subValue}
              onChange={(event) => setSubValue(event.target.value)}
            />
          </div>
          <div className={styles.modalActions}>
            <button
              type="button"
              className={`btn btn-outline ${styles.secondaryButton}`}
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className={`btn btn-primary ${styles.primaryButton}`}
              onClick={handleSave}
              disabled={isSaving}
            >
              <i
                className={`fas ${
                  isSaving
                    ? "fa-spinner fa-spin"
                    : editingCategoryId
                    ? "fa-save"
                    : "fa-plus"
                }`}
              ></i>
              {editingCategoryId ? "Save Changes" : "Add Category"}
            </button>
          </div>
        </div>
      </div>

      <div className={`toast ${toastMessage ? "show" : ""}`}>{toastMessage}</div>
    </div>
  );
};

export default CategoriesPage;
