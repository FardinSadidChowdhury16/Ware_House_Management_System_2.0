export function EmptyTable({ cols, message = "No matches." }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-8 text-center text-sm text-slate-400">{message}</td>
    </tr>
  );
}
