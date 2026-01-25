import { Outlet } from "react-router-dom";
import NavBar from "./NavBar";
import SideBar from "./SideBar";

export default function PageLayout() {
  return (
    <>
      <NavBar />
      {/* <SideBar /> */}
      <div className="page-layout-outlet">
        <Outlet />
      </div>
    </>
  );
}
