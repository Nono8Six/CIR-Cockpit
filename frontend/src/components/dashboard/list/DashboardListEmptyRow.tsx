const DashboardListEmptyRow = () => {
  return (
    <tr>
      <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-sm">
        Aucune interaction trouvee.
      </td>
    </tr>
  );
};

export default DashboardListEmptyRow;
