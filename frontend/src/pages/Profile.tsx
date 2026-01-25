import { useEffect } from "react";
import { useAuth } from "../auth/Auth";
import "../css/profile.css";

import BuzzBeeSad from "../images/BuzzBeeSad.PNG";
export default function Profile() {
  const { user } = useAuth();

  return (
    <div id="profile-container">
      <div className="d-flex justify-content-center align-items-center">
        <div id="profile-img-container">
          <div id="profile-img-div">
            <img src={require(`../images/${user.image_name}`)} width={30} />
          </div>
        </div>
        <h1 style={{ color: "var(--wood-brown)" }}>{user.username}</h1>
      </div>
    </div>
  );
}
