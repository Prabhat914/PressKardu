import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import API from "../services/api";
import { getCartItems } from "../utils/cart";
import { clearSession, disableGuestDemo, enableGuestDemo, getStoredUser, isGuestDemo } from "../utils/session";

function Navbar({ theme = "light", onToggleTheme }) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = getStoredUser();
  const guestDemo = isGuestDemo();
  const isShopkeeper = currentUser?.role === "presswala";
  const isAdmin = currentUser?.role === "admin";
  const isDeliveryPartner = currentUser?.role === "delivery_partner";
  const isAuthPage = location.pathname === "/login" || location.pathname === "/signup";
  const [unreadCount, setUnreadCount] = useState(0);
  const [cartCount, setCartCount] = useState(() => getCartItems().length);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchPanelRef = useRef(null);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setIsSearchOpen(false);
    });

    return () => window.cancelAnimationFrame(frameId);
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
      const frameId = window.requestAnimationFrame(() => {
        setUnreadCount(0);
      });

      return () => window.cancelAnimationFrame(frameId);
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

  useEffect(() => {
    const syncCartCount = () => setCartCount(getCartItems().length);

    syncCartCount();
    window.addEventListener("presskardu-cart-change", syncCartCount);
    window.addEventListener("storage", syncCartCount);

    return () => {
      window.removeEventListener("presskardu-cart-change", syncCartCount);
      window.removeEventListener("storage", syncCartCount);
    };
  }, [location.pathname]);

  const handleLogout = () => {
    clearSession();
    disableGuestDemo();
    navigate("/login");
  };

  const handleGuestExplore = () => {
    enableGuestDemo();
    navigate("/");
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
        <NavLink className="site-nav__brand" to={currentUser ? (isDeliveryPartner ? "/delivery" : isShopkeeper ? "/shops" : "/") : "/"}>
          <span className="site-nav__brand-mark">
            <img src="/presskardu-logo.png" alt="PressKardu logo" className="site-nav__brand-logo" />
          </span>
          <span className="site-nav__brand-copy">
            <strong>PressKardu</strong>
            <small>Fast local pressing</small>
            <span className="site-nav__brand-pulse">Live local network</span>
          </span>
        </NavLink>

        <nav className="site-nav__links" aria-label="Main navigation">
          {!isDeliveryPartner && <NavLink className="site-nav__link" to="/">
            Home
          </NavLink>}
          {!isDeliveryPartner && <NavLink className="site-nav__link" to="/shops">
            Shops
          </NavLink>}
          {!isDeliveryPartner && <NavLink className="site-nav__link" to="/orders">
            Orders
            {currentUser && unreadCount > 0 && (
              <span className="site-nav__badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
            )}
          </NavLink>}
          {!isShopkeeper && !isAdmin && !isDeliveryPartner && (
            <NavLink className="site-nav__link" to="/checkout">
              Cart
              {cartCount > 0 && (
                <span className="site-nav__badge">{cartCount > 9 ? "9+" : cartCount}</span>
              )}
            </NavLink>
          )}
          {currentUser && !isDeliveryPartner && (
            <NavLink className="site-nav__link" to="/dashboard">
              Dashboard
            </NavLink>
          )}
          {isDeliveryPartner && (
            <NavLink className="site-nav__link" to="/delivery">
              Delivery dashboard
            </NavLink>
          )}
          {isAdmin && (
            <NavLink className="site-nav__link" to="/admin">
              Admin
            </NavLink>
          )}
        </nav>

        <div className="site-nav__actions">
          <button
            className="site-nav__icon-button"
            type="button"
            aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            onClick={onToggleTheme}
          >
            {theme === "light" ? (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M21 12.79A9 9 0 1 1 11.21 3a1 1 0 0 1 .87 1.49A7 7 0 0 0 19.51 11.92a1 1 0 0 1 1.49.87Z"
                  fill="currentColor"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M12 4.75a1 1 0 0 1 1 1V7a1 1 0 1 1-2 0V5.75a1 1 0 0 1 1-1Zm0 11.25a4 4 0 1 0 0-8a4 4 0 0 0 0 8Zm7.25-5a1 1 0 0 1 0 2H18a1 1 0 1 1 0-2h1.25ZM7 12a1 1 0 0 1-1 1H4.75a1 1 0 1 1 0-2H6a1 1 0 0 1 1 1Zm9.42 4.01a1 1 0 0 1 1.41 0l.88.88a1 1 0 0 1-1.42 1.42l-.88-.88a1 1 0 0 1 0-1.42Zm-9.72 0a1 1 0 0 1 0 1.42l-.88.88a1 1 0 0 1-1.42-1.42l.88-.88a1 1 0 0 1 1.42 0Zm10.6-10.6a1 1 0 0 1 1.42 1.42l-.88.88a1 1 0 0 1-1.42-1.42l.88-.88ZM6.7 5.41l.88.88A1 1 0 0 1 6.16 7.7l-.88-.88A1 1 0 1 1 6.7 5.4Z"
                  fill="currentColor"
                />
              </svg>
            )}
          </button>
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
                <small>{isAdmin ? "Admin" : isDeliveryPartner ? "Delivery partner" : isShopkeeper ? "Shopkeeper" : "Customer"}</small>
              </div>
              <button className="site-nav__button site-nav__button--ghost" type="button" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              {!guestDemo && !isAuthPage && (
                <button className="site-nav__button site-nav__button--ghost" type="button" onClick={handleGuestExplore}>
                  Explore as guest
                </button>
              )}
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
