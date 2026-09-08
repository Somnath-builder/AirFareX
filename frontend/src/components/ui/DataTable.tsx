import React from 'react';
import { cn } from '../layout/Layout';

interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  className?: string;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  className?: string;
}

export function DataTable<T>({ data, columns, className }: DataTableProps<T>) {
  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-[#A9B7C9] bg-[#0B1728] uppercase border-b border-[#24344A]">
          <tr>
            {columns.map((col, i) => (
              <th 
                key={i} 
                className={cn(
                  "px-4 py-3 font-medium tracking-wider whitespace-nowrap",
                  col.align === 'right' && "text-right",
                  col.align === 'center' && "text-center",
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#24344A] bg-transparent">
          {data.length > 0 ? (
            data.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-[#14243A] transition-colors">
                {columns.map((col, colIndex) => (
                  <td 
                    key={colIndex} 
                    className={cn(
                      "px-4 py-3 whitespace-nowrap text-[#F4F7FB]",
                      col.align === 'right' && "text-right",
                      col.align === 'center' && "text-center",
                      col.className
                    )}
                  >
                    {typeof col.accessor === 'function'
                      ? col.accessor(row)
                      : (row[col.accessor] as React.ReactNode)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-[#718198]">
                No data available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
