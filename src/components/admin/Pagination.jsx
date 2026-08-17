export default function Pagination({ currentPage, totalPages, onPageChange, totalItems, itemsPerPage }) {
  if (totalPages <= 1) return null

  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 20px',
      borderTop: '1px solid var(--admin-line)',
      fontSize: '13px',
      color: 'var(--admin-ink-muted)',
      flexWrap: 'wrap',
      gap: '12px'
    }}>
      <div>
        Showing <strong>{startItem}</strong> - <strong>{endItem}</strong> of <strong>{totalItems}</strong> records
      </div>
      <div style={{ display: 'flex', gap: '6px' }}>
        <button
          type="button"
          className="btn-admin btn-admin-secondary"
          style={{ padding: '6px 12px', fontSize: '12px' }}
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          ← Prev
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            type="button"
            className={`btn-admin ${currentPage === page ? 'btn-admin-primary' : 'btn-admin-secondary'}`}
            style={{ padding: '6px 12px', fontSize: '12px', minWidth: '32px' }}
            onClick={() => onPageChange(page)}
          >
            {page}
          </button>
        ))}
        <button
          type="button"
          className="btn-admin btn-admin-secondary"
          style={{ padding: '6px 12px', fontSize: '12px' }}
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next →
        </button>
      </div>
    </div>
  )
}
