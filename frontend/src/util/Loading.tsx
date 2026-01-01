import { useEffect, useState } from "react";
import { Spinner } from "react-bootstrap";

type LoadingType = {
  isLoading: boolean;
};

export default function Loading({ isLoading = false }: LoadingType) {

  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        zIndex: 999,
        transform: "translate(-50%, -50%)",
        filter: "drop-shadow(0px 0px 10px #5b5a5a76)"
      }}
    >
      {isLoading && <Spinner animation="border" variant="light" />}
    </div>
  );
}
