import { IconButton, InputAdornment, TextField } from "@mui/material";
import "../css/login.css";
import { useEffect, useRef, useState } from "react";
import BuzzBeeLogo from "../images/BuzzBee_Logo.PNG";
import { useAuth } from "../auth/Auth";
import axios from "axios";
import Loading from "../components/Loading";
import { Spinner } from "react-bootstrap";
import { toast } from "react-toastify";
import { replace, useNavigate } from "react-router-dom";
import Error from "../utils/Error";
import handleError from "../utils/Error";

export default function Login() {
  //sign in method in useAuth
  const { signIn } = useAuth();
  //login input
  const [loginInput, setLoginInput] = useState({
    username: "",
    password: "",
  });
  //error text for username
  const [errorText, setErrorText] = useState("");
  //manage loading
  const [isLoading, setIsLoading] = useState(false);
  //toggle password visibilty
  const [showPasswordVisibility, setShowPasswordVisibility] = useState(false);
  //navigate user to another page
  const navigate = useNavigate();

  const form = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (form?.current) {
      form.current.classList.add("signup-login-form-main-div-reset");
    }
  
  }, []);

  async function submitLogin() {
    setIsLoading(true);
    //Check if user input anythinf
    if (
      loginInput.username.trim().length == 0 &&
      loginInput.password.trim().length == 0
    ) {
      changeErrorText("Please input a username and a password");
      return;
    } else if (loginInput.username.trim().length == 0) {
      changeErrorText("Please input a username");
      return;
    } else if (loginInput.password.trim().length == 0) {
      changeErrorText("Please input a password");
      return;
    }
    try {
      await signIn(loginInput);
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
      setTimeout(() => {
        setIsLoading(false);
      }, 3000);
    }
  }

  function changeErrorText(text: string) {
    setTimeout(() => {
      //stop loading
      setIsLoading(false);
      //display error text
      setErrorText(text);
    }, 800);
  }

  return (
    <div style={{ backgroundColor: "var(--milk-white)" }}>
      {<Loading isLoading={isLoading} />}
      <div
        className="d-flex align-items-center justify-content-center 
        signup-login-form-container"
      >
        <div
          className="signup-login-form-main-div"
          id="login-form-main-div"
          ref={form}
        >
          <h1 className="signup-login-title">
            Login <img src={BuzzBeeLogo} className="signup-login-logo-img" />
          </h1>

          <div className="d-flex flex-column" style={{ gap: 5 }}>
            {/*Username*/}
            <div>
              <p id="login-username-label" className="login-signup-label">
                Username:{" "}
              </p>
              <TextField
                disabled={isLoading}
                error={errorText.toLowerCase().includes("username")}
                id="login_username_input"
                size="small"
                value={loginInput.username}
                onChange={(e) => {
                  setLoginInput((prev) => ({
                    ...prev,
                    username: e.target.value,
                  }));
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    fontFamily: "Segoe UI",
                    fontSize: " 14.5px",
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: errorText.toLowerCase().includes("username")
                        ? "var(--oak-red)"
                        : "#43434239",
                      borderWidth: errorText.toLowerCase().includes("username")
                        ? "2px"
                        : "1.5px",
                    },
                    "&.Mui-focused": {
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: errorText
                          .toLowerCase()
                          .includes("username")
                          ? "var(--oak-red)"
                          : "var(--caramel-brown)",
                      },
                    },
                    "&:hover:not(.Mui-focused)": {
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: errorText
                          .toLowerCase()
                          .includes("username")
                          ? "var(--oak-red)"
                          : "#8e4f2d69",
                      },
                    },
                  },
                }}
                fullWidth
              />
            </div>
            {/*Password*/}
            <div>
              <p id="login-username-label" className="login-signup-label">
                Password:{" "}
              </p>
              <TextField
                type={showPasswordVisibility ? "text" : "password"}
                disabled={isLoading}
                error={errorText.toLowerCase().includes("password")}
                id="login_username_input"
                size="small"
                value={loginInput.password}
                onChange={(e) => {
                  setLoginInput((prev) => ({
                    ...prev,
                    password: e.target.value,
                  }));
                }}
                slotProps={{
                  input: {
                    //Add search button to the end of the textfield
                    endAdornment: (
                      <InputAdornment
                        position="end"
                        style={{ marginRight: 10, cursor: "pointer" }}
                      >
                        <IconButton
                          disabled={isLoading}
                          className="sign-up-login-password-visibility"
                          onClick={() => {
                            setShowPasswordVisibility((prev) => !prev);
                          }}
                          edge="end"
                        >
                          <i
                            className={
                              showPasswordVisibility
                                ? `fa-solid fa-eye`
                                : `fa-solid fa-eye-slash`
                            }
                          ></i>
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    fontFamily: "Segoe UI",
                    fontSize: " 14.5px",
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: errorText.toLowerCase().includes("password")
                        ? "var(--oak-red)"
                        : "#43434239",
                      borderWidth: errorText.toLowerCase().includes("password")
                        ? "2px"
                        : "1.5px",
                    },
                    "&.Mui-focused": {
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: errorText
                          .toLowerCase()
                          .includes("password")
                          ? "var(--oak-red)"
                          : "var(--caramel-brown)",
                      },
                    },
                    "&:hover:not(.Mui-focused)": {
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: errorText
                          .toLowerCase()
                          .includes("password")
                          ? "var(--oak-red)"
                          : "#8e4f2d69",
                      },
                    },
                  },
                }}
                fullWidth
              />
            </div>
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
