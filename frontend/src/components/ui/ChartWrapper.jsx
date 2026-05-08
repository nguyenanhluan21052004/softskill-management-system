import React from 'react';

const ChartWrapper = ({ title, children, actions }) => {
  return (
    <article className="panel chart-panel">
      <div className="panel-header">
        <h2>{title}</h2>
        {actions}
      </div>
      <div className="chart-area">{children}</div>
    </article>
  );
};

export default ChartWrapper;
