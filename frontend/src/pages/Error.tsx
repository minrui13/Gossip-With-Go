import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../css/error.css";
import BuzzBee43NotFound from "../images/BuzzBee43NotFound.PNG";
import BuzzBee43Unauthorised from "../images/BuzzBee43Unauthorised.PNG";
import BuzzBeeUhOh from "../images/BuzzBeeUhOh.PNG";

type ErrorCode = {
  errorCode: string;
};

export default function Error({ errorCode }: ErrorCode) {
  const navigate = useNavigate();
  const [second, setSecond] = useState(3);

  const getErrorText = () => {
    switch (errorCode) {
      case "404":
        return "Oops! looks like you are lost...";
      case "401":
        return "Sorry, you are unauthorized to access this page.";
      default:
        return "Unknown Error!";
    }
  };

    useEffect(() => {
      setTimeout(() => {
        navigate("/");
      }, 3000);

      const intervalId = setInterval(() => {
        setSecond((prevSecond) => prevSecond - 1);
      }, 1000);

      return () => clearInterval(intervalId);
    }, []);

  return (
    <div id="error-container">
      <div id="error-main-div">
        <img
          src={
            errorCode == "404"
              ? BuzzBee43NotFound
              : errorCode == "401"
              ? BuzzBee43Unauthorised
              : BuzzBeeUhOh
          }
        />
        <h1>{getErrorText()}</h1>
        <p>Redirecting in {second} ...</p>
      </div>
    </div>
  );
}
