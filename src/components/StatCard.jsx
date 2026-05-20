import { Link } from 'react-router-dom';

const colorMap = {
  gold:   { icon: '#3B9EE2', bg: 'rgba(59,158,226,0.10)', bar: '#3B9EE2' },
  green:  { icon: '#22c55e', bg: 'rgba(34,197,94,0.10)',  bar: '#22c55e' },
  blue:   { icon: '#3B9EE2', bg: 'rgba(59,158,226,0.10)', bar: '#3B9EE2' },
  purple: { icon: '#a855f7', bg: 'rgba(168,85,247,0.10)', bar: '#a855f7' },
  navy:   { icon: '#1B2A5E', bg: 'rgba(27,42,94,0.08)',   bar: '#1B2A5E' },
};

export default function StatCard({ title, value, icon: Icon, color = 'blue', link }) {
  const c = colorMap[color] || colorMap.blue;

  const Content = (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative overflow-hidden">
      {/* left accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ background: c.bar }} />
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: c.bg }}>
        <Icon size={20} style={{ color: c.icon }} />
      </div>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">{title}</p>
      <p className="text-xl font-black" style={{ color: '#1B2A5E' }}>{value}</p>
    </div>
  );

  if (link) return <Link to={link}>{Content}</Link>;
  return Content;
}