import React, { useMemo, useState } from 'react'

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [activeTab, setActiveTab] = useState(token ? 'movies' : 'login')
  const [message, setMessage] = useState({ type: '', text: '' })

  const [movies, setMovies] = useState([])
  const [title, setTitle] = useState('')
  const [userId, setUserId] = useState('')
  const [searchMovieId, setSearchMovieId] = useState('')

  const [movieIdForReview, setMovieIdForReview] = useState('')
  const [userIdForReview, setUserIdForReview] = useState('')
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
        body: JSON.stringify({ email, password })
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
      localStorage.setItem('token', data.token)
      setActiveTab('movies')
      showSuccess('Connexion réussie.')
    } catch (err) {
      showError(err.message)
    }
  }

  const logout = () => {
    setToken('')
    localStorage.removeItem('token')
    setActiveTab('login')
    showSuccess('Déconnexion réussie.')
  }

  const addMovie = async () => {
    try {
      const response = await fetch('/movies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ title, userId })
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
          userId: userIdForReview,
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
    <div style={{ padding: '20px' }}>
      <h1>Movies Microservices Client</h1>

      {message.text && (
        <p style={{ color: message.type === 'success' ? 'green' : 'red' }}>{message.text}</p>
      )}

      {!token ? (
        <>
          <div>
            <button style={{ cursor: 'pointer' }} onClick={() => setActiveTab('register')}>Register</button>{' '}
            <button style={{ cursor: 'pointer' }} onClick={() => setActiveTab('login')}>Login</button>
          </div>

          <hr />

          <input
            style={{ marginBottom: '8px' }}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <br />
          <input
            style={{ marginBottom: '8px' }}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <br />

          {activeTab === 'register' ? (
            <button style={{ cursor: 'pointer' }} onClick={register}>S'inscrire</button>
          ) : (
            <button style={{ cursor: 'pointer' }} onClick={login}>Se connecter</button>
          )}
        </>
      ) : (
        <>
          <div>
            <button style={{ cursor: 'pointer' }} onClick={() => setActiveTab('movies')}>Movies</button>{' '}
            <button style={{ cursor: 'pointer' }} onClick={() => setActiveTab('reviews')}>Reviews</button>{' '}
            <button style={{ cursor: 'pointer' }} onClick={logout}>Logout</button>
          </div>

          <hr />

          {activeTab === 'movies' && (
            <>
              <h2>Add Movie</h2>
              <input
                style={{ marginBottom: '8px' }}
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <br />
              <input
                style={{ marginBottom: '8px' }}
                placeholder="User ID"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              />
              <br />
              <button style={{ cursor: 'pointer' }} onClick={addMovie}>Ajouter le film</button>

              <hr />

              <h2>Get Movie by ID</h2>
              <input
                style={{ marginBottom: '8px' }}
                placeholder="Movie ID"
                value={searchMovieId}
                onChange={(e) => setSearchMovieId(e.target.value)}
              />
              <br />
              <button style={{ cursor: 'pointer' }} onClick={getMovieById}>Rechercher</button>

              <ul>
                {movies.map((movie) => (
                  <li key={movie.id}>
                    <strong>{movie.title}</strong> — userId: {movie.userId} (id: {movie.id})
                  </li>
                ))}
              </ul>
            </>
          )}

          {activeTab === 'reviews' && (
            <>
              <h2>Add Review</h2>
              <input
                style={{ marginBottom: '8px' }}
                placeholder="Movie ID"
                value={movieIdForReview}
                onChange={(e) => setMovieIdForReview(e.target.value)}
              />
              <br />
              <input
                style={{ marginBottom: '8px' }}
                placeholder="User ID"
                value={userIdForReview}
                onChange={(e) => setUserIdForReview(e.target.value)}
              />
              <br />
              <input
                style={{ marginBottom: '8px' }}
                type="number"
                min="1"
                max="5"
                placeholder="Rating (1-5)"
                value={rating}
                onChange={(e) => setRating(e.target.value)}
              />
              <br />
              <input
                style={{ marginBottom: '8px' }}
                placeholder="Comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <br />
              <button style={{ cursor: 'pointer' }} onClick={addReview}>Ajouter review</button>

              <hr />

              <h2>Get Reviews by Movie</h2>
              <input
                style={{ marginBottom: '8px' }}
                placeholder="Movie ID"
                value={movieIdForReview}
                onChange={(e) => setMovieIdForReview(e.target.value)}
              />
              <br />
              <button style={{ cursor: 'pointer' }} onClick={getReviewsByMovie}>Charger reviews</button>

              <hr />

              <h2>Get Review by ID</h2>
              <input
                style={{ marginBottom: '8px' }}
                placeholder="Review ID"
                value={searchReviewId}
                onChange={(e) => setSearchReviewId(e.target.value)}
              />
              <br />
              <button style={{ cursor: 'pointer' }} onClick={getReviewById}>Rechercher review</button>

              <hr />

              <h2>Delete Review</h2>
              <input
                style={{ marginBottom: '8px' }}
                placeholder="Review ID"
                value={deleteReviewId}
                onChange={(e) => setDeleteReviewId(e.target.value)}
              />
              <br />
              <button style={{ cursor: 'pointer' }} onClick={deleteReview}>Supprimer review</button>

              <ul>
                {reviews.map((review) => (
                  <li key={review.id}>
                    {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)} — {review.comment} — userId: {review.userId} — {new Date(review.createdAt).toLocaleString()}
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  )
}

export default App
