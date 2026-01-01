import { TextField } from "@mui/material";
import "../css/login.css";
import { useState } from "react";
import BuzzBeeLogo from "../images/BuzzBee_Logo.PNG";
import { useAuth } from "../auth/Auth";
import axios from "axios";
import Loading from "../util/Loading";
import { Spinner } from "react-bootstrap";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [errorText, setErrorText] = useState("");
  const { signIn } = useAuth();
  const [loginInput, setLoginInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  async function submitLogin() {
    setIsLoading(true);
    if (loginInput.trim().length == 0) {
      changeErrorText("Please input a correct username");
      return;
    }
    try {
      await signIn(loginInput);
      setIsLoading(false);

      toast("Navigating to homepage...", {
        position: "top-right",
        autoClose: 3000,
        type: "success",
      });

      setTimeout(() => {
        navigate("/");
      }, 4000);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.data?.error == "no rows in result set") {
          changeErrorText("Invalid username");
        }
      } else {
        changeErrorText("An unexpected error occurred");
      }
    }
  }

  function changeErrorText(text: string) {
    setTimeout(() => {
      setIsLoading(false);
      setErrorText(text);
    }, 800);
  }

  return (
    <div style={{ backgroundColor: "var(--milk-white)" }}>
      {<Loading isLoading={isLoading} />}
      <div
        id="login-form-container"
        className="d-flex align-items-center justify-content-center"
      >
        <div id="login-form-main-div">
          <h1 id="login-title">
            Login <img src={BuzzBeeLogo} id="login-logo-img" />
          </h1>

          <div>
            <p id="login_username_label">Username: </p>
            <TextField
              error={errorText.trim().length > 0}
              id="login_username_input"
              size="small"
              value={loginInput}
              onChange={(e) => {
                setLoginInput(e.target.value);
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  fontFamily: "Segoe UI",
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor:
                      errorText.trim().length > 0
                        ? "var(--oak-red)"
                        : "#43434239",
                    borderWidth: errorText.trim().length > 0 ? "2px" : "1.5px",
                  },
                  "&.Mui-focused": {
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor:
                        errorText.trim().length > 0
                          ? "var(--oak-red)"
                          : "var(--branch-brown)",
                    },
                  },
                  "&:hover:not(.Mui-focused)": {
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor:
                        errorText.trim().length > 0
                          ? "var(--oak-red)"
                          : "#8e4f2d69",
                    },
                  },
                },
              }}
              fullWidth
            />
            <p id="login-error-text">{errorText}</p>
          </div>
          <button
            type="button"
            className="btn btn-primary zoom-in"
            id="login-btn"
            onClick={() => submitLogin()}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
