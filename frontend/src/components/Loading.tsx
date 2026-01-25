import { useEffect, useState } from "react";
import { Spinner } from "react-bootstrap";
import { LoadingType } from "../types/ComponentType";

export default function Loading({
  isLoading = false,
  style = {},
  variant = "light",
  position = "center",
}: LoadingType) {
  return (
    <div
      style={{
        position: position == "center" ? "absolute" : "static",
        transform: position == "center" ? "translate(-50%, -50%)" : "none",
        top: "50%",
        left: "50%",
        zIndex: 999,
        filter: "drop-shadow(0px 0px 10px #5b5a5a76)",
        ...style,
      }}
    >
      {isLoading && <Spinner animation="border" variant={variant}/>}
    </div>
  );
}
