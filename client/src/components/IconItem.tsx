
import * as React from "react";
import { IconEntry } from "../App";

const IconItem = ({ icon }: { icon: IconEntry }) => {
  return (
    <div className="icon-item">
      <img src={icon.fileData} alt={icon.name} />
      <div className="icon-info">
        <p>{icon.name}</p>
        <p>{icon.size}</p>
      </div>
    </div>
  );
};

export default IconItem;
