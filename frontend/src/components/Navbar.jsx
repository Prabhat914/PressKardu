import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import API from "../services/api";
import { clearSession, getStoredUser } from "../utils/session";

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = getStoredUser();
  const isShopkeeper = currentUser?.role === "presswala";
  const isAdmin = currentUser?.role === "admin";
  const isAuthPage = location.pathname === "/login" || location.pathname === "/signup";
  const [unreadCount, setUnreadCount] = useState(0);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchPanelRef = useRef(null);

  useEffect(() => {
    setIsSearchOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!isSearchOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!searchPanelRef.current?.contains(event.target)) {
        setIsSearchOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isSearchOpen]);

  useEffect(() => {
    if (!currentUser) {
      setUnreadCount(0);
      return undefined;
    }

    let isMounted = true;

    const loadNotifications = async () => {
      try {
        const res = await API.get("/notifications");
        if (isMounted) {
          const count = Array.isArray(res.data)
            ? res.data.filter((item) => !item.isRead).length
            : 0;
          setUnreadCount(count);
        }
      } catch {
        if (isMounted) {
          setUnreadCount(0);
        }
      }
    };

    loadNotifications();
    const intervalId = window.setInterval(loadNotifications, 20000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [currentUser]);

  const handleLogout = () => {
    clearSession();
    navigate("/login");
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const query = searchQuery.trim();

    navigate(query ? `/shops?q=${encodeURIComponent(query)}` : "/shops");
    setSearchQuery("");
  };

  return (
    <header className={`site-nav ${isAuthPage ? "site-nav--auth" : ""}`}>
      <div className="site-nav__inner">
        <NavLink className="site-nav__brand" to={currentUser ? (isShopkeeper ? "/shops" : "/") : "/"}>
          <span className="site-nav__brand-mark">PK</span>
          <span className="site-nav__brand-copy">
            <strong>PressKardu</strong>
            <small>Fast local pressing</small>
            <span className="site-nav__brand-pulse">Live local network</span>
          </span>
        </NavLink>

        <nav className="site-nav__links" aria-label="Main navigation">
          <NavLink className="site-nav__link" to="/">
            Home
          </NavLink>
          <NavLink className="site-nav__link" to="/shops">
            Shops
          </NavLink>
          <NavLink className="site-nav__link" to="/orders">
            Orders
            {currentUser && unreadCount > 0 && (
              <span className="site-nav__badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
            )}
          </NavLink>
          {currentUser && (
            <NavLink className="site-nav__link" to="/dashboard">
              Dashboard
            </NavLink>
          )}
          {isAdmin && (
            <NavLink className="site-nav__link" to="/admin">
              Admin
            </NavLink>
          )}
        </nav>

        <div className="site-nav__actions">
          <div ref={searchPanelRef} className={`site-nav__search${isSearchOpen ? " site-nav__search--open" : ""}`}>
            <button
              className="site-nav__icon-button"
              type="button"
              aria-label="Search shops"
              aria-expanded={isSearchOpen}
              onClick={() => setIsSearchOpen((current) => !current)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M10.5 4.5a6 6 0 1 0 0 12a6 6 0 0 0 0-12Zm0-2a8 8 0 1 1 4.9 14.32l4.14 4.14a1 1 0 0 1-1.42 1.42l-4.14-4.14A8 8 0 0 1 10.5 2.5Z"
                  fill="currentColor"
                />
              </svg>
            </button>

            {isSearchOpen && (
              <form className="site-nav__search-panel" onSubmit={handleSearchSubmit}>
                <input
                  className="site-nav__search-input"
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search city, area, or shop"
                  autoFocus
                />
                <button className="site-nav__search-submit" type="submit">
                  Search
                </button>
              </form>
            )}
          </div>

          {currentUser ? (
            <>
              <div className="site-nav__user">
                <span>{currentUser.name || "PressKardu user"}</span>
                <small>{isAdmin ? "Admin" : isShopkeeper ? "Shopkeeper" : "Customer"}</small>
              </div>
              <button className="site-nav__button site-nav__button--ghost" type="button" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink className="site-nav__button site-nav__button--ghost" to="/login">
                Login
              </NavLink>
              <NavLink className="site-nav__button" to="/signup">
                Get started
              </NavLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
