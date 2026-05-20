import { Link } from 'react-router-dom';

const colorMap = {
  gold: { icon: '#3B9EE2', bg: 'rgba(59,158,226,0.12)' },
  green: { icon: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  blue: { icon: '#3B9EE2', bg: 'rgba(59,158,226,0.12)' },
  purple: { icon: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
  navy: { icon: '#1B2A5E', bg: 'rgba(27,42,94,0.1)' },
};

export default function StatCard({ title, value, icon: Icon, color = 'blue', link }) {
  const c = colorMap[color] || colorMap.blue;

  const Content = (
    <div
      className="rounded-xl p-4 hover:shadow-md transition-shadow"
      style={{
        background: '#fff',
        border: '1px solid #E2E8F0',
        borderLeft: '3px solid #3B9EE2',
        boxShadow: '0 1px 6px rgba(59,158,226,0.08)',
      }}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
        style={{ background: c.bg }}
      >
        <Icon size={18} style={{ color: c.icon }} />
      </div>
      <p className="text-xs font-medium uppercase tracking-wide" style={{ color: '#64748B' }}>{title}</p>
      <p className="text-xl font-black mt-1" style={{ color: '#1B2A5E' }}>{value}</p>
    </div>
  );

  if (link) return <Link to={link}>{Content}</Link>;
  return Content;
}