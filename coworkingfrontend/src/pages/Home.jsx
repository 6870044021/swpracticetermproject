import {Link} from 'react-router-dom'

import {FaQuestionCircle, FaTicketAlt} from 'react-icons/fa'

function Home(){
    return(
        <>
        <section className='heading'>
            <h1>WoTA: Working Time Allocator</h1>
            <h2>A Co-working Space Reservation system</h2>
            <p>Please choose from an option below</p>
        </section>

        <Link to='/new-ticket' className='btn btn-reverse btn-block'>
        <FaQuestionCircle />Create New Reservation
        </Link>

        <Link to='/tickets' className='btn btn-block'>
        <FaTicketAlt />View My Reservations
        </Link>
        </>
    )
}

export default Home;