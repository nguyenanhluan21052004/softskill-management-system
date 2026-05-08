import React from 'react';

const levelLabel = {
  Good: 'Tot',
  Average: 'Trung binh',
  Weak: 'Yeu',
};

const ResultsTable = ({ students, filter, onFilterChange }) => {
  return (
    <div className="panel table-panel">
      <div className="panel__header-row">
        <h2 className="panel__title">Tat ca ket qua</h2>
        <label className="filter-control" htmlFor="levelFilter">
          Loc xep loai
          <select id="levelFilter" value={filter} onChange={(event) => onFilterChange(event.target.value)}>
            <option value="All">Tat ca</option>
            <option value="Good">Tot</option>
            <option value="Average">Trung binh</option>
            <option value="Weak">Yeu</option>
          </select>
        </label>
      </div>
      <div className="table-wrapper">
        <table className="dashboard-table">
          <thead>
            <tr>
              <th>Ho ten</th>
              <th>Diem</th>
              <th>Xep loai</th>
            </tr>
          </thead>
          <tbody>
            {students.length > 0 ? (
              students.map((student, index) => (
                <tr key={`${student.name}-${student.score}-${index}`}>
                  <td>{student.name}</td>
                  <td>{student.score}</td>
                  <td>
                    <span className={`level-pill level-pill--${student.level.toLowerCase()}`}>
                      {levelLabel[student.level] || student.level}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="empty-state-cell">
                  Khong co sinh vien phu hop bo loc.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ResultsTable;

