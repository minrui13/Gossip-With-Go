import "../css/sideBar.css";

export default function SideBar() {
  return (
    <div className="sidebar-container">
      <ul>
        <li>
          <a href="/">Home</a>
        </li>
        <li>
          <a href="/">Buzzing Now</a>
        </li>
        <li>
          <a href="/">Explore Hives</a>
        </li>
      </ul>
    </div>
  );
}
