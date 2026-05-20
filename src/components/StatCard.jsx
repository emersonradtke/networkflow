import { Link } from 'react-router-dom';

const colorMap = {
  gold: 'text-yellow-400 bg-yellow-400/10',
  green: 'text-green-400 bg-green-400/10',
  blue: 'text-blue-400 bg-blue-400/10',
  purple: 'text-purple-400 bg-purple-400/10',
};

export default function StatCard({ title, value, icon: Icon, color = 'gold', link }) {
  const Content = (
    <div className="dark-card rounded-xl p-4 hover:border-primary/30 transition-colors">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${colorMap[color]}`}>
        <Icon size={18} />
      </div>
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{title}</p>
      <p className="text-xl font-black text-foreground mt-1">{value}</p>
    </div>
  );

  if (link) return <Link to={link}>{Content}</Link>;
  return Content;
}