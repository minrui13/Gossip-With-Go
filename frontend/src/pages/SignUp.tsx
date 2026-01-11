import { TextField } from "@mui/material";
import BuzzBeeLogo from "../images/BuzzBee_Logo.PNG";
import Loading from "../components/Loading";
import { useEffect, useState } from "react";
import "../css/signup.css";
import Modal from "../components/Modal";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { addNewUser, checkUserExists } from "../api/userApi";
import handleError from "../utils/Error";
import { getAllImages } from "../api/imageApi";
import { ProfileImageType } from "../types/SignUpType";
import BuzzBeeNotFound from "../images/BuzzBeeNotFound.PNG";
import Info from "../components/Info";

export default function SignUp() {
  //get available Profile image from database
  const [profileImgArr, setProfileImgArr] = useState<ProfileImageType[]>([]);

  //sign up inputs and error
  const [signUpInput, setSignUpInput] = useState({
    image_id: 1,
    username: "",
    display_name: "",
    bio: "",
  });
  const [inputError, setInputError] = useState({
    username: "",
    display_name: "",
    bio: "",
  });
  //modal for profile image
  const [openModal, setOpenModal] = useState(false);
  const [modalSelectedImg, setModalSelectedImg] = useState(
    signUpInput.image_id
  );
  //manage loading
  const [isLoading, setIsLoading] = useState(false);
  //navigate user to another page
  const navigate = useNavigate();

  useEffect(() => {
    getProfileImage();
  }, []);

  //get profile images for sign up form
  async function getProfileImage() {
    try {
      const response = await getAllImages();
      setProfileImgArr(response);
    } catch (error) {
      //handle error
      handleError(error);
    }
  }

  async function isUserExists() {
    try {
      const response = await checkUserExists({
        username: signUpInput.username,
      });
      return response.exists;
    } catch (error) {}
  }

  async function submitSignUp() {
    setIsLoading(true);
    if (signUpInput.username.trim().length < 3) {
      toast("Username must be 3-20 characters", {
        autoClose: 3000,
        type: "error",
      });
      setIsLoading(false);
      return;
    }
    if (await isUserExists()) {
      toast("Username already in use", {
        autoClose: 3000,
        type: "error",
      });
      setIsLoading(false);
      return;
    }
    try {
      var payload = signUpInput;
      if (signUpInput.display_name.trim().length == 0) {
        payload.display_name = signUpInput.username;
      }
      await addNewUser(signUpInput);
      //stop loading
      setIsLoading(false);
      //use toast to notify users
      toast("Sign Up successfully!", {
        autoClose: 4000,
        type: "success",
      });
      setTimeout(() => {
        setIsLoading(true);
        toast("Navigating to login page...", {
          autoClose: 3000,
          type: "success",
        });
      }, 1000);
      //navigate to login page
      setTimeout(() => {
        navigate("/login");
      }, 5000);
    } catch (error) {
      //handle errors
      handleError(error);
      setIsLoading(false);
    }
  }

  return (
    <div style={{ backgroundColor: "var(--milk-white)" }}>
      {<Loading isLoading={isLoading} />}
      <Modal
        dialogId="signup-modal-profile-img"
        open={openModal}
        onClose={() => {
          setOpenModal(false);
        }}
        content={
          <div>
            <div id="signup-modal-selected-profile-img-main-div">
              <div id="signup-modal-selected-profile-img">
                {
                  <img
                    src={
                      profileImgArr.length > 0
                        ? require(`../images/${
                            profileImgArr.find(
                              (ele) => ele.image_id == modalSelectedImg
                            )?.image_name
                          }`)
                        : BuzzBeeNotFound
                    }
                  />
                }
              </div>
            </div>
            <div id="signup-modal-profile-img-main-div">
              {profileImgArr.map((ele) => (
                <div
                  className="signup-modal-profile-img"
                  onClick={() => {
                    setModalSelectedImg(ele.image_id);
                  }}
                >
                  <img src={require(`../images/${ele.image_name}`)} />
                </div>
              ))}
            </div>
          </div>
        }
        action={
          <button
            type="button"
            className="btn branchbrown-branchbrown-milkwhite branchbrown-branchbrown-milkwhite-hover mb-1 me-1"
            onClick={() => {
              setSignUpInput((prev) => ({
                ...prev,
                image_id: modalSelectedImg,
              }));
              setOpenModal(false);
            }}
          >
            save changes
          </button>
        }
      />
      <div className="d-flex align-items-center justify-content-center signup-login-form-container">
        <div className="signup-login-form-main-div" id="signup-form-main-div">
          <h1 className="signup-login-title">
            Sign Up <img src={BuzzBeeLogo} className="signup-login-logo-img" />
          </h1>
          {/*Form*/}
          <div className="mt-1">
            {/*Profile Image*/}
            <div className="d-flex align-items-center" style={{ gap: 15 }}>
              <div id="signup-profile-img">
                <img
                  src={
                    profileImgArr.length > 0
                      ? require(`../images/${
                          profileImgArr.find(
                            (ele) => ele.image_id == signUpInput.image_id
                          )?.image_name
                        }`)
                      : BuzzBeeNotFound
                  }
                />
              </div>
              <button
                type="button"
                disabled={isLoading}
                className="btn"
                id="signup-profile-btn"
                onClick={() => {
                  setOpenModal(true);
                }}
              >
                change profile
              </button>
            </div>
            <div className="mt-2 mb-2">
              {/*Username */}
              <div>
                <p className="signup-label signup-login-label">
                  Username:{" "}
                  <Info
                    iconStyle={{ color: "var(--milk-white)" }}
                    title={
                      <ul style={{ padding: "10px 0px 0px 15px" }}>
                        <li className="mb-2">
                          Username must be 3-20 characters
                        </li>
                        <li>
                          Only allow lowercase alphabets, numbers, '-', '_' and
                          '.'
                        </li>
                      </ul>
                    }
                  />
                </p>
                <TextField
                  size="small"
                  value={signUpInput.username}
                  onChange={(e) => {
                    const value = e.target.value;
                    var regex = /^[a-zA-Z0-9._-]{0,21}$/;
                    if (!regex.test(value)) {
                      setInputError((prev) => ({
                        ...prev,
                        username: "Character not allowed",
                      }));
                    } else if (value.trim().length > 20) {
                      setInputError((prev) => ({
                        ...prev,
                        username: "Maximum only 20 characters",
                      }));
                    } else {
                      setInputError((prev) => ({
                        ...prev,
                        username: "",
                      }));
                      setSignUpInput((prev) => ({
                        ...prev,
                        username: value.trim().toLowerCase(),
                      }));
                    }
                  }}
                  onBlur={async () => {
                    if (signUpInput.username.trim().length < 3) {
                      setInputError((prev) => ({
                        ...prev,
                        username: "Username must be more than 3 characters",
                      }));
                    } else if (await isUserExists()) {
                      setInputError((prev) => ({
                        ...prev,
                        username: "Username already in use",
                      }));
                    } else {
                      setInputError((prev) => ({
                        ...prev,
                        username: "",
                      }));
                    }
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      fontFamily: "Segoe UI",
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor:
                          inputError.username.trim().length > 0
                            ? "var(--oak-red)"
                            : "#43434239",
                        borderWidth:
                          inputError.username.trim().length > 0
                            ? "2px"
                            : "1.5px",
                      },
                      "&.Mui-focused": {
                        "& .MuiOutlinedInput-notchedOutline": {
                          borderColor:
                            inputError.username.trim().length > 0
                              ? "var(--oak-red)"
                              : "#8e4f2d69",
                        },
                      },
                      "&:hover:not(.Mui-focused)": {
                        "& .MuiOutlinedInput-notchedOutline": {
                          borderColor:
                            inputError.username.trim().length > 0
                              ? "var(--oak-red)"
                              : "#8e4f2d69",
                        },
                      },
                    },
                  }}
                  fullWidth
                />
                {inputError.username.trim().length > 0 && (
                  <p className="signup-login-error-text signup-error-text">
                    {inputError.username}
                  </p>
                )}
              </div>
              {/*Display Name*/}
              <div className="mt-2">
                <p className="signup-label signup-login-label">
                  Display Name:{" "}
                  <Info
                    iconStyle={{ color: "#fff9ec" }}
                    title={
                      <ul style={{ padding: "10px 0px 0px 15px" }}>
                        <li className="mb-2">
                          Display name can be 0-20 characters
                        </li>
                        <li className="mb-2">
                          Only allow alphabets, numbers, '-', '_' and'.'
                        </li>
                        <li>Default display name will be the username</li>
                      </ul>
                    }
                  />
                </p>
                <TextField
                  size="small"
                  value={signUpInput.display_name}
                  onChange={(e) => {
                    const value = e.target.value;
                    var regex = /^[a-zA-Z0-9._\- ]{0,21}$/;
                    if (!regex.test(value)) {
                      setInputError((prev) => ({
                        ...prev,
                        display_name: "Character not allowed",
                      }));
                    } else if (value.trim().length > 20) {
                      setInputError((prev) => ({
                        ...prev,
                        display_name: "Maximum only 20 characters",
                      }));
                    } else {
                      setInputError((prev) => ({
                        ...prev,
                        display_name: "",
                      }));
                      setSignUpInput((prev) => ({
                        ...prev,
                        display_name: value,
                      }));
                    }
                  }}
                  onBlur={() => {
                    setInputError((prev) => ({
                      ...prev,
                      display_name: "",
                    }));
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      fontFamily: "Segoe UI",
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor:
                          inputError.display_name.trim().length > 0
                            ? "var(--oak-red)"
                            : "#43434239",
                        borderWidth:
                          inputError.display_name.trim().length > 0
                            ? "2px"
                            : "1.5px",
                      },
                      "&.Mui-focused": {
                        "& .MuiOutlinedInput-notchedOutline": {
                          borderColor:
                            inputError.display_name.trim().length > 0
                              ? "var(--oak-red)"
                              : "var(--caramel-brown)",
                        },
                      },
                      "&:hover:not(.Mui-focused)": {
                        "& .MuiOutlinedInput-notchedOutline": {
                          borderColor:
                            inputError.display_name.trim().length > 0
                              ? "var(--oak-red)"
                              : "#8e4f2d69",
                        },
                      },
                    },
                  }}
                  fullWidth
                />
                {inputError.display_name.trim().length > 0 && (
                  <p className="signup-login-error-text signup-error-text">
                    {inputError.display_name}
                  </p>
                )}
              </div>
              {/*Bio*/}
              <div className="mt-2">
                <p className="signup-label signup-login-label">Bio: </p>
                <TextField
                  size="small"
                  multiline
                  minRows={3}
                  maxRows={3}
                  value={signUpInput.bio}
                  onChange={(e) => {
                    console.log(e.target.value);
                    if (e.target.value.length <= 120) {
                      setSignUpInput((prev) => ({
                        ...prev,
                        bio: e.target.value,
                      }));
                    }
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      fontFamily: "Segoe UI",
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#43434239",
                        borderWidth: "1.5px",
                      },
                      "&.Mui-focused": {
                        "& .MuiOutlinedInput-notchedOutline": {
                          borderColor: "var(--caramel-brown)",
                        },
                      },
                      "&:hover:not(.Mui-focused)": {
                        "& .MuiOutlinedInput-notchedOutline": {
                          borderColor: "#8e4f2d69",
                        },
                      },
                    },
                  }}
                  fullWidth
                />
                <div className="d-flex justify-content-end">
                  <p
                    className="mt-1"
                    id="signup-bio-charCount"
                    style={{
                      color:
                        signUpInput.bio.trim().length >= 115
                          ? "var(--oak-red)"
                          : "#1d1d1d6e",
                    }}
                  >
                    {120 - signUpInput.bio.trim().length} characters left
                  </p>
                </div>
              </div>
            </div>
            <div style={{ width: "100%" }}>
              <button
                type="button"
                style={{ width: "100%" }}
                disabled={isLoading}
                className="btn milkwhite-woodbrown-woodbrown milkwhite-woodbrown-woodbrown-hover zoom-in"
                onClick={() => submitSignUp()}
              >
                Submit
              </button>
              <p className="signup-login-note">
                Have an account? <a href="/login">Login here</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
