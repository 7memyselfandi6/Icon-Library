import React, { useMemo, useState } from "react";
import { IconEntry } from "../App";
import IconItem from "./IconItem";

type IconListProps = {
  icons: IconEntry[];
  apiBaseUrl: string;
};

const categories = ["all", "icon", "logo", "image", "video"] as const;

const IconList = ({ icons, apiBaseUrl }: IconListProps) => {
  const [query, setQuery] = useState("");
  const [currentFilter, setCurrentFilter] = useState<(typeof categories)[number]>(
    "all"
  );
  const [previewIcon, setPreviewIcon] = useState<IconEntry | null>(null);
  const [toastMessage, setToastMessage] = useState("");

  const filteredIcons = useMemo(() => {
    return icons.filter((icon) => {
      const matchesFilter =
        currentFilter === "all" || icon.mainCategory === currentFilter;
      const searchValue = query.trim().toLowerCase();
      const matchesSearch =
        searchValue.length === 0 ||
        icon.name.toLowerCase().includes(searchValue) ||
        icon.mainCategory.toLowerCase().includes(searchValue) ||
        icon.subCategory.toLowerCase().includes(searchValue);
      return matchesFilter && matchesSearch;
    });
  }, [icons, currentFilter, query]);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(""), 2000);
  };

  const isVideo = (icon: IconEntry | null) => (icon?.type || "").startsWith("video");

  const buildHtml = (icon: IconEntry) =>
    isVideo(icon)
      ? `<video src="${icon.fileData || ""}" controls width="320"></video>`
      : `<img src="${icon.fileData || ""}" alt="${icon.name}" width="32" height="32">`;

  const buildMarkdown = (icon: IconEntry) =>
    isVideo(icon)
      ? `[${icon.name}](${icon.fileData || ""})`
      : `![${icon.name}](${icon.fileData || ""})`;

  const handleCopyHtml = (icon: IconEntry) => {
    const html = buildHtml(icon);
    navigator.clipboard
      .writeText(html)
      .then(() => showToast("HTML copied to clipboard!"));
  };

  const handleCopyModal = (type: "html" | "markdown") => {
    if (!previewIcon) return;
    const html = buildHtml(previewIcon);
    const markdown = buildMarkdown(previewIcon);
    const text = type === "html" ? html : markdown;
    navigator.clipboard
      .writeText(text)
      .then(() => showToast(`${type.toUpperCase()} copied to clipboard!`));
  };

  const handleDownload = (icon: IconEntry) => {
    const iconId = icon.id;
    if (!iconId) {
      showToast("Icon download not available");
      return;
    }
    fetch(`${apiBaseUrl}/api/icons/${iconId}/download?type=file`)
      .then((response) => response.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = icon.fileName || icon.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        showToast(`Downloading ${icon.name}`);
      })
      .catch(() => {
        const content = `Sample icon: ${icon.name}`;
        const blob = new Blob([content], { type: "text/plain" });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = icon.name || "icon.txt";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        showToast(`Downloading ${icon.name}`);
      });
  };

  const modalHtml = previewIcon && buildHtml(previewIcon);
  const modalMarkdown = previewIcon && buildMarkdown(previewIcon);

  return (
    <>
      <div className="search-section">
        <input
          type="text"
          className="search-input"
          placeholder="Search icons by name or category..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="categories">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            className={`category-btn ${currentFilter === category ? "active" : ""}`}
            onClick={() => setCurrentFilter(category)}
          >
            {category === "all"
              ? "All"
              : category.charAt(0).toUpperCase() + category.slice(1)}
          </button>
        ))}
      </div>

      <div className="icon-grid">
        {filteredIcons.length === 0 ? (
          <div className="empty-state">No icons found</div>
        ) : (
          filteredIcons.map((icon) => (
            <IconItem
              key={icon.id}
              icon={icon}
              onPreview={setPreviewIcon}
              onCopyHtml={handleCopyHtml}
              onDownload={handleDownload}
            />
          ))
        )}
      </div>

      <div
        className={`modal ${previewIcon ? "active" : ""}`}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            setPreviewIcon(null);
          }
        }}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h2>{previewIcon?.name || "Icon Preview"}</h2>
            <button
              className="modal-close"
              type="button"
              onClick={() => setPreviewIcon(null)}
            >
              &times;
            </button>
          </div>

          <div className="modal-preview">
            {previewIcon && isVideo(previewIcon) ? (
              <video
                src={previewIcon.fileData || ""}
                controls
                muted
                playsInline
              />
            ) : (
              <img
                src={previewIcon?.fileData || "https://via.placeholder.com/128"}
                alt="Preview"
              />
            )}
          </div>

          <div className="icon-details">
            <p>
              <strong>Name:</strong> <span>{previewIcon?.name}</span>
            </p>
            <p>
              <strong>Category:</strong>{" "}
              <span>
                {previewIcon?.mainCategory} / {previewIcon?.subCategory}
              </span>
            </p>
            <p>
              <strong>Size:</strong>{" "}
              <span>{previewIcon?.fileSize || "Unknown"}</span>
            </p>
            <p>
              <strong>Path:</strong>{" "}
              <span>{previewIcon?.fileData || "Local file"}</span>
            </p>
          </div>

          <div className="code-section">
            <h3>HTML Code</h3>
            <div className="code-preview">{modalHtml}</div>
            <button
              className="copy-btn"
              type="button"
              onClick={() => handleCopyModal("html")}
            >
              <i className="fas fa-copy"></i> Copy HTML
            </button>
          </div>

          <div className="code-section">
            <h3>Markdown Code</h3>
            <div className="code-preview">{modalMarkdown}</div>
            <button
              className="copy-btn"
              type="button"
              onClick={() => handleCopyModal("markdown")}
            >
              <i className="fas fa-copy"></i> Copy Markdown
            </button>
          </div>

          <div className="modal-actions">
            <button
              className="download-btn"
              type="button"
              onClick={() => previewIcon && handleDownload(previewIcon)}
            >
              <i className="fas fa-download"></i> Download Icon
            </button>
            <button
              className="copy-btn"
              type="button"
              onClick={() => setPreviewIcon(null)}
              style={{ background: "var(--text-light)" }}
            >
              <i className="fas fa-times"></i> Close
            </button>
          </div>
        </div>
      </div>

      <div className={`toast ${toastMessage ? "show" : ""}`}>{toastMessage}</div>
    </>
  );
};

export default IconList;
