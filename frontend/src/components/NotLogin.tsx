import { useState } from "react";
import { NotLoginType } from "../types/ComponentType";
import "../css/notlogin.css";
import BuzzBeeUhOh from "../images/BuzzBeeUhOh.PNG";
import { IconButton } from "@mui/material";

export default function NotLogin({ isShown = false, onClose }: NotLoginType) {
  return (
    <>
      {isShown && (
        <div className="not-login-container d-flex flex-column align-items-center justify-content-between">
          <div className="d-flex align-items-center justify-content-end">
            <IconButton
              aria-label="Close"
              sx={{
                position: "absolute",
                right: 10,
                top: 10,
                color: "var(--wood-brown)",
              }}
              onClick={onClose}
            >
              <i
                className="fa-solid fa-x dialog-close-icon"
                style={{ fontSize: 17 }}
              ></i>
            </IconButton>
          </div>
          <h1 className="not-login-heading">You are not login!</h1>
          <div>
            <img src={BuzzBeeUhOh} className="not-login-img" />
          </div>
          <div>
            <p className="not-login-note">
              Have an account? <a href="/login">Login here</a>
            </p>
            <p className="not-login-note">
              Don't have an account? <a href="/signup">Sign up here</a>
            </p>
          </div>
        </div>
      )}
    </>
  );
}
