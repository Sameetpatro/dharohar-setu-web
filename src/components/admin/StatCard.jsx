export default function StatCard({ title, value, icon, color = 'red', subtitle, badge }) {
  return (
    <div className="stat-card">
      <div className="stat-card-header">
        <span className="stat-card-title">{title}</span>
        <div className={`stat-icon stat-icon-${color}`}>{icon}</div>
      </div>
      <div className="stat-value">{value}</div>
      {(subtitle || badge) && (
        <div className="stat-footer">
          {badge && <span className="stat-badge-up">{badge}</span>}
          {subtitle && <span>{subtitle}</span>}
        </div>
      )}
    </div>
  )
}
