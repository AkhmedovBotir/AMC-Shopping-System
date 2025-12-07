const express = require('express');
const path = require('path');
const exphbs = require('express-handlebars');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();
require('./models/user.model'); // User modelini import qilish
require('./models/counter.model'); // Counter modelini import qilish

// Routes
const adminRoutes = require('./routes/admin.routes');
const categoryRoutes = require('./routes/category.routes');
const productRoutes = require('./routes/product.routes');
const sellerRoutes = require('./routes/seller.routes');
const saleRoutes = require('./routes/sale.routes');
const storeOwnerRoutes = require('./routes/storeOwner.routes');
const storeOwnerAuthRoutes = require('./routes/storeOwnerAuth.routes');
const statisticsRoutes = require('./routes/statistics.routes');
const draftOrderRoutes = require('./routes/draftOrder.routes');
const notificationRoutes = require('./routes/notification.routes');
const orderHistoryRoutes = require('./routes/orderHistory.routes');
const reportRoutes = require('./routes/report.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const adminStoreOwnerViewRoutes = require('./routes/adminStoreOwner.routes');
const adminAuthViewRoutes = require('./routes/adminAuthView.routes');
const subscriptionRoutes = require('./routes/subscription.routes');
const { checkSubscription } = require('./middleware/subscription.middleware');

const app = express();
const server = http.createServer(app);

// CORS options
const corsOptions = {
    origin: process.env.FRONTEND_URL || "*",
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Content-Length', 'Content-Range'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 86400
};

// CORS middleware
app.use(cors(corsOptions));

// Pre-flight requests
app.options('*', cors(corsOptions));

// Route handlers
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
    
    // Handle OPTIONS
    if (req.method === 'OPTIONS') {
        res.sendStatus(204);
    } else {
        next();
    }
});

app.use(express.json());
// Statik fayllar
app.use(express.static(path.join(__dirname, 'public')));

// View engine Handlebars
app.engine('hbs', exphbs.engine({
    extname: 'hbs',
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'views', 'admin', 'layouts'),
    partialsDir: path.join(__dirname, 'views', 'admin', 'partials'),
    helpers: {
        ifEq: function(a, b, options) {
            // Debug logging
            console.log('ifEq comparison:', { a, b, typeA: typeof a, typeB: typeof b, equal: a == b });
            // Convert both values to strings for comparison to avoid type issues
            const valA = a ? a.toString() : '';
            const valB = b ? b.toString() : '';
            return (valA === valB) ? options.fn(this) : options.inverse(this);
        },
        // Add a debug helper
        debug: function(optionalValue) {
            console.log('Current Context');
            console.log('====================');
            console.log(this);
            
            if (optionalValue) {
                console.log('Value');
                console.log('====================');
                console.log(optionalValue);
            }
            
            return ''; // Return empty string to avoid output in template
        },
        // Format date in a user-friendly way
        formatDate: function(dateString) {
            if (!dateString) return 'Muddat kiritilmagan';
            
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Noto\'g\'ri sana';
            
            // Format: 27-iyun, 2025
            const options = { 
                year: 'numeric', 
                month: 'long', 
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            };
            
            return date.toLocaleDateString('uz-UZ', options);
        }
    }
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Apply subscription check to all API routes
app.use('/api', checkSubscription);

// Routes
app.use('/api/admin', adminRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sellers', sellerRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/store-owners', storeOwnerRoutes);
app.use('/api/store-owner', storeOwnerAuthRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/draft-orders', draftOrderRoutes);
app.use('/api/order-history', orderHistoryRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/subscription', subscriptionRoutes); // Add subscription routes

// Admin panel views
app.use('/admin', adminAuthViewRoutes);
app.use('/admin/store-owners', adminStoreOwnerViewRoutes);

// WebSocket sozlamalari
const io = new Server(server, {
    cors: corsOptions,
    path: '/socket.io/',
    transports: ['polling'],
    allowUpgrades: false,
    upgradeTimeout: 0,
    pingTimeout: 20000,
    pingInterval: 10000,
    cookie: false,
    allowEIO3: true,
    maxHttpBufferSize: 1e8,
    connectTimeout: 20000,
    perMessageDeflate: false,
    httpCompression: false,
    forceBase64: true,
    wsEngine: false  // WebSocket engine ni o'chirish
});

// Engine options
io.engine.opts.transports = ['polling'];
io.engine.opts.upgrade = false;

// WebSocket handlers
const WebSocketHandlers = require('./websocket/handlers');
const wsHandler = new WebSocketHandlers(io);

io.on('connection', (socket) => {
    // Transport ni tekshirish
    if (socket.conn.transport.name !== 'polling') {
        console.log('Transport polling ga o\'zgartirilmoqda');
        socket.conn.transport.close();
        return;
    }

    // Auth token ni olish
    const token = socket.handshake.headers.authorization;
    console.log('Client connected:', socket.id, 'Transport:', socket.conn.transport.name);

    // Upgrade ni bloklash
    socket.conn.on('upgrade', () => {
        console.log('Upgrade bloklandi');
        socket.disconnect();
    });

    socket.on('error', (error) => {
        console.error('Socket error:', error);
    });

    wsHandler.setupHandlers(io, socket);
    
    socket.on('disconnect', (reason) => {
        console.log('Client disconnected:', socket.id, 'Reason:', reason);
    });
});

// WebSocket handlerga global access
app.set('wsHandler', wsHandler);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bar', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Error handling
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: {
            message: err.message || 'Internal server error'
        }
    });
});

// Start server
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
