export default function HomePage() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '20px'
    }}>
      <h1>✅ Homepage Funziona!</h1>
      <a href="/login" style={{ color: 'blue', textDecoration: 'underline' }}>
        Vai al Login
      </a>
      <a href="/dashboard" style={{ color: 'blue', textDecoration: 'underline' }}>
        Vai alla Dashboard
      </a>
    </div>
  )
}
