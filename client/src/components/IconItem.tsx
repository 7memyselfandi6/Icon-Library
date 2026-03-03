import React from "react";
import { IconEntry } from "../App";

type IconItemProps = {
  icon: IconEntry;
  onPreview: (icon: IconEntry) => void;
  onCopyHtml: (icon: IconEntry) => void;
  onDownload: (icon: IconEntry) => void;
};

const IconItem = ({ icon, onPreview, onCopyHtml, onDownload }: IconItemProps) => {
  const isVideo = (icon.type || "").startsWith("video");
  return (
    <div className="icon-card">
      <div className="icon-preview">
        {isVideo ? (
          <video
            src={icon.fileData || ""}
            controls
            muted
            playsInline
          />
        ) : (
          <img
            src={icon.fileData || "https://via.placeholder.com/64"}
            alt={icon.name}
          />
        )}
      </div>
      <div className="icon-name">{icon.name}</div>
      <div className="icon-category">
        {icon.mainCategory} / {icon.subCategory}
      </div>
      <div className="icon-actions">
        <button
          type="button"
          className="icon-action-btn"
          onClick={() => onPreview(icon)}
        >
          <i className="fas fa-eye"></i> Preview
        </button>
        <button
          type="button"
          className="icon-action-btn"
          onClick={() => onCopyHtml(icon)}
        >
          <i className="fas fa-code"></i> HTML
        </button>
        <button
          type="button"
          className="icon-action-btn download"
          onClick={() => onDownload(icon)}
        >
          <i className="fas fa-download"></i> Download
        </button>
      </div>
    </div>
  );
};

export default IconItem;
