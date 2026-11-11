import { Link } from 'react-router-dom'
function Home() {
    return <section className='heading'>
        <h1>WoTA Co-working Space Reservations</h1>
        <p>Browse rooms and manage reservations through the WoTA API.</p>
        <p><a href={`${(import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1').replace(/\/api\/v1\/?$/, '')}/api-docs`}>API documentation</a></p>
        <Link to='/login'>Log in</Link>
    </section>
}
export default Home
