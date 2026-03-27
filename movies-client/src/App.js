import React, { useEffect, useMemo, useState } from 'react'

const styles = {
  page: {
    minHeight: '100vh',
    margin: 0,
    background: 'linear-gradient(180deg, #0f172a 0%, #111827 45%, #1f2937 100%)',
    color: '#e5e7eb',
    padding: '32px 16px',
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  },
  container: { maxWidth: '1100px', margin: '0 auto' },
  title: { margin: '0 0 8px', fontSize: '2rem' },
  subtitle: { margin: '0 0 24px', color: '#9ca3af' },
  alert: { padding: '12px 14px', borderRadius: '10px', marginBottom: '16px', fontWeight: 500 },
  tabs: { display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' },
  button: {
    border: 0,
    borderRadius: '10px',
    padding: '10px 14px',
    cursor: 'pointer',
    fontWeight: 600,
    background: '#2563eb',
    color: '#fff'
  },
  ghostButton: { background: '#1f2937', border: '1px solid #4b5563', color: '#e5e7eb' },
  dangerButton: { background: '#b91c1c', color: '#fff' },
  card: {
    background: 'rgba(17, 24, 39, 0.9)',
    border: '1px solid #374151',
    borderRadius: '16px',
    padding: '18px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
    marginBottom: '16px'
  },
  sectionTitle: { margin: '0 0 12px', fontSize: '1.15rem' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid #4b5563',
    background: '#111827',
    color: '#f3f4f6',
    borderRadius: '10px',
    padding: '10px 12px',
    outline: 'none'
  },
  movieGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px' },
  movieCard: {
    background: 'rgba(31, 41, 55, 0.85)',
    border: '1px solid #4b5563',
    borderRadius: '12px',
    padding: '10px'
  },
  poster: { width: '100%', aspectRatio: '2 / 3', objectFit: 'cover', borderRadius: '8px', background: '#111827' }
}

function usePath() {
  const [path, setPath] = useState(window.location.pathname)

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const navigate = (nextPath) => {
    if (nextPath !== window.location.pathname) {
      window.history.pushState({}, '', nextPath)
      setPath(nextPath)
    }
  }

  return { path, navigate }
}

function App() {
  const { path, navigate } = usePath()

  const [token, setToken] = useState(localStorage.getItem('token') || '')
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('currentUser')
    return saved ? JSON.parse(saved) : null
  })
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authTab, setAuthTab] = useState('login')
  const [message, setMessage] = useState({ type: '', text: '' })

  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [savedMovies, setSavedMovies] = useState([])

  const [reviews, setReviews] = useState([])
  const [reviewForm, setReviewForm] = useState({ movieId: '', rating: 5, comment: '' })
  const [editReviewId, setEditReviewId] = useState('')

  const authHeader = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token])

  const showSuccess = (text) => setMessage({ type: 'success', text })
  const showError = (text) => setMessage({ type: 'error', text })

  const handleApiError = async (response) => {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error || 'Unexpected error')
  }

  const guardedNavigate = (target) => {
    if (!token) {
      navigate('/')
      return
    }
    navigate(target)
  }

  const register = async () => {
    try {
      const response = await fetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password })
      })
      if (!response.ok) await handleApiError(response)
      const data = await response.json()
      showSuccess(`Inscription réussie. userId: ${data.userId}`)
      setAuthTab('login')
    } catch (err) {
      showError(err.message)
    }
  }

  const login = async () => {
    try {
      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      if (!response.ok) await handleApiError(response)
      const data = await response.json()
      setToken(data.token)
      setCurrentUser(data.user)
      localStorage.setItem('token', data.token)
      localStorage.setItem('currentUser', JSON.stringify(data.user))
      navigate('/films')
      showSuccess(`Connexion réussie. Bienvenue ${data.user?.fullName || ''}`.trim())
    } catch (err) {
      showError(err.message)
    }
  }

  const logout = () => {
    setToken('')
    setCurrentUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('currentUser')
    navigate('/')
    showSuccess('Déconnexion réussie.')
  }

  const searchTmdbMovies = async () => {
    try {
      const query = searchTerm.trim()
      if (!query) throw new Error('Entrez un nom de film à rechercher')

      const response = await fetch(`/movies/search?q=${encodeURIComponent(query)}`, {
        headers: { ...authHeader }
      })
      if (!response.ok) await handleApiError(response)
      const data = await response.json()
      setSearchResults(data.results || [])
      showSuccess('Résultats TMDB chargés.')
    } catch (err) {
      showError(err.message)
    }
  }

  const loadSavedMovies = async () => {
    try {
      const response = await fetch('/movies', { headers: { ...authHeader } })
      if (!response.ok) await handleApiError(response)
      const data = await response.json()
      setSavedMovies(data.movies || [])
    } catch (err) {
      showError(err.message)
    }
  }

  const addMovie = async (movie) => {
    try {
      const response = await fetch('/movies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({
          title: movie.title,
          tmdbId: movie.tmdbId,
          posterPath: movie.posterPath
        })
      })
      if (!response.ok) await handleApiError(response)
      showSuccess(`Film "${movie.title}" ajouté.`)
      loadSavedMovies()
    } catch (err) {
      showError(err.message)
    }
  }

  const deleteMovie = async (movieId) => {
    try {
      const response = await fetch(`/movies/${movieId}`, {
        method: 'DELETE',
        headers: { ...authHeader }
      })
      if (!response.ok) await handleApiError(response)
      showSuccess('Film supprimé.')
      setSavedMovies((prev) => prev.filter((movie) => movie.id !== movieId))
    } catch (err) {
      showError(err.message)
    }
  }

  const loadReviews = async () => {
    try {
      const response = await fetch('/reviews', { headers: { ...authHeader } })
      if (!response.ok) await handleApiError(response)
      const data = await response.json()
      setReviews(data.reviews || [])
    } catch (err) {
      showError(err.message)
    }
  }

  const createReview = async () => {
    try {
      const response = await fetch('/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({
          movieId: reviewForm.movieId,
          rating: Number(reviewForm.rating),
          comment: reviewForm.comment
        })
      })
      if (!response.ok) await handleApiError(response)
      showSuccess('Review créée.')
      setReviewForm({ movieId: '', rating: 5, comment: '' })
      loadReviews()
    } catch (err) {
      showError(err.message)
    }
  }

  const updateReview = async (reviewId) => {
    try {
      const target = reviews.find((review) => review.id === reviewId)
      if (!target) return

      const response = await fetch(`/reviews/${reviewId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ rating: target.rating, comment: target.comment })
      })
      if (!response.ok) await handleApiError(response)
      setEditReviewId('')
      showSuccess('Review mise à jour.')
      loadReviews()
    } catch (err) {
      showError(err.message)
    }
  }

  const removeReview = async (reviewId) => {
    try {
      const response = await fetch(`/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: { ...authHeader }
      })
      if (!response.ok) await handleApiError(response)
      setReviews((prev) => prev.filter((review) => review.id !== reviewId))
      showSuccess('Review supprimée.')
    } catch (err) {
      showError(err.message)
    }
  }

  useEffect(() => {
    if (!token) return
    if (path === '/films') loadSavedMovies()
    if (path === '/review') loadReviews()
  }, [path, token])

  useEffect(() => {
    if (token && path === '/') navigate('/films')
    if (!token && path !== '/') navigate('/')
  }, [token])

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.title}>🎬 Movies Microservices Client</h1>
        <p style={styles.subtitle}>Recherche TMDB + gestion des films et reviews.</p>

        {message.text && (
          <p
            style={{
              ...styles.alert,
              background: message.type === 'success' ? 'rgba(22, 163, 74, 0.18)' : 'rgba(220, 38, 38, 0.18)',
              border: message.type === 'success' ? '1px solid #22c55e' : '1px solid #ef4444',
              color: message.type === 'success' ? '#86efac' : '#fecaca'
            }}
          >
            {message.text}
          </p>
        )}

        {!token ? (
          <section style={styles.card}>
            <div style={styles.tabs}>
              <button style={{ ...styles.button, ...(authTab === 'register' ? {} : styles.ghostButton) }} onClick={() => setAuthTab('register')}>Créer un compte</button>
              <button style={{ ...styles.button, ...(authTab === 'login' ? {} : styles.ghostButton) }} onClick={() => setAuthTab('login')}>Se connecter</button>
            </div>
            <div style={styles.grid}>
              {authTab === 'register' && <input style={styles.input} type="text" placeholder="Nom complet" value={fullName} onChange={(e) => setFullName(e.target.value)} />}
              <input style={styles.input} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <input style={styles.input} type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div style={{ marginTop: 12 }}>
              {authTab === 'register' ? (
                <button style={styles.button} onClick={register}>S'inscrire</button>
              ) : (
                <button style={styles.button} onClick={login}>Se connecter</button>
              )}
            </div>
          </section>
        ) : (
          <>
            <section style={styles.card}>
              <div style={styles.tabs}>
                <button style={{ ...styles.button, ...(path === '/films' ? {} : styles.ghostButton) }} onClick={() => guardedNavigate('/films')}>/films</button>
                <button style={{ ...styles.button, ...(path === '/review' ? {} : styles.ghostButton) }} onClick={() => guardedNavigate('/review')}>/review</button>
                <button style={{ ...styles.button, ...styles.dangerButton }} onClick={logout}>Logout</button>
              </div>
              {currentUser && <p style={{ margin: 0 }}>{currentUser.fullName} — {currentUser.email}</p>}
            </section>

            {path === '/films' && (
              <>
                <section style={styles.card}>
                  <h2 style={styles.sectionTitle}>Recherche de films (API TMDB externe)</h2>
                  <div style={{ ...styles.grid, gridTemplateColumns: '1fr auto' }}>
                    <input style={styles.input} placeholder="Nom du film" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    <button style={styles.button} onClick={searchTmdbMovies}>Rechercher</button>
                  </div>
                  <div style={{ marginTop: 14 }}>
                    <div style={styles.movieGrid}>
                      {searchResults.map((movie) => (
                        <div key={movie.tmdbId} style={styles.movieCard}>
                          {movie.posterPath ? <img src={movie.posterPath} alt={movie.title} style={styles.poster} /> : <div style={styles.poster} />}
                          <p><strong>{movie.title}</strong></p>
                          <button style={styles.button} onClick={() => addMovie(movie)}>Ajouter</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <section style={styles.card}>
                  <h2 style={styles.sectionTitle}>Films ajoutés (/films)</h2>
                  <div style={styles.movieGrid}>
                    {savedMovies.map((movie) => (
                      <div key={movie.id} style={styles.movieCard}>
                        {movie.posterPath ? <img src={movie.posterPath} alt={movie.title} style={styles.poster} /> : <div style={styles.poster} />}
                        <p><strong>{movie.title}</strong></p>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button
                            style={{ ...styles.button, ...styles.ghostButton }}
                            onClick={() => {
                              setReviewForm((prev) => ({ ...prev, movieId: movie.id }))
                              guardedNavigate('/review')
                            }}
                          >
                            Ajouter review
                          </button>
                          <button style={{ ...styles.button, ...styles.dangerButton }} onClick={() => deleteMovie(movie.id)}>Supprimer</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}

            {path === '/review' && (
              <>
                <section style={styles.card}>
                  <h2 style={styles.sectionTitle}>CRUD simple des reviews (/review)</h2>
                  <div style={styles.grid}>
                    <input style={styles.input} placeholder="Movie ID" value={reviewForm.movieId} onChange={(e) => setReviewForm((prev) => ({ ...prev, movieId: e.target.value }))} />
                    <input style={styles.input} type="number" min="1" max="5" value={reviewForm.rating} onChange={(e) => setReviewForm((prev) => ({ ...prev, rating: e.target.value }))} />
                    <input style={styles.input} placeholder="Commentaire" value={reviewForm.comment} onChange={(e) => setReviewForm((prev) => ({ ...prev, comment: e.target.value }))} />
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <button style={styles.button} onClick={createReview}>Créer review</button>
                  </div>
                </section>

                <section style={styles.card}>
                  <h2 style={styles.sectionTitle}>Mes reviews</h2>
                  <button style={{ ...styles.button, ...styles.ghostButton, marginBottom: 12 }} onClick={loadReviews}>Rafraîchir</button>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {reviews.map((review) => (
                      <div key={review.id} style={styles.movieCard}>
                        <p style={{ marginTop: 0 }}><strong>Movie ID:</strong> {review.movieId}</p>
                        <div style={{ display: 'grid', gap: 8 }}>
                          <input
                            style={styles.input}
                            type="number"
                            min="1"
                            max="5"
                            value={review.rating}
                            onChange={(e) => setReviews((prev) => prev.map((item) => (item.id === review.id ? { ...item, rating: Number(e.target.value) } : item)))}
                          />
                          <input
                            style={styles.input}
                            value={review.comment}
                            onChange={(e) => setReviews((prev) => prev.map((item) => (item.id === review.id ? { ...item, comment: e.target.value } : item)))}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                          <button style={styles.button} onClick={() => { setEditReviewId(review.id); updateReview(review.id) }}>
                            {editReviewId === review.id ? 'Sauvegarde...' : 'Mettre à jour'}
                          </button>
                          <button style={{ ...styles.button, ...styles.dangerButton }} onClick={() => removeReview(review.id)}>Supprimer</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}
          </>
        )}
      </div>
    </main>
  )
}

export default App
