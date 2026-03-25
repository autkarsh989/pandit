import { NavLink, useNavigate } from 'react-router-dom';
import { getUserType } from '../api/client.js';

const navLinkClass = ({ isActive }) => (isActive ? 'active' : undefined);

export default function Navbar() {
  const navigate = useNavigate();
  const userType = getUserType();
  const isPandit = userType === 'pandit';
  const isAdmin = userType === 'admin';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_type');
    navigate('/', { replace: true });
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-brand">
          <div className="brand-mark">P</div>
          <div>
            <div className="brand-title">PANDIT</div>
            <div className="brand-subtitle">Divine services</div>
          </div>
        </div>

        <ul className="nav-menu">
          {isAdmin ? (
            <>
              <li>
                <NavLink to="/admin/dashboard" className={navLinkClass}>
                  Admin Dashboard
                </NavLink>
              </li>
              <li>
                <NavLink to="/admin/banners" className={navLinkClass}>
                  Banners
                </NavLink>
              </li>
              <li>
                <NavLink to="/admin/special-offers" className={navLinkClass}>
                  Offers
                </NavLink>
              </li>
              <li>
                <NavLink to="/admin/global-pricing" className={navLinkClass}>
                  Pricing
                </NavLink>
              </li>
              <li>
                <NavLink to="/admin/notification-settings" className={navLinkClass}>
                  Notify Times
                </NavLink>
              </li>
              <li>
                <button type="button" className="link-button" onClick={handleLogout}>
                  Logout
                </button>
              </li>
            </>
          ) : (
            <>
              <li>
                <NavLink to="/dashboard" className={navLinkClass}>
                  Dashboard
                </NavLink>
              </li>
              {isPandit ? (
                <>
                  <li>
                    <NavLink to="/manage-services" className={navLinkClass}>
                      My Services
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/bookings" className={navLinkClass}>
                      My Bookings
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/pandit/profile" className={navLinkClass}>
                      My Profile
                    </NavLink>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <NavLink to="/services" className={navLinkClass}>
                      Services
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/horoscope" className={navLinkClass}>
                      Horoscope
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/pandits" className={navLinkClass}>
                      Find Pandits
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/bookings" className={navLinkClass}>
                      My Bookings
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/profile" className={navLinkClass}>
                      Profile
                    </NavLink>
                  </li>
                </>
              )}
              <li>
                <button type="button" className="link-button" onClick={handleLogout}>
                  Logout
                </button>
              </li>
            </>
          )}
        </ul>

        {isAdmin ? (
          <div className="nav-actions admin-nav-actions">
            <div className="nav-avatar">AD</div>
          </div>
        ) : (
          <div className="nav-actions">
            <div className="nav-search">
              <input type="text" placeholder="Search services..." />
              <button type="button" className="nav-search-btn">
                Search
              </button>
            </div>
            <button type="button" className="nav-icon-button" aria-label="Notifications">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
                <path d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
                <path d="M9 17a3 3 0 0 0 6 0" />
              </svg>
            </button>
            <div className="nav-avatar">A</div>
          </div>
        )}
      </div>
    </nav>
  );
}
