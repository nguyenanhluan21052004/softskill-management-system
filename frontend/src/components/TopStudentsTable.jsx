import React from 'react';

const levelLabel = {
  Good: 'Tot',
  Average: 'Trung binh',
  Weak: 'Yeu',
};

const TopStudentsTable = ({ students }) => {
  return (
    <div className="panel table-panel">
      <div className="panel__header-row">
        <h2 className="panel__title">Top 5 sinh vien</h2>
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
                <tr key={`${student.name}-${index}`}>
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
                  Chua co du lieu top sinh vien.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TopStudentsTable;

