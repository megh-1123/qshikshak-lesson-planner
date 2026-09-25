import { NavLink } from 'react-router-dom';
import {
  BookOpenCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import { LP_BASE } from '@/routes/routeConfig';
import './Sidebar.css';

export default function Sidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onCloseMobile,
}) {
  return (
    <>
      <div
        className={`sidebar-backdrop ${
          mobileOpen ? 'show' : ''
        }`}
        onClick={onCloseMobile}
      />

      <aside
        className={`sidebar ${
          collapsed ? 'collapsed' : ''
        } ${mobileOpen ? 'mobile-open' : ''}`}
      >
        <div className="sidebar-brand">
          <span className="logo" />

          <span className="brand-text">
            Qshikshak
          </span>

          <button
            className="sidebar-toggle"
            onClick={onToggle}
            aria-label={
              collapsed
                ? 'Expand menu'
                : 'Collapse menu'
            }
          >
            {collapsed ? (
              <ChevronRight size={18} />
            ) : (
              <ChevronLeft size={18} />
            )}
          </button>
        </div>

        <nav
          className="sidebar-nav"
          onClick={(e) =>
            e.target.closest('a') &&
            onCloseMobile()
          }
        >
          <NavLink
            to={LP_BASE}
            className={({ isActive }) =>
              `nav-item ${
                isActive ? 'active' : ''
              }`
            }
          >
            <BookOpenCheck size={20} />

            <span className="label">
              Lesson Planner
            </span>
          </NavLink>
        </nav>
      </aside>
    </>
  );
}