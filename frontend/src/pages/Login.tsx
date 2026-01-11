import { TextField } from "@mui/material";
import "../css/login.css";
import { useState } from "react";
import BuzzBeeLogo from "../images/BuzzBee_Logo.PNG";
import { useAuth } from "../auth/Auth";
import axios from "axios";
import Loading from "../components/Loading";
import { Spinner } from "react-bootstrap";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import Error from "../utils/Error";
import handleError from "../utils/Error";

export default function Login() {
  //sign in method in useAuth
  const { signIn } = useAuth();
  //login input
  const [loginInput, setLoginInput] = useState("");
  //error text for username
  const [errorText, setErrorText] = useState("");
  //manage loading
  const [isLoading, setIsLoading] = useState(false);
  //navigate user to another page
  const navigate = useNavigate();

  async function submitLogin() {
    setIsLoading(true);
    //Check if user input anythinf
    if (loginInput.trim().length == 0) {
      changeErrorText("Please input a username");
      return;
    }
    try {
      await signIn(loginInput);
      //stop loading
      setIsLoading(false);
      //use toast to notify users
      toast("Login successfully!", {
        autoClose: 4000,
        type: "success",
      });
      setTimeout(() => {
        setIsLoading(true);
        toast("Navigating to homepage...", {
          autoClose: 3000,
          type: "success",
        });
      }, 1000);
      //navigate to homepage
      setTimeout(() => {
        navigate("/");
      }, 5000);
    } catch (error) {
      //handle errors
      handleError(error, {
        onAxiosError: (err) => {
          changeErrorText(err);
        },
        onOtherError: (err) => {
          changeErrorText(err);
        },
      });
    }
  }

  function changeErrorText(text: string) {
    setTimeout(() => {
      //stop loading
      setIsLoading(false);
      //display error text
      setErrorText(text);
      //notify users
      toast(text, {
        autoClose: 3000,
        type: "error",
      });
    }, 800);
  }

  return (
   
    <div style={{ backgroundColor: "var(--milk-white)" }}> 
      {<Loading isLoading={isLoading} />}
      <div
        className="d-flex align-items-center justify-content-center 
        signup-login-form-container"
      >
        <div className="signup-login-form-main-div" id="login-form-main-div">
          <h1 className="signup-login-title">
            Login <img src={BuzzBeeLogo} className="signup-login-logo-img" />
          </h1>

          <div>
            <p id="login-username-label" className="login-signup-label">
              Username:{" "}
            </p>
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
                          : "var(--caramel-brown)",
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
            <p id="login-error-text" className="signup-login-error-text">
              {errorText}
            </p>
          </div>
          <div style={{ width: "100%" }}>
            <button
              style={{ width: "100%" }}
              type="button"
              disabled={isLoading}
              className="btn milkwhite-woodbrown-woodbrown milkwhite-woodbrown-woodbrown-hover zoom-in"
              onClick={() => submitLogin()}
            >
              Submit
            </button>
            <p className="signup-login-note">
              Don't have an account? <a href="/signup">Sign up here</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
