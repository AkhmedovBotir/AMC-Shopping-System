const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

class WebSocketServer {
    constructor(server) {
        this.wss = new WebSocket.Server({ 
            server,
            path: '/ws',
            perMessageDeflate: false,
            clientTracking: true,
            maxPayload: 1024 * 1024, // 1mb
            cors: {
                origin: process.env.FRONTEND_URL || "*",
                methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
                allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
                exposedHeaders: ['Content-Length', 'Content-Range'],
                credentials: true,
                preflightContinue: false,
                optionsSuccessStatus: 204,
                maxAge: 86400
            }
        });

        this.clients = new Map();
        this.setupWSS();
    }

    setupWSS() {
        this.wss.on('connection', async (ws, req) => {
            try {
                // Transport ni tekshirish
                if (ws._socket.protocol !== 'polling') {
                    console.log('Transport polling ga o\'zgartirilmoqda');
                    ws.close();
                    return;
                }

                // CORS headers
                const corsHeaders = {
                    'Access-Control-Allow-Origin': process.env.FRONTEND_URL || '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept',
                    'Access-Control-Allow-Credentials': 'true',
                    'Access-Control-Expose-Headers': 'Content-Length, Content-Range'
                };

                // OPTIONS so'rovlarini qayta ishlash
                if (req.method === 'OPTIONS') {
                    Object.entries(corsHeaders).forEach(([key, value]) => {
                        ws.send(JSON.stringify({
                            type: 'header',
                            key: key,
                            value: value
                        }));
                    });
                    return;
                }

                // Token ni tekshirish
                const token = this.extractToken(req);
                if (!token) {
                    ws.close(4001, 'Authentication required');
                    return;
                }

                // Token ni verify qilish
                const decoded = await this.verifyToken(token);
                if (!decoded) {
                    ws.close(4002, 'Invalid token');
                    return;
                }

                // Client ni saqlash
                const clientId = decoded.userId || decoded.id;
                this.clients.set(clientId, ws);

                console.log(`Client connected: ${clientId}, Total clients: ${this.clients.size}`);

                // Headers ni o'rnatish
                Object.entries(corsHeaders).forEach(([key, value]) => {
                    ws.send(JSON.stringify({
                        type: 'header',
                        key: key,
                        value: value
                    }));
                });

                // Ping/Pong
                ws.isAlive = true;
                ws.on('pong', () => {
                    ws.isAlive = true;
                });

                // Message handler
                ws.on('message', async (message) => {
                    try {
                        const data = JSON.parse(message);
                        console.log(`Received message from ${clientId}:`, data);
                        
                        // Message ni qayta ishlash
                        await this.handleMessage(clientId, data);
                    } catch (err) {
                        console.error('Message handling error:', err);
                        ws.send(JSON.stringify({
                            type: 'error',
                            message: 'Invalid message format'
                        }));
                    }
                });

                // Close handler
                ws.on('close', () => {
                    console.log(`Client disconnected: ${clientId}`);
                    this.clients.delete(clientId);
                });

                // Error handler
                ws.on('error', (error) => {
                    console.error(`WebSocket error for client ${clientId}:`, error);
                    this.clients.delete(clientId);
                });

            } catch (err) {
                console.error('WebSocket connection error:', err);
                ws.close(4000, 'Connection error');
            }
        });

        // Ping interval
        setInterval(() => {
            this.wss.clients.forEach((ws) => {
                if (ws.isAlive === false) {
                    console.log('Terminating inactive client');
                    return ws.terminate();
                }
                ws.isAlive = false;
                ws.ping();
            });
        }, 20000);
    }

    extractToken(req) {
        if (!req.headers.authorization) return null;
        const authHeader = req.headers.authorization;
        if (authHeader.startsWith('Bearer ')) {
            return authHeader.substring(7, authHeader.length);
        }
        return null;
    }

    async verifyToken(token) {
        try {
            return jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            console.error('Token verification error:', err);
            return null;
        }
    }

    async handleMessage(clientId, data) {
        const ws = this.clients.get(clientId);
        if (!ws) return;

        try {
            switch (data.type) {
                case 'ping':
                    ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
                    break;

                case 'get':
                    await this.handleGet(clientId, data);
                    break;

                case 'post':
                    await this.handlePost(clientId, data);
                    break;

                case 'put':
                    await this.handlePut(clientId, data);
                    break;

                case 'patch':
                    await this.handlePatch(clientId, data);
                    break;

                case 'delete':
                    await this.handleDelete(clientId, data);
                    break;
                    
                default:
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Unknown message type'
                    }));
            }
        } catch (err) {
            console.error('Message handling error:', err);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Internal server error',
                error: err.message
            }));
        }
    }

    async handleGet(clientId, data) {
        const ws = this.clients.get(clientId);
        if (!ws) return;

        try {
            // GET so'rovini qayta ishlash
            ws.send(JSON.stringify({
                type: 'response',
                method: 'GET',
                data: data,
                timestamp: Date.now()
            }));
        } catch (err) {
            this.handleError(ws, err);
        }
    }

    async handlePost(clientId, data) {
        const ws = this.clients.get(clientId);
        if (!ws) return;

        try {
            // POST so'rovini qayta ishlash
            ws.send(JSON.stringify({
                type: 'response',
                method: 'POST',
                data: data,
                timestamp: Date.now()
            }));
        } catch (err) {
            this.handleError(ws, err);
        }
    }

    async handlePut(clientId, data) {
        const ws = this.clients.get(clientId);
        if (!ws) return;

        try {
            // PUT so'rovini qayta ishlash
            ws.send(JSON.stringify({
                type: 'response',
                method: 'PUT',
                data: data,
                timestamp: Date.now()
            }));
        } catch (err) {
            this.handleError(ws, err);
        }
    }

    async handlePatch(clientId, data) {
        const ws = this.clients.get(clientId);
        if (!ws) return;

        try {
            // PATCH so'rovini qayta ishlash
            ws.send(JSON.stringify({
                type: 'response',
                method: 'PATCH',
                data: data,
                timestamp: Date.now()
            }));
        } catch (err) {
            this.handleError(ws, err);
        }
    }

    async handleDelete(clientId, data) {
        const ws = this.clients.get(clientId);
        if (!ws) return;

        try {
            // DELETE so'rovini qayta ishlash
            ws.send(JSON.stringify({
                type: 'response',
                method: 'DELETE',
                data: data,
                timestamp: Date.now()
            }));
        } catch (err) {
            this.handleError(ws, err);
        }
    }

    handleError(ws, error) {
        console.error('Operation error:', error);
        ws.send(JSON.stringify({
            type: 'error',
            message: error.message || 'Internal server error',
            timestamp: Date.now()
        }));
    }

    broadcast(message) {
        this.clients.forEach((ws) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(message));
            }
        });
    }

    sendTo(clientId, message) {
        const ws = this.clients.get(clientId);
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }
}

module.exports = WebSocketServer;
