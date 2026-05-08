import React from 'react';

const Spinner = ({ label = 'Đang tải...' }) => {
  return (
    <div className="spinner-wrap" role="status" aria-live="polite">
      <span className="spinner" />
      <p>{label}</p>
    </div>
  );
};

export default Spinner;
