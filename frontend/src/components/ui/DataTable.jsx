import React, { useMemo } from 'react';

const DataTable = ({ columns, rows, page, pageSize, onPageChange, emptyMessage }) => {
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const pagedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, safePage, pageSize]);

  return (
    <>
      <div className="table-wrapper">
        <table className="dashboard-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagedRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>{emptyMessage || 'Không có dữ liệu.'}</td>
              </tr>
            ) : (
              pagedRows.map((row) => (
                <tr key={row.id}>
                  {columns.map((column) => (
                    <td key={`${row.id}-${column.key}`}>
                      {typeof column.render === 'function' ? column.render(row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="table-pagination">
        <button type="button" onClick={() => onPageChange(safePage - 1)} disabled={safePage <= 1}>
          Trước
        </button>
        <span>
          Trang {safePage} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= totalPages}
        >
          Sau
        </button>
      </div>
    </>
  );
};

export default DataTable;
