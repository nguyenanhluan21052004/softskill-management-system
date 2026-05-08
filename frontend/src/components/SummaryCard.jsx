import React from 'react';

const SummaryCard = ({ title, value, accent = 'default' }) => {
  return (
    <div className={`summary-card summary-card--${accent}`}>
      <p className="summary-card__title">{title}</p>
      <h3 className="summary-card__value">{value}</h3>
    </div>
  );
};

export default SummaryCard;
