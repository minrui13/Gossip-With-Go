import {
  Autocomplete,
  Chip,
  InputAdornment,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import { useAuth } from "../auth/Auth";
import NavBar from "../components/NavBar";
import SideBar from "../components/SideBar";
import { NavSearchOptions } from "../types/ComponentType";
import { useEffect, useRef, useState } from "react";
import {
  getPostsByFollowAndPopularity,
  getPostsByPopularityAndSearch,
} from "../api/postsApi";
import "../css/mainpage.css";
import { Search } from "@mui/icons-material";
import {
  PostDefaultResultType,
  PostIsFollowingResultType
} from "../types/PostType";
import Post from "../components/Post";
import { calculateDate } from "../utils/UtilsFunction";
import Loading from "../components/Loading";
import BuzzBeeScrollToTop from "../images/BeeScrollToTop.PNG";
import { useSearchParams } from 'react-router-dom';

export default function MainPage() {
  const { user } = useAuth();
  const [postArr, setPostArr] = useState<PostIsFollowingResultType[]>([]);
  const limit = 10;
  const [isMore, setIsMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [initiate, setInitiate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sortByValue, setSortByValue] = useState("buzzing");
  const [showScrollToTop, setShowScrollToTop] = useState(false);
   const [searchParams, setSearchParams] = useSearchParams();
  
  const mainPageDivRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    retrievePost();
    setInitiate(true);
    const mainDiv = mainPageDivRef.current;
    if (!mainDiv) return;

    const handleScroll = () => {
      setShowScrollToTop(mainDiv.scrollTop > 300);
    };

    mainDiv.addEventListener("scroll", handleScroll);

    return () => mainDiv.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    retrievePost();
  }, [sortByValue]);

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
        if (!initiate) {
          setPostArr(formattedResult);
        } else {
          setPostArr((prev) => [...prev, ...formattedResult]);
        }
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
        if (!initiate) {
          setPostArr(formattedResult);
        } else {
          setPostArr((prev) => [...prev, ...formattedResult]);
        }
      }
    } catch (e) {
      console.error(e);
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
    setSortByValue(val);
  }

  return (
    <div className="main-page-container">
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
            <MenuItem value="buzzing">Buzzing</MenuItem>
            <MenuItem value="alpha">A-Z</MenuItem>
            <MenuItem value="new"> New</MenuItem>
          </Select>
        </div>
        {showScrollToTop && (
          <button
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
              className="main-page-scroll-to-top-img"
            />
          </button>
        )}
        {isLoading && postArr.length == 0 ? (
          <Loading isLoading={isLoading} variant="success" />
        ) : (
          <div className="main-page-post-div">
            {postArr.map((postEle) => (
              <Post
                post_id={postEle.post_id}
                post_url={postEle.post_url}
                user_id={postEle.user_id}
                username={postEle.username}
                user_image={postEle.user_image}
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
              />
            ))}
            {isMore &&
              (isLoading ? (
                <Loading
                  isLoading={isLoading}
                  style={{
                    position: "static",
                    transform: "none",
                    color: "var(--canary-yellow)",
                  }}
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
