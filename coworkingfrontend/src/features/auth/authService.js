import axios from 'axios'

const api = axios.create({ baseURL: `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/auth` })
const saveSession = (data) => {
    const session = { ...data.user, token: data.token }
    localStorage.setItem('user', JSON.stringify(session))
    return session
}
const register = async (userData) => saveSession((await api.post('/register', userData)).data)
const login = async (userData) => saveSession((await api.post('/login', userData)).data)
const logout = async () => {
    let session
    try { session = JSON.parse(localStorage.getItem('user')) } catch { session = null }
    try {
        if (session?.token) await api.get('/logout', { headers: { Authorization: `Bearer ${session.token}` } })
    } finally { localStorage.removeItem('user') }
}
export default { register, login, logout }
