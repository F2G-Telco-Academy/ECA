import { useState, useEffect } from 'react'

export default function Test() {
  const [devices, setDevices] = useState<any[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('http://localhost:8080/api/devices')
      .then(res => res.json())
      .then(data => {
        setDevices(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  return (
    <div style={{ padding: '20px', background: '#000', color: '#0f0', minHeight: '100vh', fontFamily: 'monospace' }}>
      <h1>ECA API Test Page</h1>
      <hr />
      <h2>Status:</h2>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>ERROR: {error}</p>}
      {!loading && !error && <p style={{ color: 'lime' }}>✓ Connected to backend</p>}
      
      <h2>Devices ({devices.length}):</h2>
      <pre>{JSON.stringify(devices, null, 2)}</pre>
      
      <hr />
      <button 
        onClick={() => window.location.href = '/'}
        style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}
      >
        Go to Main App
      </button>
    </div>
  )
}
