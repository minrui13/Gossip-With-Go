import { Autocomplete, Chip, InputAdornment, TextField } from "@mui/material";
import { useAuth } from "../auth/Auth";
import NavBar from "../components/NavBar";
import SideBar from "../components/SideBar";
import { NavSearchOptions } from "../types/ComponentType";
import { useEffect, useState } from "react";
import {
  getPostsByFollowAndPopularity,
  getPostsByPopularityAndSearch,
} from "../api/postsApi";
import "../css/mainpage.css";
import { Search } from "@mui/icons-material";
import { PostDefaultResultType, PostPopularityFollowResultType } from "../types/PostType";
import Post from "../components/Post";

export default function MainPage() {
  const { user } = useAuth();
  const [postArr, setPostArr] = useState<PostPopularityFollowResultType[]>([]);
  const [limit, setLimit] = useState(10);
  const [offset, setOffsets] = useState(0);

  useEffect(() => {
    initPost();
  }, []);

  async function initPost() {
    if (!user) {
      const payload = {
        user_id: 0,
        limit: limit,
        offset: offset,
        search: "",
      };

      const result = await getPostsByPopularityAndSearch(payload);
      setPostArr(result);
    } else {
      //try to get token
      const TOKEN = localStorage.getItem("token");

      const payload = {
        user_id: user.user_id,
        limit: limit,
        offset: offset,
        search: "",
        token: TOKEN,
      };

      const result = await getPostsByFollowAndPopularity(payload);

      setPostArr(result);
    }
  }

  return (
    <div className="main-page-container  overflow-y">
      <div className="main-page-main-div">
        {postArr.map((postEle) => (
          <Post
            post_id={postEle.post_id}
            user_id = {postEle.user_id}
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
      </div>
    </div>
  );
}
