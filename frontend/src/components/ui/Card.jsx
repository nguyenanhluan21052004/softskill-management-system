import React from 'react';

const Card = ({ title, value, accent = 'blue' }) => {
  return (
    <article className={`summary-card summary-card--${accent}`}>
      <p>{title}</p>
      <h3>{value}</h3>
    </article>
  );
};

export default Card;
