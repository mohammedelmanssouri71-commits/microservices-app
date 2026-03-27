import React, { useMemo, useState } from 'react'

const styles = {
  page: {
    minHeight: '100vh',
    margin: 0,
    background: 'linear-gradient(180deg, #0f172a 0%, #111827 45%, #1f2937 100%)',
    color: '#e5e7eb',
    padding: '32px 16px',
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  },
  container: {
    maxWidth: '1000px',
    margin: '0 auto'
  },
  title: {
    margin: '0 0 8px',
    fontSize: '2rem'
  },
  subtitle: {
    margin: '0 0 24px',
    color: '#9ca3af'
  },
  alert: {
    padding: '12px 14px',
    borderRadius: '10px',
    marginBottom: '16px',
    fontWeight: 500
  },
  tabs: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    marginBottom: '20px'
  },
  button: {
    border: 0,
    borderRadius: '10px',
    padding: '10px 14px',
    cursor: 'pointer',
    fontWeight: 600,
    background: '#374151',
    color: '#e5e7eb'
  },
  activeButton: {
    background: '#2563eb',
    color: '#ffffff'
  },
  ghostButton: {
    background: '#1f2937',
    border: '1px solid #4b5563'
  },
  card: {
    background: 'rgba(17, 24, 39, 0.9)',
    border: '1px solid #374151',
    borderRadius: '16px',
    padding: '18px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
    marginBottom: '16px'
  },
  sectionTitle: {
    margin: '0 0 12px',
    fontSize: '1.15rem'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '12px',
    marginBottom: '12px'
  },
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
  list: {
    margin: '8px 0 0',
    paddingLeft: '20px',
    color: '#d1d5db'
  },
  listItem: {
    marginBottom: '8px',
    lineHeight: 1.4
  }
}

const tabButtonStyle = (isActive) => ({
  ...styles.button,
  ...(isActive ? styles.activeButton : styles.ghostButton)
})

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '')
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('currentUser')
    return saved ? JSON.parse(saved) : null
  })
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [activeTab, setActiveTab] = useState(token ? 'movies' : 'login')
  const [message, setMessage] = useState({ type: '', text: '' })

  const [movies, setMovies] = useState([])
  const [title, setTitle] = useState('')
  const [searchMovieId, setSearchMovieId] = useState('')

  const [movieIdForReview, setMovieIdForReview] = useState('')
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')

  const [reviews, setReviews] = useState([])
  const [searchReviewId, setSearchReviewId] = useState('')
  const [deleteReviewId, setDeleteReviewId] = useState('')

  const authHeader = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token])

  const handleApiError = async (response) => {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error || 'Unexpected error')
  }

  const showSuccess = (text) => setMessage({ type: 'success', text })
  const showError = (text) => setMessage({ type: 'error', text })

  const register = async () => {
    try {
      const response = await fetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password })
      })

      if (!response.ok) {
        await handleApiError(response)
      }

      const data = await response.json()
      showSuccess(`Inscription réussie. userId: ${data.userId}`)
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

      if (!response.ok) {
        await handleApiError(response)
      }

      const data = await response.json()
      setToken(data.token)
      setCurrentUser(data.user)
      localStorage.setItem('token', data.token)
      localStorage.setItem('currentUser', JSON.stringify(data.user))
      setActiveTab('movies')
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
    setActiveTab('login')
    showSuccess('Déconnexion réussie.')
  }

  const addMovie = async () => {
    try {
      const response = await fetch('/movies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ title })
      })

      if (!response.ok) {
        await handleApiError(response)
      }

      const data = await response.json()
      setMovies((prev) => [data, ...prev])
      showSuccess('Film ajouté.')
    } catch (err) {
      showError(err.message)
    }
  }

  const getMovieById = async () => {
    try {
      const response = await fetch(`/movies/${searchMovieId}`, {
        headers: { ...authHeader }
      })

      if (!response.ok) {
        await handleApiError(response)
      }

      const data = await response.json()
      setMovies([data])
      showSuccess('Film récupéré.')
    } catch (err) {
      showError(err.message)
    }
  }

  const addReview = async () => {
    try {
      const response = await fetch('/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({
          movieId: movieIdForReview,
          rating: Number(rating),
          comment
        })
      })

      if (!response.ok) {
        await handleApiError(response)
      }

      const data = await response.json()
      setReviews((prev) => [data, ...prev])
      showSuccess('Review ajoutée.')
    } catch (err) {
      showError(err.message)
    }
  }

  const getReviewsByMovie = async () => {
    try {
      const response = await fetch(`/movies/${movieIdForReview}/reviews`, {
        headers: { ...authHeader }
      })

      if (!response.ok) {
        await handleApiError(response)
      }

      const data = await response.json()
      setReviews(data.reviews || [])
      showSuccess('Reviews récupérées.')
    } catch (err) {
      showError(err.message)
    }
  }

  const getReviewById = async () => {
    try {
      const response = await fetch(`/reviews/${searchReviewId}`, {
        headers: { ...authHeader }
      })

      if (!response.ok) {
        await handleApiError(response)
      }

      const data = await response.json()
      setReviews([data])
      showSuccess('Review récupérée.')
    } catch (err) {
      showError(err.message)
    }
  }

  const deleteReview = async () => {
    try {
      const response = await fetch(`/reviews/${deleteReviewId}`, {
        method: 'DELETE',
        headers: { ...authHeader }
      })

      if (!response.ok) {
        await handleApiError(response)
      }

      const data = await response.json()
      setReviews((prev) => prev.filter((r) => r.id !== deleteReviewId))
      showSuccess(data.message || 'Review supprimée.')
    } catch (err) {
      showError(err.message)
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.title}>🎬 Movies Microservices Client</h1>
        <p style={styles.subtitle}>Interface unifiée pour Auth, Movies et Reviews.</p>

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
              <button style={tabButtonStyle(activeTab === 'register')} onClick={() => setActiveTab('register')}>Créer un compte</button>
              <button style={tabButtonStyle(activeTab === 'login')} onClick={() => setActiveTab('login')}>Se connecter</button>
            </div>

            <div style={styles.grid}>
              {activeTab === 'register' && (
                <input
                  style={styles.input}
                  type="text"
                  placeholder="Nom complet"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              )}
              <input
                style={styles.input}
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                style={styles.input}
                type="password"
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {activeTab === 'register' ? (
              <button style={styles.button} onClick={register}>S'inscrire</button>
            ) : (
              <button style={styles.button} onClick={login}>Se connecter</button>
            )}
          </section>
        ) : (
          <>
            {currentUser && (
              <section style={styles.card}>
                <h2 style={styles.sectionTitle}>Utilisateur connecté</h2>
                <p style={{ margin: 0 }}>
                  {currentUser.fullName} — {currentUser.email} (id: {currentUser.id})
                </p>
              </section>
            )}
            <div style={styles.tabs}>
              <button style={tabButtonStyle(activeTab === 'movies')} onClick={() => setActiveTab('movies')}>Movies</button>
              <button style={tabButtonStyle(activeTab === 'reviews')} onClick={() => setActiveTab('reviews')}>Reviews</button>
              <button style={{ ...styles.button, background: '#b91c1c' }} onClick={logout}>Logout</button>
            </div>

            {activeTab === 'movies' && (
              <>
                <section style={styles.card}>
                  <h2 style={styles.sectionTitle}>Ajouter un film</h2>
                  <div style={styles.grid}>
                    <input
                      style={styles.input}
                      placeholder="Titre"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>
                  <button style={styles.button} onClick={addMovie}>Ajouter le film</button>
                </section>

                <section style={styles.card}>
                  <h2 style={styles.sectionTitle}>Rechercher un film</h2>
                  <div style={styles.grid}>
                    <input
                      style={styles.input}
                      placeholder="Movie ID"
                      value={searchMovieId}
                      onChange={(e) => setSearchMovieId(e.target.value)}
                    />
                  </div>
                  <button style={styles.button} onClick={getMovieById}>Rechercher</button>

                  <ul style={styles.list}>
                    {movies.map((movie) => (
                      <li key={movie.id} style={styles.listItem}>
                        <strong>{movie.title}</strong> — userId: {movie.userId} (id: {movie.id})
                      </li>
                    ))}
                  </ul>
                </section>
              </>
            )}

            {activeTab === 'reviews' && (
              <>
                <section style={styles.card}>
                  <h2 style={styles.sectionTitle}>Ajouter une review</h2>
                  <div style={styles.grid}>
                    <input
                      style={styles.input}
                      placeholder="Movie ID"
                      value={movieIdForReview}
                      onChange={(e) => setMovieIdForReview(e.target.value)}
                    />
                    <input
                      style={styles.input}
                      type="number"
                      min="1"
                      max="5"
                      placeholder="Rating (1-5)"
                      value={rating}
                      onChange={(e) => setRating(e.target.value)}
                    />
                    <input
                      style={styles.input}
                      placeholder="Commentaire"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                  </div>
                  <button style={styles.button} onClick={addReview}>Ajouter review</button>
                </section>

                <section style={styles.card}>
                  <h2 style={styles.sectionTitle}>Charger les reviews d'un film</h2>
                  <div style={styles.grid}>
                    <input
                      style={styles.input}
                      placeholder="Movie ID"
                      value={movieIdForReview}
                      onChange={(e) => setMovieIdForReview(e.target.value)}
                    />
                  </div>
                  <button style={styles.button} onClick={getReviewsByMovie}>Charger reviews</button>
                </section>

                <section style={styles.card}>
                  <h2 style={styles.sectionTitle}>Rechercher une review</h2>
                  <div style={styles.grid}>
                    <input
                      style={styles.input}
                      placeholder="Review ID"
                      value={searchReviewId}
                      onChange={(e) => setSearchReviewId(e.target.value)}
                    />
                  </div>
                  <button style={styles.button} onClick={getReviewById}>Rechercher review</button>
                </section>

                <section style={styles.card}>
                  <h2 style={styles.sectionTitle}>Supprimer une review</h2>
                  <div style={styles.grid}>
                    <input
                      style={styles.input}
                      placeholder="Review ID"
                      value={deleteReviewId}
                      onChange={(e) => setDeleteReviewId(e.target.value)}
                    />
                  </div>
                  <button style={{ ...styles.button, background: '#b91c1c' }} onClick={deleteReview}>Supprimer review</button>

                  <ul style={styles.list}>
                    {reviews.map((review) => (
                      <li key={review.id} style={styles.listItem}>
                        {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)} — {review.comment} — userId: {review.userId} — {new Date(review.createdAt).toLocaleString()}
                      </li>
                    ))}
                  </ul>
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
