import React from 'react';
import { NavLink } from 'react-router-dom';

const roleLabels = {
  admin: 'Quan tri vien',
  teacher: 'Giang vien',
  student: 'Sinh vien',
};

const navLinkClassName = ({ isActive }) =>
  `sidebar__nav-link${isActive ? ' sidebar__nav-link--active' : ''}`;

const Navbar = ({ user, onLogout }) => {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <h1>SOFT SKILLS</h1>
        <p>Evaluation Portal</p>
      </div>

      <nav className="sidebar__nav">
        {user?.role === 'admin' && (
          <NavLink className={navLinkClassName} to="/admin">
            Tong quan
          </NavLink>
        )}
        {user?.role === 'teacher' && (
          <NavLink className={navLinkClassName} to="/teacher">
            Tong quan
          </NavLink>
        )}
        {user?.role === 'teacher' && (
          <NavLink className={navLinkClassName} to="/teacher/analytics">
            Phan tich ky nang
          </NavLink>
        )}
        {user?.role === 'student' && (
          <NavLink className={navLinkClassName} to="/student">
            Tong quan
          </NavLink>
        )}
      </nav>

      <div className="sidebar__user">
        <span className="sidebar__role-chip">{roleLabels[user?.role] || 'Unknown role'}</span>
        <button type="button" onClick={onLogout}>
          Dang xuat
        </button>
      </div>
    </aside>
  );
};

export default Navbar;
