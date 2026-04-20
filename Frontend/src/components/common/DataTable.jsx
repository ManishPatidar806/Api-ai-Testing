function DataTable({ columns, rows, emptyMessage = 'No records available' }) {
  if (!rows.length) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={`px-4 py-3 font-medium ${column.className || ''}`}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {rows.map((row, index) => (
            <tr key={row.id || index} className="hover:bg-slate-50">
              {columns.map((column) => (
                <td key={`${column.key}-${row.id || index}`} className={`px-4 py-3 text-slate-700 ${column.className || ''}`}>
                  {typeof column.render === 'function' ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
