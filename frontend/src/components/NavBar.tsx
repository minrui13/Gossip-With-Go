import { Container, Nav, Navbar, NavDropdown } from "react-bootstrap";
import "../css/navBar.css";
import Logo from "../images/Logo_with_text.PNG";
import {
  Autocomplete,
  Chip,
  createFilterOptions,
  InputAdornment,
  TextField,
  Tooltip,
} from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import DefaultImage from "../images/BuzzBeeNotFound.PNG";
import { useAuth } from "../auth/Auth";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getTopicsByPopularityAndSearch } from "../api/topicsApi";
import { getPostsByPopularityAndSearch } from "../api/postsApi";
import { NavSearchOptions } from "../types/ComponentType";
import Loading from "./Loading";
import { TopicDefaultResult } from "../types/TopicsType";
import { toast } from "react-toastify";
import BuzzBeeLogout from "../images/BuzzBeeLogout.PNG";

export default function NavBar() {
  const navigate = useNavigate();
  const { user, isAuthLoading, verifyToken, signOut } = useAuth();
  //options for Autocomplete to find topics/posts
  const [searchOptionsArr, setSearchOptionsArr] = useState<NavSearchOptions[]>(
    [],
  );
  //search input value for options/post
  const [searchInputArr, setSearchInputArr] = useState<NavSearchOptions[]>([]);
  //current new value
  const [currentInput, setCurrentInput] = useState("");
  const searchPlaceholder = "Search Anything";
  const [showCreateDropdown, setShowCreateDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [searchTopicsArr, setSearchTopicsArr] = useState<TopicDefaultResult[]>(
    [],
  );
  const LIMIT = 5;
  const OFFSET = 0;

  useEffect(() => {
    async function initiateNavBar() {
      await searchTopicsAndPosts("");
    }
    initiateNavBar();
  }, []);

  //match string and then bold the part where the string mtaches
  function matchString(matchString: string, string: string) {
    const regex = new RegExp(`(${matchString})`, "ig");
    const parts = string.split(regex);
    return (
      string.trim().length > 0 &&
      parts.map((part, index) =>
        regex.test(part) ? (
          <span key={index}>{part}</span>
        ) : (
          <span key={index} style={{ fontWeight: 600 }}>
            {part}
          </span>
        ),
      )
    );
  }

  //for the search box
  async function searchTopicsAndPosts(search: string) {
    try {
      //search for both topics and posts concurrently
      const [topicsResponse, postsResponse] = await Promise.all([
        await getTopicsByPopularityAndSearch({
          limit: LIMIT,
          offset: OFFSET,
          search: search.toLowerCase(),
        }),
        await getPostsByPopularityAndSearch({
          limit: LIMIT,
          search: search.toLowerCase(),
          user_id: 0,
          cursor: null,
        }),
      ]);
      setSearchTopicsArr(topicsResponse);
      setSearchOptionsArr([
        ...topicsResponse.map((t) => ({
          id: t.topic_id,
          title: t.topic_name,
          type: "Topic",
        })),
        ...postsResponse.result.map((p) => ({
          id: p.post_id,
          title: p.title,
          type: "Post",
        })),
      ]);
    } catch (e) {}
  }

  function handleSignOut() {
    toast.success(`Signing out...`, {
      autoClose: 3000,
    });

    setTimeout(() => {
      signOut();
      if (window.location.pathname == "/") {
        window.location.reload();
      } else {
        navigate("/");
      }
    }, 3000);
  }

  return (
    <Navbar expand="lg" fixed="top" className="nav-container">
      <div className="container-fluid m-0 p=0">
        <Navbar.Toggle aria-controls="collapse-nav" />
        <Navbar.Collapse id="collapse-nav">
          <Nav className="me-auto mb-2 mb-lg-0 align-items-center justify-content-between nav-div">
            {/*Logo - all users*/}
            <Nav.Link className="nav-link p-0" href="/">
              <img src={Logo} width={170} />
            </Nav.Link>
            {/*Autocomplete search - all users */}

            <Autocomplete
              disableClearable
              freeSolo
              options={
                searchInputArr.length > 1 ||
                searchInputArr.some((ele) => ele.type == "Post")
                  ? []
                  : searchInputArr.length > 0
                    ? searchOptionsArr.filter((ele) => ele.type == "Post")
                    : searchOptionsArr
              }
              inputValue={currentInput}
              multiple
              openOnFocus
              sx={{
                ".MuiOutlinedInput-root": {
                  padding: "2px 5px 2px 15px !important",
                  borderRadius: "17px",
                  backgroundColor: "var(--milk-white)",
                  fontSize: " 14px",
                  fontFamily: "Segoe UI",
                  fontWeight: "thick",
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
                  fontWeight: 500,
                },
              }}
              renderInput={(params) => (
                <TextField
                  className="nav-search-list-textfield"
                  {...params}
                  placeholder={
                    currentInput.length > 0 || searchInputArr.length > 0
                      ? ""
                      : searchPlaceholder
                  }
                  sx={{
                    width: 600,
                    fontSize: "14px",
                  }}
                  slotProps={{
                    input: {
                      ...params.InputProps,
                      //Add search button to the end of the textfield
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
              //render the value in the autocomplete
              //for topics - display with chips
              //for posts - display normally
              renderValue={(value, getItemProps) => {
                return (
                  <div
                    className="d-flex align-items-center"
                    style={{ gap: 10 }}
                  >
                    {value.map((item, index) => {
                      const option =
                        typeof item === "string" ? { title: item } : item;
                      const { key, ...itemProps } = getItemProps({ index });
                      return searchInputArr[index].type == "Topic" ? (
                        <Chip
                          key={key}
                          {...itemProps}
                          className="nav-search-value-chip"
                          sx={{
                            fontFamily: "Segoe UI",
                            fontWeight: 500,
                            color: "var(--wood-brown)",
                            backgroundColor: "var(--canary-yellow)",
                            "&:hover:not(.Mui-focused)": {
                              "& .MuiChip-deleteIcon": {
                                color: "var(--honey-yellow)",
                              },
                            },
                            "& .MuiChip-deleteIcon": {
                              color: "var(--wood-brown)",
                            },
                          }}
                          label={option.title}
                          onDelete={() =>
                            setSearchInputArr((prev) =>
                              prev.filter((ele) => ele.title !== option.title),
                            )
                          }
                        />
                      ) : (
                        <p
                          key={key}
                          {...itemProps}
                          className="nav-search-value"
                        >
                          {option.title}
                        </p>
                      );
                    })}
                  </div>
                );
              }}
              renderGroup={(params) => (
                <div key={params.key}>
                  <p className="nav-search-list-title">{params.group}</p>
                  <ul className="nav-search-list">{params.children}</ul>
                </div>
              )}
              groupBy={(option) => option.type}
              getOptionKey={(option) => {
                return typeof option === "string" ? option : option.id;
              }}
              getOptionLabel={(option) => {
                return typeof option === "string" ? option : option.title;
              }}
              isOptionEqualToValue={(option, value) =>
                option.type == "Topic" &&
                option.title.toLowerCase() === value.title.toLowerCase()
              }
              filterOptions={(option) => option}
              renderOption={(props, option) => {
                return (
                  <li
                    {...props}
                    key={props.key}
                    className="nav-search-list-item"
                  >
                    <p>
                      {currentInput.trim().length > 0
                        ? matchString(currentInput, option.title)
                        : option.title}
                    </p>
                  </li>
                );
              }}
              onInputChange={(_, value, reason) => {
                setCurrentInput(value);
                searchTopicsAndPosts(value);
              }}
              onChange={(_, value) => {
                var lastIndex = searchInputArr.length - 1;
                if (
                  value.length < searchInputArr.length &&
                  searchInputArr[lastIndex].type == "Post"
                ) {
                  //this is when the prev input to search for post is derived from an option but instead of removing the option when user backspace,
                  //it trims the character of the option
                  setCurrentInput(searchInputArr[lastIndex].title.slice(0, -1));
                } else {
                  //reset current Input
                  setCurrentInput("");
                }
                //add value to arr
                setSearchInputArr(
                  value.map((ele) =>
                    typeof ele === "string"
                      ? { id: searchInputArr.length, title: ele, type: "Post" }
                      : ele,
                  ),
                );
              }}
              value={searchInputArr}
            />

            {/*public users */}
            {isAuthLoading ? (
              <div>
                <Loading
                  isLoading={isAuthLoading}
                  style={{ position: "static", transform: "none" }}
                />
              </div>
            ) : user ? (
              <div
                className="d-flex justify-content-between align-items-center"
                style={{ gap: 20 }}
              >
                {/*Sign in users */}
                {/* Create post / community - signed in users*/}
                {/* <button
                    className="btn nav-btn-members woodbrown-woodbrown-milkwhite milkwhite-woodbrown-woodbrown-hover nav-btn"
                    type="button"
                  >
                    Create <i className="fa-solid fa-plus"></i>
                  </button> */}
                <NavDropdown
                  title={
                    <p className="nav-create-dropdown-title">
                      Create <i className="fa-solid fa-plus"></i>
                    </p>
                  }
                  className="nav-dropdown nav-create-dropdown nav-btn-members woodbrown-woodbrown-milkwhite milkwhite-woodbrown-woodbrown-hover nav-btn p-0"
                  show={showCreateDropdown}
                  onMouseEnter={() => setShowCreateDropdown(true)}
                  onMouseLeave={() => setShowCreateDropdown(false)}
                >
                  <NavDropdown.Item
                    href="/"
                    style={{ borderTopRightRadius: 5, borderTopLeftRadius: 5 }}
                  >
                    Hive
                  </NavDropdown.Item>
                  <NavDropdown.Item
                    href="/"
                    style={{
                      borderBottomRightRadius: 5,
                      borderBottomLeftRadius: 5,
                    }}
                  >
                    Buzz
                  </NavDropdown.Item>
                </NavDropdown>
                {/* Profile - signed in users */}
                <NavDropdown
                  className="nav-profile-dropdown nav-dropdown"
                  show={showProfileDropdown}
                  onMouseEnter={() => setShowProfileDropdown(true)}
                  onMouseLeave={() => setShowProfileDropdown(false)}
                  title={
                    <div className="nav-profile-div">
                      <img
                        src={
                          user?.image_name
                            ? require(`../images/${user.image_name}`)
                            : DefaultImage
                        }
                        className="nav-profile-img"
                      />
                    </div>
                  }
                >
                  <NavDropdown.Item
                    href={`/profile/${user.user_id}`}
                    style={{ borderTopRightRadius: 5, borderTopLeftRadius: 5 }}
                  >
                    Profile
                  </NavDropdown.Item>
                  <NavDropdown.Item
                    onClick={() => handleSignOut()}
                    style={{
                      borderBottomRightRadius: 5,
                      borderBottomLeftRadius: 5,
                    }}
                  >
                    <Tooltip
                      title="Log Out"
                      slotProps={{
                        tooltip: {
                          sx: {
                            backgroundColor: "var(--canary-yellow)",
                            color: "var(--caramel-brown)",
                            fontFamily: "Segoe UI",
                          },
                        },
                      }}
                    >
                      <img
                        id="nav-profile-dropdown-logout-img"
                        src={BuzzBeeLogout}
                      />
                    </Tooltip>
                  </NavDropdown.Item>
                </NavDropdown>
              </div>
            ) : (
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
            )}
          </Nav>
        </Navbar.Collapse>
      </div>
    </Navbar>
  );
}
