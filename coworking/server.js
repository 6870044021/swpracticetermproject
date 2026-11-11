const express = require('express');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
//Security (Chapter 12)
const mongoSanitize = require('@exortek/express-mongo-sanitize');
const helmet = require('helmet');
const { xss } = require('express-xss-sanitizer');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const cors = require('cors');
//Swagger (Chapter 13)
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUI = require('swagger-ui-express');

//Load env vars
dotenv.config({ path: './config/config.env' });

//Connect to database
connectDB();

//Route files
const rooms = require('./routes/rooms');
const reservations = require('./routes/reservations');
const reviews = require('./routes/reviews');
const notes = require('./routes/notes');
const auth = require('./routes/auth');

const app = express();

//Express 5 needs the extended query parser for filters such as ?name[gt]=A
app.set('query parser', 'extended');

//(1) body parser ต้องมาก่อน
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

//(2) security middleware
//Prevent NoSQL injection
app.use(mongoSanitize());
//Set security headers
app.use(helmet());
//Prevent XSS attacks
app.use(xss());
//Rate limiting: 100 requests / 10 minutes in production; RATE_LIMIT_MAX overrides it
//(a full Postman Runner / Newman run sends more than 100 requests, so development allows more)
const limiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX) || (process.env.NODE_ENV === 'production' ? 100 : 1000)
});
app.use(limiter);
//Express 5: req.query is read-only, so make it writable before hpp (otherwise hpp silently does nothing)
app.use((req, res, next) => {
    Object.defineProperty(req, 'query', { value: { ...req.query }, writable: true });
    next();
});
//Prevent http param pollution
app.use(hpp());
//Enable CORS
app.use(cors());

//API documentation
const PORT = process.env.PORT || 5000;
const swaggerOptions = {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: 'WoTA: Working Time Allocator API',
            version: '1.0.0',
            description: 'Co-working space reservation REST API (2110503 Software Development Practice term project)'
        },
        servers: [{ url: `http://localhost:${PORT}/api/v1` }],
        components: {
            securitySchemes: {
                bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
            }
        }
    },
    apis: ['./routes/*.js']
};
const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerDocs));

app.get('/', (req, res) => {
    res.status(200).json({ success: true, data: { name: 'WoTA API', docs: '/api-docs' } });
});

//(3) routes ต้องอยู่หลังสุด
//ถ้ามี request มาที่ path นี้ให้ส่งต่อไปไฟล์ rooms
app.use('/api/v1/rooms', rooms);
app.use('/api/v1/reservations', reservations);
app.use('/api/v1/reviews', reviews);
app.use('/api/v1/notes', notes);
//ถ้ามี request มาที่ path นี้ให้ส่งต่อไปไฟล์ auth
app.use('/api/v1/auth', auth);

//Unknown route
app.use((req, res) => {
    res.status(404).json({ success: false, message: `Cannot ${req.method} ${req.originalUrl}` });
});

//Errors thrown before a controller runs (e.g. malformed JSON body) are answered as JSON too
app.use((err, req, res, next) => {
    const status = err.status || err.statusCode || 500;
    if (status >= 500) {
        console.log(err.stack);
    }
    res.status(status).json({
        success: false,
        message: status >= 500 ? 'Server error' : err.type === 'entity.parse.failed' ? 'Malformed JSON body' : err.message
    });
});

const server = app.listen(PORT, console.log('Server running in ', process.env.NODE_ENV, ' mode on port ', PORT));

//Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    console.log(`Error: ${err.message}`);
    //Close server & exit process
    server.close(() => process.exit(1));
});
