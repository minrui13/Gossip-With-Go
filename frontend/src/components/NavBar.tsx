import { Container, Nav, Navbar } from "react-bootstrap";
import "../css/navBar.css";
import Logo from "../images/Logo_with_text.PNG";
import { Autocomplete, InputAdornment, TextField } from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import dummyProfile from "../images/BuzzBee1.PNG";
import { useAuth } from "../auth/Auth";
import { useNavigate } from "react-router-dom";

export default function NavBar() {
  const options = ["abc"];
  const searchPlaceholder = "Search Anything";

  return (
    <Navbar
      expand="lg"
      fixed="top"
      style={{ backgroundColor: "var(--honey-yellow)" }}
    >
      <div className="container-fluid m-0 p=0">
        <Navbar.Toggle aria-controls="collapse-nav" />
        <Navbar.Collapse id="collapse-nav">
          <Nav className="me-auto mb-2 mb-lg-0 align-items-center justify-content-between nav-div">
            {/*Logo - all users*/}
            <Nav.Link className="nav-link p-0" href="/">
              <img src={Logo} width={170} />
            </Nav.Link>
            {/*Autocomplete search - all users */}
            <Nav.Link className="nav-link" href="">
              <Autocomplete
                disableClearable
                freeSolo
                options={options}
                sx={{
                  " .MuiOutlinedInput-root": {
                    padding: "2px 5px 2px 10px !important",
                    borderRadius: "17px",
                    backgroundColor: "var(--milk-white)",
                    fontSize: " 14.5px",
                    fontFamily: "Segoe UI",
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#8e4f2d69",
                    },
                    "&.Mui-focused": {
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "var(--wood-brown)",
                      },
                    },
                  },
                  "& .MuiInputBase-input::placeholder": {
                    color: "#432616c3",
                  },
                }}
                renderInput={(params) => (
                  <TextField
                    sx={{
                      width: 400,
                    }}
                    {...params}
                    placeholder={searchPlaceholder}
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment
                            position="end"
                            style={{ marginRight: 10, cursor: "pointer" }}
                          >
                            <i
                              className="fas fa-search"
                              style={{ color: "#915d41ff" }}
                            ></i>
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                )}
              />
            </Nav.Link>

            {/*public users */}
   
              <div
                className="d-flex justify-content-between align-items-center"
                style={{ gap: 20 }}
              >
                {/*Sign up - public users */}
                <Nav.Link className="nav-link p-0" href="/signup">
                  <button
                    className="btn nav-btn-non-members branchbrown-branchbrown-milkwhite-hover nav-btn"
                    type="button"

                  >
                    Sign Up
                  </button>
                </Nav.Link>

                {/*Log in - public users */}
                <Nav.Link className="nav-link p-0" href="/login">
                  <button
                    className="btn  nav-btn-non-members branchbrown-branchbrown-milkwhite-hover nav-btn"
                    type="button"
                  >
                    Log In
                  </button>
                </Nav.Link>
              </div>
       
              <div
                className="d-flex justify-content-between align-items-center"
                style={{ gap: 20 }}
              >
                {/*Sign in users */}
                {/* Create post / community - signed in users*/}
                <Nav.Link className="nav-link p-0" href="">
                  <button
                    className="btn nav-btn-members woodbrown-woodbrown-milkwhite milkwhite-woodbrown-woodbrown-hover nav-btn"
                    type="button"
                  >
                    Create <i className="fa-solid fa-plus"></i>
                  </button>
                </Nav.Link>
                {/* Profile - signed in users */}
                <Nav.Link className="nav-link p-0" href="">
                  <div className="nav-profile-div">
                    <img src={dummyProfile} className="nav-profile-img" />
                  </div>
                </Nav.Link>
              </div>
      
          </Nav>
        </Navbar.Collapse>
      </div>
    </Navbar>
  );
}
