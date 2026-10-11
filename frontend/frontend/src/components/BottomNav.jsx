import { Link, useLocation, useNavigate } from 'react-router-dom';

const TABS = [
  { path: '/', label: 'Home', icon: '🏠' },
  { path: '/my-posts', label: 'My Posts', icon: '📋' },
  { path: '/post', label: '', icon: '+', isPost: true },
  { path: '/claims', label: 'Claims', icon: '🛡️' },
  { path: '/profile', label: 'Profile', icon: '👤' },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="bottom-nav">
      {TABS.map((tab) => {
        const active = location.pathname === tab.path;
        if (tab.isPost) {
          return (
            <button
              key={tab.path}
              className="nav-item-post"
              onClick={() => navigate(tab.path)}
              aria-label="Post an item"
            >
              +
            </button>
          );
        }
        return (
          <Link key={tab.path} to={tab.path} className={`nav-item ${active ? 'active' : ''}`}>
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
