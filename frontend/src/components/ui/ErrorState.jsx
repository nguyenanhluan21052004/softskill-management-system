import React from 'react';

const ErrorState = ({ message, onRetry }) => {
  return (
    <div className="error-state" role="alert">
      <p>{message || 'Đã xảy ra lỗi.'}</p>
      {onRetry && (
        <button type="button" onClick={onRetry}>
          Thử lại
        </button>
      )}
    </div>
  );
};

export default ErrorState;
