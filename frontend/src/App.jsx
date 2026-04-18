import { useState, useEffect } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002'

export default function App() {
  const [images, setImages] = useState([])
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')

  const loadImages = () => {
    fetch(`${API_URL}/images`)
      .then(r => r.json())
      .then(setImages)
      .catch(() => setMessage('Could not load images. Is the server running?'))
  }

  useEffect(() => { loadImages() }, [])

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploading(true)
    setMessage('Uploading...')

    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result.split(',')[1]
      const res = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: base64,
          fileName: file.name,
          contentType: file.type,
        }),
      })
      const data = await res.json()
      setMessage(res.ok ? `Uploaded: ${data.fileName}` : `Error: ${data.error}`)
      setUploading(false)
      loadImages()
    }
    reader.readAsDataURL(file)
  }

  const viewImage = async (id) => {
    const res = await fetch(`${API_URL}/images/${id}`)
    const data = await res.json()
    window.open(data.url, '_blank')
  }

  return (
    <div style={{ maxWidth: 700, margin: '40px auto', fontFamily: 'sans-serif', padding: '0 20px' }}>
      <h1>Image Upload — Project 2 (Serverless)</h1>
      <p style={{ color: '#888', fontSize: 14 }}>
        Local: Express server wrapping Lambda logic<br />
        Production: API Gateway → Lambda → S3 + DynamoDB
      </p>

      <div style={{ padding: 20, border: '2px dashed #ccc', borderRadius: 8, textAlign: 'center', marginBottom: 24 }}>
        <input type="file" accept="image/*" onChange={handleUpload} disabled={uploading}
          style={{ fontSize: 16 }} />
        <p style={{ margin: '8px 0 0', color: '#888', fontSize: 13 }}>
          Select an image to upload (will be base64 encoded and sent to /upload)
        </p>
      </div>

      {message && (
        <div style={{ padding: '10px 16px', marginBottom: 16, borderRadius: 6,
          background: message.startsWith('Error') ? '#fee2e2' : '#dcfce7',
          color: message.startsWith('Error') ? '#dc2626' : '#16a34a' }}>
          {message}
        </div>
      )}

      <h2>Uploaded Images/Photo ({images.length})</h2>
      {images.length === 0 && <p style={{ color: '#aaa' }}>No images yet. Upload one above!</p>}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {images.map(img => (
          <li key={img.imageId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 0', borderBottom: '1px solid #eee' }}>
            <div>
              <strong>{img.originalName}</strong>
              <span style={{ color: '#888', fontSize: 13, marginLeft: 12 }}>
                {(img.size / 1024).toFixed(1)} KB — {new Date(img.uploadedAt).toLocaleString()}
              </span>
            </div>
            <button onClick={() => viewImage(img.imageId)}
              style={{ padding: '4px 12px', borderRadius: 4, background: '#ede9fe', color: '#7c3aed', border: 'none', cursor: 'pointer' }}>
              View
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
