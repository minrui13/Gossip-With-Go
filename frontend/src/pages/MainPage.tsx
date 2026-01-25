import { MenuItem, Select } from "@mui/material";
import { useAuth } from "../auth/Auth";
import { useEffect, useRef, useState } from "react";
import {
  deletePost,
  getPostsByFollowAndPopularity,
  getPostsByPopularityAndSearch,
} from "../api/postsApi";
import "../css/mainpage.css";
import { PostIsFollowingResultType } from "../types/PostType";
import Post from "../components/Post";
import { calculateDate } from "../utils/UtilsFunction";
import Loading from "../components/Loading";
import BuzzBeeScrollToTop from "../images/BeeScrollToTop.PNG";
import { useNavigate, useSearchParams } from "react-router-dom";
import NotLogin from "../components/NotLogin";
import { getAllTags } from "../api/tagApi";
import { TagDefaultType } from "../types/TagType";
import { toast } from "react-toastify";

export default function MainPage() {
  const { user } = useAuth();
  const [showNotLogin, setShowNotLogin] = useState(false);
  const [postArr, setPostArr] = useState<PostIsFollowingResultType[]>([]);
  const limit = 10;
  const [isMore, setIsMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sortByValue, setSortByValue] = useState("buzzing");
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [tagsArr, setTagArr] = useState<TagDefaultType[]>([]);
  const mainPageDivRef = useRef<HTMLDivElement | null>(null);
  const sortData = [
    { value: "buzzing", name: "Buzzing" },
    { value: "alpha", name: "A-Z" },
    { value: "new", name: "New" },
  ];
  const navigate = useNavigate();

  useEffect(() => {
    retrieveAllTags();
    const mainDiv = mainPageDivRef.current;
    if (!mainDiv) return;

    const handleScroll = () => {
      if (mainDiv.scrollTop > 300) {
        document
          .getElementById("main-page-scroll-to-top-btn")
          ?.classList.remove("fade-out");
      } else {
        document
          .getElementById("main-page-scroll-to-top-btn")
          ?.classList.add("fade-out");
      }
      setTimeout(() => {
        setShowScrollToTop(mainDiv.scrollTop > 300);
      }, 200);
    };

    mainDiv.addEventListener("scroll", handleScroll);

    return () => mainDiv.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    retrievePost();
  }, [sortByValue]);

  useEffect(() => {
    const sortBy = searchParams.get("sortBy");
    if (sortData.some((ele) => ele.value == sortBy)) {
      setSortByValue(sortBy ?? "");
    }
  }, [searchParams.get("sortBy")]);

  async function retrievePost() {
    try {
      setIsLoading(true);
      if (!user) {
        const payload = {
          user_id: 0,
          limit: limit,
          search: "",
          cursor: cursor,
          ...(sortByValue !== "buzzing" && { filter: sortByValue }),
        };

        const resultJSON = await getPostsByPopularityAndSearch(payload);
        setCursor(resultJSON.cursor);
        const result = resultJSON.result;
        if (resultJSON.cursor) {
          setIsMore(true);
        } else {
          setIsMore(false);
        }
        const formattedResult = result.map((ele) => ({
          ...ele,
          created_date: calculateDate(ele.created_date),
        }));

        setPostArr((prev) => {
          const prevArr = [...prev];
          formattedResult.forEach((formattedEle) => {
            if (
              !prevArr.some(
                (prevEle) => prevEle.post_id == formattedEle.post_id,
              )
            ) {
              prevArr.push(formattedEle);
            }
          });
          return prevArr;
        });
      } else {
        //try to get token
        const token = localStorage.getItem("token");

        const payload = {
          user_id: user.user_id,
          limit: limit,
          search: "",
          token: token,
          cursor: cursor,
          ...(sortByValue !== "buzzing" && { filter: sortByValue }),
        };

        const resultJSON = await getPostsByFollowAndPopularity(payload);
        setCursor(resultJSON.cursor);
        const result = resultJSON.result;
        if (resultJSON.cursor) {
          setIsMore(true);
        } else {
          setIsMore(false);
        }
        const formattedResult = result.map((ele) => ({
          ...ele,
          created_date: calculateDate(ele.created_date),
        }));
        setPostArr((prev) => {
          const prevArr = [...prev];
          formattedResult.forEach((formattedEle) => {
            if (
              !prevArr.some(
                (prevEle) => prevEle.post_id == formattedEle.post_id,
              )
            ) {
              prevArr.push(formattedEle);
            }
          });
          return prevArr;
        });
      }
    } catch (e) {
    } finally {
      setTimeout(() => {
        setIsLoading(false);
      }, 1000);
    }
  }

  async function changeSortByFilter(val: string) {
    setCursor(null);
    setPostArr([]);
    setIsMore(false);
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set("sortBy", val);
      params.delete("cursor");
      return params;
    });
  }

  function displayNotLogin() {
    setShowNotLogin(true);
  }

  async function retrieveAllTags() {
    try {
      const result = await getAllTags();
      setTagArr(result);
    } catch (e) {
      toast.error("cannot get tags", { autoClose: 2000 });
    }
  }

  async function removePost(postid: number) {
    try {
      setIsLoading(true);
      const result = await deletePost(postid);

      toast.success("post is successfully deleted!", {
        autoClose: 2000,
      });
      setTimeout(() => {
        setPostArr((prev) =>
          prev.filter((post) => post.post_id !== result.post_id),
        );
      }, 2000);
    } catch (e) {
      toast.error("post is not deleted! error!", {
        autoClose: 2000,
      });
    } finally {
      setTimeout(() => {
        setIsLoading(false);
      }, 2000);
    }
  }

  return (
    <div className="main-page-container">
      <NotLogin
        isShown={showNotLogin}
        onClose={() => {
          setShowNotLogin(false);
        }}
      />
      <div className="main-page-main-div" ref={mainPageDivRef}>
        <div className="main-page-filter-div d-flex justify-content-end pe-5 pt-2">
          <Select
            value={sortByValue}
            id="main-page-filter-select"
            sx={{
              "& .MuiSelect-select": {
                padding: 1,
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
                    "text-shadow": "0.2px 0 currentColor",
                  },

                  "& .MuiMenuItem-root:hover": {
                    backgroundColor: "var(--canary-yellow)",
                    color: "#d69d00",
                  },

                  "& .MuiMenuItem-root.Mui-selected": {
                    // backgroundColor: "#fddf85 !important",
                    backgroundColor: "var(--canary-yellow)",
                    color: "#6d3c21",
                    "text-shadow": "0.3px 0 currentColor",
                  },
                },
              },
            }}
            onChange={(e) => {
              changeSortByFilter(e.target.value);
            }}
          >
            {sortData.map((sortEle) => (
              <MenuItem value={sortEle.value}>{sortEle.name}</MenuItem>
            ))}
          </Select>
        </div>
        {showScrollToTop && (
          <button
            id="main-page-scroll-to-top-btn"
            className={`main-page-scroll-to-top btn main-page-scroll-to-top-btn ${
              showScrollToTop ? "show" : ""
            }`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              document.querySelector(".main-page-main-div")?.scrollTo({
                top: 0,
                left: 0,
                behavior: "smooth",
              });
            }}
          >
            <img
              src={BuzzBeeScrollToTop}
              id=""
              className="main-page-scroll-to-top-img fade-in"
            />
          </button>
        )}
        {isLoading && postArr.length == 0 ? (
          <Loading isLoading={isLoading} variant="success" />
        ) : (
          <div className="main-page-post-div">
            {postArr.map((postEle) => (
              <Post
                key={postEle.post_id}
                post_id={postEle.post_id}
                post_url={postEle.post_url}
                user_id={postEle.user_id}
                username={postEle.username}
                display_name={postEle.display_name}
                user_image={postEle.user_image}
                topic_id={postEle.topic_id}
                topic_user_id={postEle.topic_user_id}
                topic_name={postEle.topic_name}
                category_icon={postEle.category_icon}
                tag_name={postEle.tag_name}
                tag_icon={postEle.tag_icon}
                tag_description={postEle.tag_description}
                title={postEle.title}
                content={postEle.content}
                created_date={postEle.created_date}
                vote_id={postEle.vote_id}
                upvote_count={postEle.upvote_count}
                downvote_count={postEle.downvote_count}
                vote_status={postEle.vote_status}
                comment_count={postEle.comment_count}
                bookmark_id={postEle.bookmark_id}
                is_bookmarked={postEle.is_bookmarked}
                onNotLogin={displayNotLogin}
                tagsArr={tagsArr}
                removePost={removePost}
              />
            ))}
            {isMore &&
              (isLoading ? (
                <Loading
                  isLoading={isLoading}
                  position="static"
                  variant="success"
                />
              ) : (
                <button
                  disabled={isLoading}
                  onClick={() => {
                    retrievePost();
                  }}
                  type="button"
                  className="branchbrown-woodbrown-milkwhite main-page-load-more-btn btn canaryyellow-branchbrown-branchbrown-hover"
                >
                  Load More?
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
