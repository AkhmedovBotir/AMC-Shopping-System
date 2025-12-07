# Sotuvchilar uchun WebSocket Dokumentatsiyasi

## Ulanish

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:5000', {
    path: '/socket.io/',
    transports: ['polling'],
    auth: {
        token: 'your-jwt-token'  // JWT tokenni auth header orqali yuborish
    }
});

// Ulanish holati
socket.on('connect', () => {
    console.log('WebSocket serverga ulandi');
});

socket.on('disconnect', () => {
    console.log('WebSocket serverdan uzildi');
});

socket.on('error', (error) => {
    console.error('WebSocket xatosi:', error);
});
```

## Sotuvchi Autentifikatsiyasi Events

### 1. Sotuvchi Ulanishi
```javascript
// Sotuvchi ulanganda
socket.emit('seller_connected', sellerId);

// Boshqa sotuvchilar ulanganini eshitish
socket.on('seller_connected', ({ seller }) => {
    console.log('Yangi sotuvchi ulandi:', seller);
});
```

### 2. Sotuvchi Uzilishi
```javascript
// Boshqa sotuvchilar uzilganini eshitish
socket.on('seller_disconnected', ({ seller }) => {
    console.log('Sotuvchi uzildi:', seller);
});
```

### 3. Sotuvchi Login/Logout
```javascript
socket.on('seller_login', ({ seller }) => {
    console.log('Sotuvchi tizimga kirdi:', seller);
});

socket.on('seller_logout', ({ seller }) => {
    console.log('Sotuvchi tizimdan chiqdi:', seller);
});
```

## Draft Order Events

### 1. Draft Order Yaratish
```javascript
socket.on('draft_order_created', ({ draftOrder }) => {
    console.log('Yangi draft order yaratildi:', draftOrder);
    // UI ni yangilash
});
```

### 2. Draft Order Yangilash
```javascript
socket.on('draft_order_updated', ({ draftOrder }) => {
    console.log('Draft order yangilandi:', draftOrder);
    // UI ni yangilash
});
```

### 3. Draft Order O'chirish
```javascript
socket.on('draft_order_deleted', ({ draftOrderId }) => {
    console.log('Draft order o\'chirildi:', draftOrderId);
    // UI dan o'chirish
});
```

### 4. Draft Order Yakunlash
```javascript
socket.on('draft_order_completed', ({ draftOrder }) => {
    console.log('Draft order yakunlandi:', draftOrder);
    // UI ni yangilash
});
```

### 5. Draft Order Bekor Qilish
```javascript
socket.on('draft_order_cancelled', ({ draftOrder }) => {
    console.log('Draft order bekor qilindi:', draftOrder);
    // UI ni yangilash
});
```

## Sotuvlar Tarixi Events

### 1. Yangi Sotuv
```javascript
socket.on('sale_created', ({ sale }) => {
    console.log('Yangi sotuv yaratildi:', sale);
    // Sotuvlar ro'yxatiga qo'shish
});
```

### 2. Sotuv Yangilanishi
```javascript
socket.on('sale_updated', ({ sale }) => {
    console.log('Sotuv yangilandi:', sale);
    // Sotuvni yangilash
});
```

### 3. Sotuv Bekor Qilish
```javascript
socket.on('sale_cancelled', ({ sale }) => {
    console.log('Sotuv bekor qilindi:', sale);
    // UI ni yangilash
});
```

### 4. Sotuv Qaytarish (Refund)
```javascript
socket.on('sale_refunded', ({ sale }) => {
    console.log('Sotuv qaytarildi:', sale);
    // UI ni yangilash
});
```

## Order History Events

### 1. Order History Yangilanishi
```javascript
socket.on('order_history_updated', ({ orderHistory }) => {
    console.log('Order history yangilandi:', orderHistory);
    // Order history ni yangilash
});
```

### 2. Order Status O'zgarishi
```javascript
socket.on('order_status_changed', ({ orderId, oldStatus, newStatus, timestamp }) => {
    console.log(`Order ${orderId} statusi o'zgardi:`, oldStatus, '=>', newStatus);
    // Status o'zgarishini ko'rsatish
});
```

## Mahsulotlar Events

### 1. Mahsulot Yaratilishi
```javascript
socket.on('product_created', ({ product }) => {
    console.log('Yangi mahsulot yaratildi:', product);
    // Mahsulotlar ro'yxatiga qo'shish
});
```

### 2. Mahsulot Yangilanishi
```javascript
socket.on('product_updated', ({ product }) => {
    console.log('Mahsulot yangilandi:', product);
    // Mahsulotni yangilash
});
```

### 3. Mahsulot O'chirilishi
```javascript
socket.on('product_deleted', ({ productId }) => {
    console.log('Mahsulot o\'chirildi:', productId);
    // Mahsulotni o'chirish
});
```

### 4. Mahsulot Inventarizatsiyasi Yangilanishi
```javascript
socket.on('product_inventory_updated', ({ product }) => {
    console.log('Mahsulot inventarizatsiyasi yangilandi:', product);
    // Inventarizatsiyani yangilash
});
```

## Xatoliklar bilan Ishlash

```javascript
// Umumiy xatoliklar
socket.on('error', (error) => {
    console.error('Socket xatoligi:', error);
});

// Ulanish xatoliklari
socket.on('connect_error', (error) => {
    console.error('Ulanish xatoligi:', error);
});

// Qayta ulanish
socket.on('reconnect', (attemptNumber) => {
    console.log('Server bilan qayta ulandi. Urinish:', attemptNumber);
});

socket.on('reconnect_attempt', (attemptNumber) => {
    console.log('Qayta ulanishga urinish:', attemptNumber);
});

socket.on('reconnect_error', (error) => {
    console.error('Qayta ulanish xatoligi:', error);
});

socket.on('reconnect_failed', () => {
    console.error('Qayta ulanib bo\'lmadi');
});
```

## Misol: To'liq Integratsiya

```javascript
import io from 'socket.io-client';

class SocketService {
    constructor() {
        this.socket = null;
        this.connected = false;
    }

    connect(token) {
        this.socket = io('http://your-backend-url', {
            path: '/socket.io/',
            transports: ['polling'],
            auth: { token }
        });

        this.setupListeners();
    }

    setupListeners() {
        // Ulanish events
        this.socket.on('connect', () => {
            this.connected = true;
            console.log('WebSocket serverga ulandi');
        });

        this.socket.on('disconnect', () => {
            this.connected = false;
            console.log('WebSocket serverdan uzildi');
        });

        // Draft order events
        this.socket.on('draft_order_created', this.handleDraftOrderCreated);
        this.socket.on('draft_order_updated', this.handleDraftOrderUpdated);
        this.socket.on('draft_order_deleted', this.handleDraftOrderDeleted);
        this.socket.on('draft_order_completed', this.handleDraftOrderCompleted);
        this.socket.on('draft_order_cancelled', this.handleDraftOrderCancelled);

        // Sotuvlar events
        this.socket.on('sale_created', this.handleSaleCreated);
        this.socket.on('sale_updated', this.handleSaleUpdated);
        this.socket.on('sale_cancelled', this.handleSaleCancelled);
        this.socket.on('sale_refunded', this.handleSaleRefunded);

        // Order history events
        this.socket.on('order_history_updated', this.handleOrderHistoryUpdated);
        this.socket.on('order_status_changed', this.handleOrderStatusChanged);

        // Mahsulotlar events
        this.socket.on('product_created', this.handleProductCreated);
        this.socket.on('product_updated', this.handleProductUpdated);
        this.socket.on('product_deleted', this.handleProductDeleted);
        this.socket.on('product_inventory_updated', this.handleProductInventoryUpdated);
    }

    // Event handlers
    handleDraftOrderCreated = ({ draftOrder }) => {
        // Draft order yaratildi
    }

    handleSaleCreated = ({ sale }) => {
        // Yangi sotuv yaratildi
    }

    handleOrderStatusChanged = ({ orderId, oldStatus, newStatus, timestamp }) => {
        // Order statusi o'zgardi
    }

    handleProductInventoryUpdated = ({ product }) => {
        // Mahsulot inventarizatsiyasi yangilandi
    }

    // Serverga xabar yuborish
    sendMessage(event, data) {
        if (this.connected) {
            this.socket.emit(event, data);
        }
    }

    // Ulanishni yopish
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.connected = false;
        }
    }
}

export default new SocketService();
```

## Muhim Eslatmalar

1. WebSocket ulanishdan oldin JWT token bo'lishi kerak
2. Har bir event uchun xatoliklar bilan ishlash mantiqini qo'shish kerak
3. UI yangilanishlarini optimallash uchun debounce/throttle ishlatish tavsiya etiladi
4. Katta hajmdagi ma'lumotlarni yuborishda chunking usulidan foydalanish kerak
5. Muhim operatsiyalar uchun retry mexanizmini qo'shish kerak

## Xavfsizlik

1. JWT token har doim auth header orqali yuborilishi kerak
2. Maxfiy ma'lumotlarni WebSocket orqali yubormaslik kerak
3. Rate limiting va flood protection mexanizmlarini hisobga olish kerak
4. WebSocket ulanishi uzilganda avtomatik qayta ulanish mantiqini to'g'ri sozlash kerak 