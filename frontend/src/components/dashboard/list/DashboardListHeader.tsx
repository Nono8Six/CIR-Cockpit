const DashboardListHeader = () => {
  return (
    <thead className="bg-slate-50 sticky top-0 z-10 text-[11px] uppercase text-slate-500 font-bold tracking-wider">
      <tr>
        <th className="px-6 py-3 border-b border-slate-200 w-32">Date</th>
        <th className="px-6 py-3 border-b border-slate-200 w-16 text-center">Canal</th>
        <th className="px-6 py-3 border-b border-slate-200 w-32">Statut</th>
        <th className="px-6 py-3 border-b border-slate-200">Client / Contact</th>
        <th className="px-6 py-3 border-b border-slate-200">Sujet</th>
        <th className="px-6 py-3 border-b border-slate-200 w-32 text-right">Ref</th>
        <th className="px-6 py-3 border-b border-slate-200 w-24 text-right">Action</th>
      </tr>
    </thead>
  );
};

export default DashboardListHeader;
