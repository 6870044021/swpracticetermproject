const express = require('express');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const helmet = require('helmet');
//CORS
const cors = require('cors');

const mongoSanitize = require('@exortek/express-mongo-sanitize');

const {xss} = require('express-xss-sanitizer');

const rateLimit = require('express-rate-limit');

//Swagger
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUI = require('swagger-ui-express');

const hpp = require('hpp');


dotenv.config({path:'./config/config.env'});

connectDB();

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors());
app.use(mongoSanitize());
//Set security headers
app.use(helmet());
//Prevent XSS attacks
app.use(xss());

app.use(hpp());

app.set('query parser', 'extended');

//Rate Limiting
const limiter = rateLimit({
    windowMs:10*60*1000, //10 mins
    max: 100
});

app.use(limiter);

const swaggerOptions = {
    swaggerDefinition:{
        openapi: '3.0.0',
        info:{
            title: 'Library API',
            version: '1.0.0',
            description: 'A simple Express Co-Working Space Reservation API'
        },
        servers: [
            {
                url: 'http://localhost:5000/api/v1'
            }
        ],
    },
    apis:['./routes/*.js'],
};
const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerDocs));


const rooms = require('./routes/rooms');
const reservations = require('./routes/reservations');
const reviews = require('./routes/reviews');
const notes = require('./routes/notes');
const auth = require('./routes/auth');

app.get('/', (req, res) => {
    res.status(200).json({success:true, data:{id:1}});

});






//ถ้ามี request มาที่ path นี้ให้ส่งต่อไปไฟล์ rooms
app.use('/api/v1/rooms', rooms);

app.use('/api/v1/reservations', reservations);

app.use('/api/v1/reviews', reviews);

app.use('/api/v1/notes', notes);

//ถ้ามี request มาที่ path นี้ให้ส่งต่อไปไฟล์ auth
app.use('/api/v1/auth', auth);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, console.log('Server running in ', process.env.NODE_ENV, ' mode on port ', PORT));

process.on('unhandledRejection', (err, promise)=>{
    console.log(`Error: ${err.message}`);
    server.close(()=>process.exit(1));
})


