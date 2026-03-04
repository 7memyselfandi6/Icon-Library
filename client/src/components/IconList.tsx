
import * as React from "react";
import { IconEntry } from "../App";

const IconList = ({ icons, apiBaseUrl }: { icons: IconEntry[], apiBaseUrl: string }) => {
  return (
    <div className="icon-list">
      {icons.map((icon) => (
        <div key={icon.id} className="icon-item">
          <img src={icon.fileData} alt={icon.name} />
          <div className="icon-info">
            <p>{icon.name}</p>
            <p>{icon.size}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default IconList;
