import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { IconEntry, Category } from "../App";
import ThemeToggle from "./ThemeToggle";

type AdminPanelProps = {
  icons: IconEntry[];
  setIcons: React.Dispatch<React.SetStateAction<IconEntry[]>>;
  adminName: string;
  theme: "light" | "dark";
  onToggleTheme: (checked: boolean) => void;
  onLogout: () => void;
  onNavigate: (route: "home" | "library" | "admin" | "admin-panel") => void;
  isAdmin: boolean;
  apiBaseUrl: string;
  authToken: string;
  categories: { main: string; subs: string[] }[];
  rawCategories: Category[];
  onRefreshIcons: (search?: string) => Promise<void>;
  onRefreshCategories: () => Promise<void>;
};

const AdminPanel = ({
  icons,
  setIcons,
  adminName,
  theme,
  onToggleTheme,
  onLogout,
  onNavigate,
  isAdmin,
  apiBaseUrl,
  authToken,
  categories,
  rawCategories,
  onRefreshIcons,
  onRefreshCategories
}: AdminPanelProps) => {
  const [activeSection, setActiveSection] = useState<
    "upload" | "manage" | "categories" | "settings"
  >("upload");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: string } | null>(
    null
  );
  const [iconName, setIconName] = useState("");
  const [iconCategory, setIconCategory] = useState("icon-food");
  const [iconTags, setIconTags] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editIconId, setEditIconId] = useState<string | number | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("icon-food");
  const [editTags, setEditTags] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [categoryMain, setCategoryMain] = useState("icon");
  const [subCategoryName, setSubCategoryName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  
  // Icon Pagination
  const [iconPage, setIconPage] = useState(1);
  const iconsPerPage = 10;

  const totalIcons = icons.length;

  const categoryGroups = useMemo(() => {
    if (categories.length) {
      return categories;
    }
    const map = new Map<string, Set<string>>();
    icons.forEach((icon) => {
      if (!map.has(icon.mainCategory)) {
        map.set(icon.mainCategory, new Set());
      }
      map.get(icon.mainCategory)?.add(icon.subCategory);
    });
    return Array.from(map.entries()).map(([main, subs]) => ({
      main,
      subs: Array.from(subs)
    }));
  }, [categories, icons]);

  useEffect(() => {
    if (!categoryGroups.length) return;
    const firstGroup = categoryGroups[0];
    const firstSub = firstGroup.subs[0];
    if (!firstSub) return;
    const firstValue = `${firstGroup.main}-${firstSub}`;
    const allValues = new Set(
      categoryGroups.flatMap((group) =>
        group.subs.map((sub) => `${group.main}-${sub}`)
      )
    );
    setIconCategory((prev) => (allValues.has(prev) ? prev : firstValue));
    setEditCategory((prev) => (allValues.has(prev) ? prev : firstValue));
  }, [categoryGroups]);

  const filteredIcons = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return icons;
    return icons.filter((icon) => {
      const text = `${icon.name} ${icon.mainCategory} ${icon.subCategory}`.toLowerCase();
      return text.includes(query);
    });
  }, [icons, searchQuery]);

  const paginatedIcons = useMemo(() => {
    const start = (iconPage - 1) * iconsPerPage;
    return filteredIcons.slice(start, start + iconsPerPage);
  }, [filteredIcons, iconPage]);

  const totalIconPages = Math.ceil(filteredIcons.length / iconsPerPage);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const handleFileSelect = (file: File | null) => {
    if (
      !file ||
      (!file.type.startsWith("image/") && !file.type.startsWith("video/"))
    ) {
      return;
    }
    setUploadedFile(file);
    setFileInfo({
      name: file.name,
      size: `${(file.size / 1024).toFixed(1)} KB`
    });
  };

  const handleUploadIcon = async () => {
    if (!iconName.trim()) {
      showToast("Please enter icon name");
      return;
    }
    if (!uploadedFile) {
      showToast("Please select an image or video file");
      return;
    }
    try {
      setIsUploading(true);
      const [mainCategory, subCategory] = iconCategory.split("-");
      const formData = new FormData();
      formData.append("file", uploadedFile);
      formData.append("name", iconName);
      formData.append("mainCategory", mainCategory);
      formData.append("subCategory", subCategory);
      if (iconTags.trim()) {
        formData.append("tags", iconTags);
      }
      const response = await fetch(`${apiBaseUrl}/api/icons`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
        body: formData
      });
      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        const message = errorPayload?.error || "Upload failed";
        throw new Error(message);
      }
      const payload = await response.json();
      const newIcon: IconEntry = {
        id: payload._id,
        name: payload.name,
        mainCategory: payload.mainCategory,
        subCategory: payload.subCategory,
        tags: payload.tags || [],
        fileData: payload.file?.url,
        fileName: payload.file?.originalName,
        fileSize: payload.file?.bytes || payload.file?.size
          ? `${((payload.file?.bytes || payload.file?.size) / 1024).toFixed(1)} KB`
          : undefined,
        date: payload.createdAt
          ? new Date(payload.createdAt).toLocaleDateString()
          : undefined,
        type: payload.file?.resourceType || payload.file?.mimeType || "image"
      };
      setIcons((prev) => [newIcon, ...prev]);
      setIconName("");
      setIconTags("");
      setUploadedFile(null);
      setFileInfo(null);
      await onRefreshCategories();
      showToast("Icon uploaded successfully!");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to upload icon";
      showToast(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditIcon = (icon: IconEntry) => {
    setEditIconId(icon.id);
    setEditName(icon.name);
    setEditCategory(`${icon.mainCategory}-${icon.subCategory}`);
    setEditTags((icon.tags || []).join(", "));
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (editIconId === null) return;
    try {
      const [mainCategory, subCategory] = editCategory.split("-");
      const response = await fetch(`${apiBaseUrl}/api/icons/${editIconId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          name: editName,
          mainCategory,
          subCategory,
          tags: editTags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
        })
      });
      if (!response.ok) {
        throw new Error("Update failed");
      }
      const payload = await response.json();
      setIcons((prev) =>
        prev.map((icon) =>
          icon.id === editIconId
            ? {
                ...icon,
                name: payload.name,
                mainCategory: payload.mainCategory,
                subCategory: payload.subCategory,
                tags: payload.tags || []
              }
            : icon
        )
      );
      await onRefreshCategories();
      setShowEditModal(false);
      setEditIconId(null);
      showToast("Icon updated successfully!");
    } catch {
      showToast("Failed to update icon");
    }
  };

  const handleDeleteIcon = async (id: string | number) => {
    if (window.confirm("Are you sure you want to delete this icon?")) {
      try {
        const response = await fetch(`${apiBaseUrl}/api/icons/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${authToken}` }
        });
        if (!response.ok) {
          throw new Error("Delete failed");
        }
        setIcons((prev) => prev.filter((icon) => icon.id !== id));
        await onRefreshCategories();
        showToast("Icon deleted successfully!");
      } catch {
        showToast("Failed to delete icon");
      }
    }
  };

  const handleAddCategory = async () => {
    if (!subCategoryName.trim()) {
      showToast("Please enter sub category name");
      return;
    }
    try {
      setIsSavingCategory(true);
      const response = await fetch(`${apiBaseUrl}/api/categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ main: categoryMain, sub: subCategoryName.trim() })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to add category");
      }
      await onRefreshCategories();
      setSubCategoryName("");
      setShowCategoryModal(false);
      showToast("Category added successfully!");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to add category");
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleEditCategory = (cat: Category) => {
    setEditingCategoryId(cat._id);
    setCategoryMain(cat.main);
    setSubCategoryName(cat.sub);
    setShowCategoryModal(true);
  };

  const handleSaveCategoryUpdate = async () => {
    if (!editingCategoryId || !subCategoryName.trim()) return;
    try {
      setIsSavingCategory(true);
      const response = await fetch(`${apiBaseUrl}/api/categories/${editingCategoryId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ main: categoryMain, sub: subCategoryName.trim() })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update category");
      }
      await onRefreshCategories();
      setEditingCategoryId(null);
      setSubCategoryName("");
      setShowCategoryModal(false);
      showToast("Category updated successfully!");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to update category");
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const category = rawCategories.find((c) => c._id === id);
    if (!category) return;

    const count = icons.filter(
      (icon) =>
        icon.mainCategory.toLowerCase() === category.main.toLowerCase() &&
        icon.subCategory.toLowerCase() === category.sub.toLowerCase()
    ).length;

    const message =
      count > 0
        ? `This category is used by ${count} icon(s). Deleting it will leave these icons with their current category names, but the category will no longer be listed in filters. Are you sure you want to delete it?`
        : "Are you sure you want to delete this category?";

    if (window.confirm(message)) {
      try {
        setDeletingCategoryId(id);
        const response = await fetch(`${apiBaseUrl}/api/categories/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${authToken}` }
        });
        if (!response.ok) {
          throw new Error("Failed to delete category");
        }
        await onRefreshCategories();
        showToast("Category deleted successfully!");
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Failed to delete category");
      } finally {
        setDeletingCategoryId(null);
      }
    }
  };

  const getMainCategoryName = (main: string) => {
    const names: Record<string, string> = {
      icon: "Icon",
      image: "Image",
      video: "Video",
      logo: "Logo"
    };
    return names[main] || main;
  };

  const getSubCategoryName = (main: string, sub: string) => sub;

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      showToast("Please enter all password fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("Passwords do not match");
      return;
    }
    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      if (!response.ok) {
        throw new Error("Password update failed");
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showToast("Password updated successfully!");
    } catch {
      showToast("Failed to update password");
    }
  };

  useEffect(() => {
    if (!isAdmin) {
      onNavigate("admin");
    }
  }, [isAdmin, onNavigate]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      onRefreshIcons(searchQuery).catch(() => null);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchQuery, onRefreshIcons]);

  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <i className="fas fa-icons"></i>
            <span>IconLibrary Admin</span>
          </div>

          <div className="header-actions">
            <div className="admin-badge">
              <i className="fas fa-shield-alt"></i>
              <span>{adminName}</span>
            </div>

            <ThemeToggle
              checked={theme === "dark"}
              onChange={onToggleTheme}
            />

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
              <i className="fas fa-user-shield"></i>
            </div>
            <div className="admin-name">{adminName}</div>
            <div className="admin-role">Super Admin</div>
          </div>

          <div className="stats-grid">
            <div className="stat-box">
              <div className="stat-value">{totalIcons}</div>
              <div className="stat-label">Total Icons</div>
            </div>
            <div className="stat-box">
              <div className="stat-value">{rawCategories.length}</div>
              <div className="stat-label">Categories</div>
            </div>
          </div>

          <div
            className={`menu-item ${activeSection === "upload" ? "active" : ""}`}
            onClick={() => setActiveSection("upload")}
          >
            <i className="fas fa-cloud-upload-alt"></i>
            <span>Upload Icon</span>
          </div>
          <div
            className={`menu-item ${activeSection === "manage" ? "active" : ""}`}
            onClick={() => setActiveSection("manage")}
          >
            <i className="fas fa-edit"></i>
            <span>Manage Icons</span>
          </div>
          <div
            className={`menu-item ${
              activeSection === "categories" ? "active" : ""
            }`}
            onClick={() => setActiveSection("categories")}
          >
            <i className="fas fa-tags"></i>
            <span>Categories</span>
          </div>
          <div
            className={`menu-item ${
              activeSection === "settings" ? "active" : ""
            }`}
            onClick={() => setActiveSection("settings")}
          >
            <i className="fas fa-cog"></i>
            <span>Settings</span>
          </div>
        </aside>

        <section className="content">
          {activeSection === "upload" && (
            <div>
              <div className="content-header">
                <h2 className="content-title">Upload New Icon</h2>
              </div>

              <div
                className={`upload-area ${
                  uploadedFile ? "upload-area-success" : ""
                }`}
                onClick={() =>
                  document.getElementById("fileInput")?.click()
                }
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  handleFileSelect(event.dataTransfer.files[0] || null);
                }}
              >
                <i className="fas fa-cloud-upload-alt"></i>
                <h3>Click to upload or drag and drop</h3>
                <p>PNG, JPG, SVG, GIF, MP4 (Max 50MB)</p>
                <input
                  type="file"
                  id="fileInput"
                  accept="image/*,video/*"
                  style={{ display: "none" }}
                  onChange={(event) =>
                    handleFileSelect(event.target.files?.[0] || null)
                  }
                />
              </div>

              {fileInfo ? (
                <div className="file-preview">
                  <div className="file-info">
                    <span>
                      <i
                        className="fas fa-check-circle"
                        style={{ color: "var(--success)" }}
                      ></i>{" "}
                      {fileInfo.name}
                    </span>
                    <span>{fileInfo.size}</span>
                  </div>
                </div>
              ) : null}

              <div className="form-group">
                <label>Icon Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter icon name"
                  value={iconName}
                  onChange={(event) => setIconName(event.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Category</label>
                <select
                  className="category-select"
                  value={iconCategory}
                  onChange={(event) => setIconCategory(event.target.value)}
                >
                  {categoryGroups.map((group) => (
                    <optgroup key={group.main} label={getMainCategoryName(group.main)}>
                      {group.subs.map((sub) => (
                        <option
                          key={`${group.main}-${sub}`}
                          value={`${group.main}-${sub}`}
                        >
                          {getSubCategoryName(group.main, sub)}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Tags (comma separated)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g., food, pizza, italian"
                  value={iconTags}
                  onChange={(event) => setIconTags(event.target.value)}
                />
              </div>

              <button
                type="button"
                className="btn btn-success"
                style={{ width: "100%" }}
                onClick={handleUploadIcon}
                disabled={isUploading}
              >
                <i className="fas fa-save"></i>{" "}
                {isUploading ? "Uploading..." : "Save Icon"}
              </button>
            </div>
          )}

          {activeSection === "manage" && (
            <div>
              <div className="content-header">
                <h2 className="content-title">Manage Icons</h2>
              </div>

              <div className="search-box">
                <i className="fas fa-search"></i>
                <input
                  type="text"
                  placeholder="Search icons..."
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setIconPage(1);
                  }}
                />
              </div>

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Preview</th>
                      <th>Name</th>
                      <th>Category</th>
                      <th>Date</th>
                      <th>Size</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedIcons.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: "center" }}>
                          No icons found
                        </td>
                      </tr>
                    ) : (
                      paginatedIcons.map((icon) => (
                        <tr key={icon.id}>
                          <td>
                            <img
                              src={icon.fileData || "https://via.placeholder.com/40"}
                              className="icon-preview-small"
                              alt={icon.name}
                            />
                          </td>
                          <td>{icon.name}</td>
                          <td>
                            <span className="category-tag">
                              {getMainCategoryName(icon.mainCategory)} /{" "}
                              {getSubCategoryName(
                                icon.mainCategory,
                                icon.subCategory
                              )}
                            </span>
                          </td>
                          <td>{icon.date || "N/A"}</td>
                          <td>{icon.fileSize || "N/A"}</td>
                          <td>
                            <div className="action-btns">
                              <button
                                className="action-btn edit"
                                type="button"
                                onClick={() => handleEditIcon(icon)}
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                              <button
                                className="action-btn delete"
                                type="button"
                                onClick={() => handleDeleteIcon(icon.id)}
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              {totalIconPages > 1 && (
                <div className="pagination">
                  <button 
                    disabled={iconPage === 1} 
                    onClick={() => setIconPage(p => p - 1)}
                    className="btn btn-outline"
                  >
                    Previous
                  </button>
                  <span>Page {iconPage} of {totalIconPages}</span>
                  <button 
                    disabled={iconPage === totalIconPages} 
                    onClick={() => setIconPage(p => p + 1)}
                    className="btn btn-outline"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}

          {activeSection === "categories" && (
            <div>
              <div className="content-header">
                <h2 className="content-title">Categories</h2>
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={() => {
                    setEditingCategoryId(null);
                    setCategoryMain("icon");
                    setSubCategoryName("");
                    setShowCategoryModal(true);
                  }}
                >
                  <i className="fas fa-plus"></i> Add Category
                </button>
              </div>

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Main Category</th>
                      <th>Sub Category</th>
                      <th>Icon Count</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rawCategories.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: "center" }}>
                          No categories found. Add one to get started.
                        </td>
                      </tr>
                    ) : (
                      rawCategories.map((cat) => {
                        const count = icons.filter(
                          (icon) =>
                            icon.mainCategory.toLowerCase() === cat.main.toLowerCase() &&
                            icon.subCategory.toLowerCase() === cat.sub.toLowerCase()
                        ).length;
                        return (
                          <tr key={cat._id}>
                            <td>{getMainCategoryName(cat.main)}</td>
                            <td>{cat.sub}</td>
                            <td>{count}</td>
                            <td>
                              <div className="action-btns">
                                <button
                                  className="action-btn edit"
                                  type="button"
                                  data-testid={`edit-category-${cat._id}`}
                                  onClick={() => handleEditCategory(cat)}
                                >
                                  <i className="fas fa-edit"></i>
                                </button>
                                <button
                                  className="action-btn delete"
                                  type="button"
                                  data-testid={`delete-category-${cat._id}`}
                                  disabled={deletingCategoryId === cat._id}
                                  onClick={() => handleDeleteCategory(cat._id)}
                                >
                                  <i className={`fas ${deletingCategoryId === cat._id ? "fa-spinner fa-spin" : "fa-trash"}`}></i>
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
            </div>
          )}

          {activeSection === "settings" && (
            <div>
              <div className="content-header">
                <h2 className="content-title">Admin Settings</h2>
              </div>

              <div className="form-group">
                <label>Current Password</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Current password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                />
              </div>

              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="New password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Confirm Password</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </div>

              <button className="btn btn-primary" type="button" onClick={handleChangePassword}>
                <i className="fas fa-save"></i> Update Password
              </button>

              <hr style={{ margin: "2rem 0", borderColor: "var(--border)" }} />

              <h3 style={{ marginBottom: "1rem" }}>Storage Settings</h3>
              <div className="form-group">
                <label>Max File Size (MB)</label>
                <input type="number" className="form-control" defaultValue={5} />
              </div>

              <div className="form-group">
                <label>Allowed File Types</label>
                <select
                  className="category-select"
                  multiple
                  defaultValue={["PNG", "JPG", "SVG", "GIF"]}
                >
                  <option value="PNG">PNG</option>
                  <option value="JPG">JPG</option>
                  <option value="SVG">SVG</option>
                  <option value="GIF">GIF</option>
                </select>
              </div>
            </div>
          )}
        </section>
      </main>

      <div className={`modal ${showEditModal ? "active" : ""}`}>
        <div className="modal-content">
          <div className="modal-header">
            <h3>Edit Icon</h3>
            <button
              className="modal-close"
              type="button"
              onClick={() => setShowEditModal(false)}
            >
              &times;
            </button>
          </div>

          <div className="form-group">
            <label>Icon Name</label>
            <input
              type="text"
              className="form-control"
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Category</label>
            <select
              className="category-select"
              value={editCategory}
              onChange={(event) => setEditCategory(event.target.value)}
            >
              {categoryGroups.map((group) => (
                <optgroup key={group.main} label={getMainCategoryName(group.main)}>
                  {group.subs.map((sub) => (
                    <option key={`${group.main}-${sub}`} value={`${group.main}-${sub}`}>
                      {getSubCategoryName(group.main, sub)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Tags</label>
            <input
              type="text"
              className="form-control"
              value={editTags}
              onChange={(event) => setEditTags(event.target.value)}
            />
          </div>

          <button
            type="button"
            className="btn btn-success"
            style={{ width: "100%" }}
            onClick={handleSaveEdit}
          >
            <i className="fas fa-save"></i> Save Changes
          </button>
        </div>
      </div>

      <div className={`modal ${showCategoryModal ? "active" : ""}`}>
        <div className="modal-content">
          <div className="modal-header">
            <h3>{editingCategoryId ? "Edit Category" : "Add Category"}</h3>
            <button
              className="modal-close"
              type="button"
              onClick={() => {
                setShowCategoryModal(false);
                setEditingCategoryId(null);
                setSubCategoryName("");
              }}
            >
              &times;
            </button>
          </div>

          <div className="form-group">
            <label>Main Category</label>
            <select
              className="category-select"
              value={categoryMain}
              onChange={(event) => setCategoryMain(event.target.value)}
            >
              <option value="icon">Icon</option>
              <option value="logo">Logo</option>
              <option value="image">Image</option>
              <option value="video">Video</option>
            </select>
          </div>

          <div className="form-group">
            <label>Sub Category Name</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g., Animals"
              value={subCategoryName}
              onChange={(event) => setSubCategoryName(event.target.value)}
            />
          </div>

          <button
            type="button"
            className="btn btn-success"
            style={{ width: "100%" }}
            disabled={isSavingCategory}
            onClick={editingCategoryId ? handleSaveCategoryUpdate : handleAddCategory}
          >
            <i className={`fas ${isSavingCategory ? "fa-spinner fa-spin" : (editingCategoryId ? "fa-save" : "fa-plus")}`}></i>
            {isSavingCategory ? " Saving..." : (editingCategoryId ? " Save Changes" : " Add Category")}
          </button>
        </div>
      </div>

      <div className={`toast ${toastMessage ? "show" : ""}`}>
        {toastMessage}
      </div>
    </>
  );
};

export default AdminPanel;
