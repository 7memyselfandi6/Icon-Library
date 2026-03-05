
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { IconEntry } from "../App";

type IconListProps = {
  icons: IconEntry[];
  apiBaseUrl: string;
};

const IconList = ({ icons, apiBaseUrl }: IconListProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    icons.forEach((icon) => {
      set.add(`${icon.mainCategory}::${icon.subCategory}`);
    });
    return Array.from(set.values()).sort();
  }, [icons]);

  useEffect(() => {
    if (activeCategory === "all") return;
    if (!categoryOptions.includes(activeCategory)) {
      setActiveCategory("all");
    }
  }, [activeCategory, categoryOptions]);

  const filteredIcons = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return icons.filter((icon) => {
      const matchesQuery = query
        ? `${icon.name} ${icon.mainCategory} ${icon.subCategory}`
            .toLowerCase()
            .includes(query)
        : true;
      const matchesCategory =
        activeCategory === "all" ||
        `${icon.mainCategory}::${icon.subCategory}` === activeCategory;
      return matchesQuery && matchesCategory;
    });
  }, [icons, searchQuery, activeCategory]);

  const openPreview = (icon: IconEntry) => {
    const url =
      icon.fileData || `${apiBaseUrl}/api/icons/${encodeURIComponent(String(icon.id))}/preview`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <div className="search-section">
        <input
          className="search-input"
          type="text"
          placeholder="Search icons..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
      </div>

      <div className="categories">
        <button
          type="button"
          className={`category-btn ${activeCategory === "all" ? "active" : ""}`}
          onClick={() => setActiveCategory("all")}
        >
          All
        </button>
        {categoryOptions.map((category) => {
          const [main, sub] = category.split("::");
          return (
            <button
              key={category}
              type="button"
              className={`category-btn ${activeCategory === category ? "active" : ""}`}
              onClick={() => setActiveCategory(category)}
            >
              {main} / {sub}
            </button>
          );
        })}
      </div>

      <div className="icon-grid">
        {filteredIcons.length === 0 ? (
          <div className="empty-state">No icons found</div>
        ) : (
          filteredIcons.map((icon) => {
            const size = icon.fileSize || icon.size;
            const categoryLabel = `${icon.mainCategory} / ${icon.subCategory}`;
            const previewUrl =
              icon.fileData ||
              `${apiBaseUrl}/api/icons/${encodeURIComponent(String(icon.id))}/preview`;
            const downloadUrl = `${apiBaseUrl}/api/icons/${encodeURIComponent(
              String(icon.id)
            )}/download`;
            const isVideo =
              icon.type === "video" || icon.type?.startsWith("video/");

            return (
              <div key={icon.id} className="icon-card">
                <div className="icon-preview">
                  {isVideo ? (
                    <video src={previewUrl} muted playsInline />
                  ) : (
                    <img src={previewUrl} alt={icon.name} />
                  )}
                </div>
                <div className="icon-name">{icon.name}</div>
                <div className="icon-category">
                  {categoryLabel}
                  {size ? ` • ${size}` : ""}
                </div>
                <div className="icon-actions">
                  <button
                    type="button"
                    className="icon-action-btn"
                    onClick={() => openPreview(icon)}
                  >
                    View
                  </button>
                  <a className="icon-action-btn download" href={downloadUrl}>
                    Download
                  </a>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
};

export default IconList;
