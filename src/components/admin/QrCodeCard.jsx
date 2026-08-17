import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'

export default function QrCodeCard({
  value,
  title,
  subtitle,
  siteName,
  nodeType = 'standard',
  sequenceOrder,
  onCopySuccess,
}) {
  const canvasRef = useRef(null)
  const [dataUrl, setDataUrl] = useState('')
  const [copied, setCopied] = useState(false)

  const isKing = nodeType === 'king' || sequenceOrder === 1 || value?.includes('-0')

  useEffect(() => {
    if (!value || !canvasRef.current) return

    QRCode.toCanvas(
      canvasRef.current,
      value,
      {
        width: 220,
        margin: 2,
        color: {
          dark: '#1C160C',
          light: '#FFFDF9',
        },
        errorCorrectionLevel: 'H',
      },
      (err) => {
        if (!err && canvasRef.current) {
          setDataUrl(canvasRef.current.toDataURL('image/png'))
        }
      }
    )
  }, [value])

  const handleCopy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    if (onCopySuccess) onCopySuccess(value)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    if (!canvasRef.current) return

    // Create a high-res branded print card
    const printCanvas = document.createElement('canvas')
    printCanvas.width = 800
    printCanvas.height = 1000
    const ctx = printCanvas.getContext('2d')

    // Background
    ctx.fillStyle = '#FFFDF9'
    ctx.fillRect(0, 0, 800, 1000)

    // Border
    ctx.strokeStyle = '#D9CEBD'
    ctx.lineWidth = 12
    ctx.strokeRect(20, 20, 760, 960)

    // Inner accent border
    ctx.strokeStyle = isKing ? '#9E3A14' : '#1C160C'
    ctx.lineWidth = 3
    ctx.strokeRect(36, 36, 728, 928)

    // Header Badge
    ctx.fillStyle = isKing ? '#9E3A14' : '#1C160C'
    ctx.fillRect(50, 50, 700, 70)

    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 28px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('🏛 DHAROHAR SETU • HERITAGE WAYPOINT', 400, 95)

    // Site Name
    ctx.fillStyle = '#1C160C'
    ctx.font = 'bold 36px serif'
    ctx.fillText(siteName || 'Heritage Site', 400, 180)

    // Waypoint Name & Type
    ctx.fillStyle = '#9E3A14'
    ctx.font = 'bold 30px sans-serif'
    ctx.fillText(title || 'Main Checkpoint', 400, 230)

    ctx.fillStyle = '#6E6254'
    ctx.font = '22px sans-serif'
    const typeLabel = isKing ? '★ KING ENTRANCE SCANNER (TOUR START)' : `CHECKPOINT #${sequenceOrder || 1} (${nodeType.toUpperCase()})`
    ctx.fillText(typeLabel, 400, 270)

    // Draw QR in center
    const qrSize = 440
    ctx.drawImage(canvasRef.current, 180, 310, qrSize, qrSize)

    // QR Value Box
    ctx.fillStyle = '#F4EFE6'
    ctx.fillRect(160, 775, 480, 70)
    ctx.strokeStyle = '#D9CEBD'
    ctx.lineWidth = 2
    ctx.strokeRect(160, 775, 480, 70)

    ctx.fillStyle = '#1C160C'
    ctx.font = 'bold 32px monospace'
    ctx.fillText(value, 400, 820)

    // Footer instruction
    ctx.fillStyle = '#6E6254'
    ctx.font = '20px sans-serif'
    ctx.fillText('Scan with Dharohar App to trigger location audio & historical storytelling', 400, 890)
    ctx.font = '16px sans-serif'
    ctx.fillText('dharohar.app • Ministry of Tourism & Culture', 400, 925)

    // Download image
    const link = document.createElement('a')
    const sanitizedName = (title || 'qr').toLowerCase().replace(/[^a-z0-9]/g, '-')
    link.download = `dharohar-${value}-${sanitizedName}.png`
    link.href = printCanvas.toDataURL('image/png')
    link.click()
  }

  return (
    <div
      className="qr-card"
      style={{
        background: '#FFFDF9',
        border: isKing ? '2px solid #9E3A14' : '1px solid var(--admin-line)',
        borderRadius: '12px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        position: 'relative',
        boxShadow: isKing ? '0 4px 16px rgba(158,58,20,0.12)' : '0 2px 8px rgba(0,0,0,0.04)',
      }}
    >
      {isKing && (
        <span
          style={{
            position: 'absolute',
            top: '-10px',
            background: '#9E3A14',
            color: '#FFF',
            fontSize: '10px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            padding: '2px 8px',
            borderRadius: '10px',
          }}
        >
          ★ King Node (Entrance)
        </span>
      )}

      <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--admin-ink)', marginTop: isKing ? '6px' : '0' }}>
        {title}
      </div>

      {subtitle && (
        <div style={{ fontSize: '12px', color: 'var(--admin-ink-muted)', marginBottom: '8px' }}>
          {subtitle}
        </div>
      )}

      <div
        style={{
          background: '#FFF',
          padding: '8px',
          borderRadius: '8px',
          border: '1px solid var(--admin-line)',
          margin: '8px 0',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <canvas ref={canvasRef} style={{ width: '180px', height: '180px', display: 'block' }} />
      </div>

      <div
        style={{
          background: '#F4EFE6',
          padding: '4px 10px',
          borderRadius: '6px',
          fontFamily: 'monospace',
          fontWeight: 700,
          fontSize: '13px',
          color: 'var(--admin-ink)',
          marginBottom: '12px',
          border: '1px solid #D9CEBD',
          letterSpacing: '0.05em',
        }}
      >
        {value}
      </div>

      <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
        <button
          type="button"
          className="btn-admin btn-admin-secondary"
          style={{ flex: 1, padding: '6px 8px', fontSize: '11.5px' }}
          onClick={handleCopy}
        >
          {copied ? '✓ Copied' : '📋 Copy Code'}
        </button>

        <button
          type="button"
          className="btn-admin btn-admin-primary"
          style={{
            flex: 1,
            padding: '6px 8px',
            fontSize: '11.5px',
            background: isKing ? '#9E3A14' : 'var(--admin-ink)',
          }}
          onClick={handleDownload}
        >
          ⬇ Download PNG
        </button>
      </div>
    </div>
  )
}
