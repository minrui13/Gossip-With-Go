import { useNavigate, useSearchParams } from "react-router-dom";
import "../css/createpost.css";
import { useEffect, useState } from "react";
import { TopicDefaultResult } from "../types/TopicsType";
import { TagDefaultType } from "../types/TagType";
import { useAuth } from "../auth/Auth";
import { getAllTags } from "../api/tagApi";
import {
  getTopicByURL,
  getTopicsByPopularityAndSearch,
} from "../api/topicsApi";
import Loading from "../components/Loading";
import { toast } from "react-toastify";
import { nanoid } from "nanoid";
import { addPost } from "../api/postsApi";
import slugify from "slugify";
import {
  Autocomplete,
  InputAdornment,
  MenuItem,
  Select,
  TextField,
  Tooltip,
} from "@mui/material";
import { matchString } from "../utils/UtilsFunction";
import BuzzBeeLogo from "../images/BuzzBee_Logo.PNG";

export default function CreatePost() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [topicArr, setTopicArr] = useState<TopicDefaultResult[]>([]);
  const [topicSearchInput, setTopicSearchInput] = useState("");
  const [topicInfo, setTopicInfo] = useState<TopicDefaultResult | null>(null);
  const [topicErrorText, setTopicErrorText] = useState("");
  const [postTitleInput, setPostTitleInput] = useState("");
  const [postTitleInputError, setPostTitleInputError] = useState("");
  const [postContentInput, setPostContentInput] = useState("");
  const [postContentInputError, setPostContentInputError] = useState("");
  const [tagArr, setTagArr] = useState<TagDefaultType[]>([]);
  const [selectedTagVal, setSelectedTagVal] = useState("none");
  const [isLoading, setIsLoading] = useState(false);
  const LIMIT = 10;
  const navigate = useNavigate();

  useEffect(() => {
    retrieveAllTags();
    const hiveUrlParam = searchParams.get("hive_url");
    if (hiveUrlParam) {
      retrieveTopicByURL(hiveUrlParam);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchTopics(topicSearchInput);
    }, 300);

    return () => clearTimeout(timer);
  }, [topicSearchInput]);

  async function retrieveTopicByURL(url: string) {
    try {
      const payload = {
        user_id: user?.user_id ?? 0,
        topic_url: url,
      };
      const result = await getTopicByURL(payload);
      setTopicInfo(result);
    } catch (error) {
      navigate("/404");
    }
  }

  async function retrieveAllTags() {
    try {
      const result = await getAllTags();
      setTagArr(result);
    } catch (e) {}
  }

  async function createPost() {
    try {
      setIsLoading(true);
      if (topicInfo == null) {
        setTopicErrorText("please select a hive to buzz in");
        toast.error("Please select a hive to buzz in", { autoClose: 2000 });
        setIsLoading(false);
        return;
      }
      if (postTitleInput.trim().length == 0) {
        setPostTitleInputError("title cannot be empty");
        toast.error("Title cannot be empty", { autoClose: 2000 });
        setIsLoading(false);
        return;
      }
      if (postContentInput.trim().length == 0) {
        setPostContentInputError("content cannot be empty");
        toast.error("Content cannot be empty", { autoClose: 2000 });

        setIsLoading(false);
        return;
      }
      const token = localStorage.getItem("token");
      const tagID =
        tagArr.find((ele) => ele.tag_name == selectedTagVal)?.tag_id ?? null;
      const postURL = `${slugify(postTitleInput, {
        lower: true,
        strict: true,
      })}-${nanoid(5)}`;

      const payload = {
        tag_id: tagID,
        user_id: user?.user_id ?? 0,
        topic_id: topicInfo?.topic_id ?? 0,
        title: postTitleInput,
        content: postContentInput,
        post_url: postURL,
        token: token,
      };

      const result = await addPost(payload);
      toast.success("Buzz created successfully!", { autoClose: 3000 });
      setTimeout(() => {
        toast.success("Navigating to buzz page...", { autoClose: 3000 });
      }, 1000);
      setTimeout(() => {
        navigate(`/buzz/${result.post_url}`);
      }, 3000);
    } catch (e) {
      toast.error("Error creating buzz. Please try again.", {
        autoClose: 2000,
      });
    } finally {
      setTimeout(() => {
        setIsLoading(false);
      }, 3000);
    }
  }

  async function searchTopics(search: string) {
    try {
      const result = await getTopicsByPopularityAndSearch({
        limit: LIMIT,
        user_id: user?.user_id || 0,
        search: search.toLowerCase(),
        cursor: null,
      });
      setTopicArr(result.result);
    } catch (e) {
      setTopicArr([]);
    }
  }

  return (
    <div className="create-post-container">
      <Loading
        isLoading={isLoading}
        variant="success"
        style={{
          filter: "drop-shadow(0px 0px 10px #82828256)",
        }}
      />
      <div className="create-post-main-div">
        <h1 className="create-post-heading">
          Create a Buzz{" "}
          <img src={BuzzBeeLogo} className="signup-login-logo-img" />
        </h1>
        <div className="d-flex flex-column" style={{ gap: 20 }}>
          <div>
            <p className="create-post-label">Select a hive</p>
            <Autocomplete
              options={topicArr ?? []}
              value={topicInfo ?? undefined}
              inputValue={topicSearchInput}
              openOnFocus
              noOptionsText={
                <p id="create-post-topic-no-option">No hive found</p>
              }
              sx={{
                ".MuiOutlinedInput-root": {
                  padding: "2px 5px 2px 15px !important",
                  borderRadius: "15px",
                  backgroundColor: "var(--milk-white)",
                  fontSize: " 14px",
                  fontFamily: "Segoe UI",
                  "text-shadow": "0.2px 0 currentColor",
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor:
                      topicErrorText.length > 0
                        ? "var(--oak-red)"
                        : "#8e4f2d69",
                  },
                  "&.Mui-focused": {
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor:
                        topicErrorText.length > 0
                          ? "var(--oak-red)"
                          : "var(--wood-brown)",
                    },
                  },
                },
                "& .MuiInputBase-input::placeholder": {
                  color: "#432616c3",
                  fontWeight: 500,
                },
              }}
              filterOptions={(options, { inputValue }) =>
                options.filter((option) =>
                  option.topic_name
                    .toLowerCase()
                    .includes(inputValue.toLowerCase()),
                )
              }
              renderInput={(params) => (
                <TextField
                  className="nav-search-list-textfield"
                  {...params}
                  placeholder={"Which hive do you want to buzz in?"}
                  sx={{
                    width: 400,
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
                            style={{ color: "rgb(134, 83, 56)" }}
                          ></i>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              )}
              getOptionKey={(option) => option?.topic_id}
              getOptionLabel={(option) => option?.topic_name}
              isOptionEqualToValue={(option, value) =>
                option?.topic_id === value?.topic_id
              }
              renderOption={(props, option) => {
                return (
                  <li
                    {...props}
                    key={props.key}
                    className="create-post-topic-search-option "
                  >
                    <i
                      className={`${option.category_icon} create-post-topic-search-option-icon`}
                    />
                    <p>
                      {topicSearchInput?.trim()?.length > 0
                        ? matchString(topicSearchInput, option.topic_name)
                        : option.topic_name}
                    </p>
                  </li>
                );
              }}
              onInputChange={(_, value, reason) => {
                setTopicSearchInput(value);
              }}
              onChange={(_, value) => {
                setTopicErrorText("");
                setTopicInfo(value);
              }}
            />

            <p className="post-page-comment-textfield-error create-post-error ">
              {topicErrorText}
            </p>
          </div>

          <div>
            <p className="post-postpage-comment-edit-content-label ">
              Select Tag
            </p>
            <Select
              value={selectedTagVal}
              id="main-page-filter-select"
              sx={{
                padding: 0,
                "& .MuiSelect-select": {
                  padding: 0,
                  fontSize: 14,
                  "text-shadow": "0.2px 0 currentColor",
                  backgroundColor: "#ffdb78",
                  color: "#6d3c21",
                },
                "& .MuiOutlinedInput-notchedOutline": {
                  border: "1.7px solid #6d3c21",
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  border: "1.7px solid var(--wood-brown)",
                },
                "& .MuiSelect-icon": {
                  color: "#6d3c21",
                },
              }}
              MenuProps={{
                MenuListProps: {
                  sx: {
                    padding: 0,
                    "& .MuiMenuItem-root": {
                      color: "var(--wood-brown)",
                      backgroundColor: "var(--milk-white)",
                      fontSize: 14,
                      fontFamily: "Segoe UI",
                      textAlign: "center",
                      padding: 0,
                      "text-shadow": "0.2px 0 currentColor",
                    },

                    "& .MuiMenuItem-root:hover": {
                      backgroundColor: "var(--cream-yellow)",
                      color: "#d69d00",
                      padding: 0,
                    },

                    "& .MuiMenuItem-root.Mui-selected": {
                      // backgroundColor: "#fddf85 !important",
                      backgroundColor: "var(--canary-yellow)",
                      color: "#6d3c21",
                      "text-shadow": "0.3px 0 currentColor",
                      padding: 0,
                    },
                  },
                },
              }}
              onChange={(e) => {
                setSelectedTagVal(e.target.value);
              }}
            >
              <MenuItem value={"none"}>
                <div
                  style={{
                    padding: "13px 10px",
                    width: "100%",
                    textAlign: "start",
                  }}
                >
                  None
                </div>
              </MenuItem>
              {tagArr.map((tagEle) => (
                <MenuItem value={tagEle.tag_name}>
                  <Tooltip
                    title={tagEle.tag_description}
                    placement="right"
                    slotProps={{
                      tooltip: {
                        sx: {
                          color: "var(--milk-white)",
                          backgroundColor: "var(--caramel-brown)",
                          fontFamily: "Segoe UI",
                          fontSize: "12px",
                          marginLeft: "15px",
                        },
                      },
                    }}
                  >
                    <div
                      style={{
                        padding: "13px 10px",
                        width: "100%",
                        textAlign: "start",
                      }}
                    >
                      <p className="post-item-tag-menu-item-label">
                        <i
                          className={`${tagEle.tag_icon} post-item-tag-menu-item-icon`}
                        />
                        {tagEle.tag_name}
                      </p>
                    </div>
                  </Tooltip>
                </MenuItem>
              ))}
            </Select>
          </div>
          <div>
            <p className="post-postpage-comment-edit-content-label ">
              Edit Title
            </p>
            <TextField
              fullWidth
              multiline
              value={postTitleInput}
              onChange={(e) => {
                const value = e.target.value;
                if (value.trim().length > 150) {
                  setPostTitleInputError("must be less than 150 characters");
                } else {
                  setPostTitleInput(value);
                  setPostTitleInputError("");
                }
              }}
              onBlur={() => {
                if (postTitleInput.trim().length == 0) {
                  setPostTitleInputError("title cannot be empty");
                } else {
                  setPostTitleInputError("");
                }
              }}
              sx={{
                padding: 0,
                "& .MuiInputBase-input": {
                  padding: "15px 10px",
                  color: " var(--wood-brown)",
                  fontFamily: "zabal",
                  fontSize: 30,
                  lineHeight: 1.2,
                  textShadow: "0.2px 0 currentColor",
                  backgroundColor: "#fff9ec4b",
                },
                "& .MuiOutlinedInput-root": {
                  borderRadius: "15px",
                  padding: 0,
                  fontSize: "15px",
                  fontFamily: "Segoe UI",
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor:
                      postTitleInputError.trim().length > 0
                        ? "var(--oak-red)"
                        : "#674e3937",
                    borderWidth:
                      postTitleInputError.trim().length > 0 ? "2px" : "1.5px",
                  },
                  "&.Mui-focused": {
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor:
                        postTitleInputError.trim().length > 0
                          ? "var(--oak-red)"
                          : "#693b22d4",
                    },
                  },
                  "&:hover:not(.Mui-focused)": {
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor:
                        postTitleInputError.trim().length > 0
                          ? "var(--oak-red)"
                          : "#43261681",
                    },
                  },
                },
              }}
            />
            <div
              className={`mt-1 d-flex justify-content-${postTitleInputError.trim().length > 0 ? "between" : "end"} align-items-center`}
            >
              {postTitleInputError.trim().length > 0 && (
                <p className="post-page-comment-textfield-error">
                  {postTitleInputError}
                </p>
              )}
              <p className="post-page-comment-textfield-end-adornment">
                <span
                  style={{
                    color:
                      postTitleInputError.length > 0
                        ? "var(--oak-red)"
                        : " rgba(128, 128, 128, 0.5)",
                  }}
                >
                  {postTitleInput.trim().length}
                </span>
                /150
              </p>
            </div>
          </div>
          <div>
            <p className="post-postpage-comment-edit-content-label ">
              Edit Content
            </p>
            <TextField
              fullWidth
              value={postContentInput}
              multiline
              minRows={3}
              className="post-item-edit-content-textfield"
              onChange={(e) => {
                const value = e.target.value;
                if (value.trim().length > 3000) {
                  setPostContentInputError("must be less than 3000 characters");
                } else {
                  setPostContentInput(value);
                }
              }}
              onBlur={() => {
                if (postContentInput.trim().length == 0) {
                  setPostContentInputError("content cannot be empty");
                } else {
                  setPostContentInputError("");
                }
              }}
              sx={{
                padding: 0,
                "& .MuiInputBase-input": {
                  padding: "15px 10px",
                  color: "#693b22",
                  textShadow: "0.2px 0 currentColor",
                  backgroundColor: "#fff9ec4b",
                },
                "& .MuiOutlinedInput-root": {
                  borderRadius: "15px",
                  padding: 0,
                  fontSize: "15px",
                  fontFamily: "Segoe UI",
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor:
                      postContentInputError.trim().length > 0
                        ? "var(--oak-red)"
                        : "#674e3937",
                    borderWidth:
                      postContentInputError.trim().length > 0 ? "2px" : "1.5px",
                  },
                  "&.Mui-focused": {
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor:
                        postContentInputError.trim().length > 0
                          ? "var(--oak-red)"
                          : "var(--honey-yellow)",
                    },
                  },
                  "&:hover:not(.Mui-focused)": {
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor:
                        postContentInputError.trim().length > 0
                          ? "var(--oak-red)"
                          : "#efb33370",
                    },
                  },
                },
              }}
            />
            <div
              className={`mt-1 d-flex justify-content-${postContentInputError.trim().length > 0 ? "between" : "end"} align-items-center`}
            >
              {postContentInputError.trim().length > 0 && (
                <p className="post-page-comment-textfield-error">
                  {postContentInputError}
                </p>
              )}
              <p className="post-page-comment-textfield-end-adornment">
                <span
                  style={{
                    color:
                      postContentInputError.length > 0
                        ? "var(--oak-red)"
                        : " rgba(128, 128, 128, 0.5)",
                  }}
                >
                  {postContentInput.trim().length}
                </span>
                /3000
              </p>
            </div>
          </div>
          <div className="d-flex justify-content-end post-postpage-comment-edit-btn-div">
            <button
              type="button"
              //disabled
              className="btn comment-component-reply-btn branchbrown-branchbrown-milkwhite-hover honeyyellow-hazelnutbrown-hazelnutbrown"
              onClick={() => {
                createPost();
              }}
            >
              submit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
