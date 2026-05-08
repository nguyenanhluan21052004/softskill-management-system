import React from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const TopStudentsBarChart = ({ data }) => {
  return (
    <div className="panel chart-panel">
      <div className="panel__header-row">
        <h2 className="panel__title">Diem top hoc sinh</h2>
      </div>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap={24}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" />
            <XAxis dataKey="name" tick={{ fill: '#334155', fontSize: 12 }} />
            <YAxis tick={{ fill: '#334155', fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="score" fill="#2563eb" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TopStudentsBarChart;
