# Admin API Documentation

## Autentifikatsiya

Barcha so'rovlar uchun `Authorization` headerida JWT token yuborilishi kerak:
```
Authorization: Bearer <token>
```

## Buyurtmalar bilan ishlash

### 1. Barcha buyurtmalar ro'yxatini olish
```http
GET /api/order-history

Query Parameters:
- page (optional, default: 1) - Sahifa raqami
- limit (optional, default: 10) - Har bir sahifadagi buyurtmalar soni
- startDate (optional) - Boshlang'ich sana (YYYY-MM-DD)
- endDate (optional) - Tugash sanasi (YYYY-MM-DD)

Response: 200 OK
{
    "success": true,
    "data": {
        "orders": [
            {
                "_id": "...",
                "orderId": 123,
                "seller": {
                    "_id": "...",
                    "name": "Sotuvchi",
                    "username": "seller1",
                    "status": "active"
                },
                "products": [
                    {
                        "productId": {
                            "_id": "...",
                            "name": "Mahsulot",
                            "price": 10000,
                            "unit": "dona",
                            "unitSize": 1
                        },
                        "name": "Mahsulot",
                        "quantity": 5,
                        "price": 10000,
                        "unit": "dona",
                        "unitSize": 1
                    }
                ],
                "totalSum": 50000,
                "status": "completed",
                "paymentMethod": "cash",
                "completedAt": "2024-03-20T12:00:00Z",
                "createdAt": "2024-03-20T12:00:00Z"
            }
        ],
        "pagination": {
            "total": 100,
            "pages": 10,
            "currentPage": 1,
            "perPage": 10
        }
    }
}
```

### 2. Tasdiqlangan buyurtmalar ro'yxati va statistikasi
```http
GET /api/order-history/completed-orders

Query Parameters:
- page (optional, default: 1)
- limit (optional, default: 10)
- startDate (optional) - YYYY-MM-DD
- endDate (optional) - YYYY-MM-DD

Response: 200 OK
{
    "success": true,
    "data": {
        "orders": [...],
        "pagination": {
            "total": 100,
            "pages": 10,
            "currentPage": 1,
            "perPage": 10
        },
        "stats": {
            "totalAmount": 1000000,
            "totalOrders": 50,
            "totalProducts": 150
        },
        "paymentStats": {
            "cash": {
                "totalAmount": 800000,
                "count": 40
            },
            "card": {
                "totalAmount": 200000,
                "count": 10
            }
        }
    }
}
```

### 3. Buyurtmani bekor qilish
```http
PATCH /api/order-history/:id/cancel

Path Parameters:
- id: Buyurtma ID si

Request Body:
{
    "reason": "Bekor qilish sababi" // Optional
}

Response: 200 OK
{
    "success": true,
    "data": {
        "order": {
            "_id": "...",
            "orderId": 123,
            "status": "cancelled",
            "cancelledAt": "2024-03-20T12:00:00Z",
            "cancelledBy": "...",
            "cancelReason": "..."
        },
        "restoredProducts": [
            {
                "id": "...",
                "name": "Mahsulot",
                "restoredQuantity": 5,
                "newInventory": 105
            }
        ]
    }
}
```

## Mahsulotlar bilan ishlash

### 1. Yangi mahsulot qo'shish
```http
POST /api/products

Request Body:
{
    "name": "Mahsulot nomi",
    "category": "category_id",
    "subcategory": "subcategory_id", // Optional
    "price": 10000,
    "unit": "dona", // dona, kg, litr
    "unitSize": 1,
    "inventory": 100
}

Response: 201 Created
{
    "success": true,
    "data": {
        "_id": "...",
        "name": "Mahsulot nomi",
        "category": {
            "_id": "...",
            "name": "Kategoriya"
        },
        "subcategory": {
            "_id": "...",
            "name": "Subkategoriya"
        },
        "price": 10000,
        "unit": "dona",
        "unitSize": 1,
        "inventory": 100,
        "createdAt": "2024-03-20T12:00:00Z"
    }
}
```

### 2. Mahsulotni o'chirish
```http
DELETE /api/products/:id

Path Parameters:
- id: Mahsulot ID si

Response: 200 OK
{
    "success": true,
    "message": "Mahsulot muvaffaqiyatli o'chirildi"
}
```

## Hisobotlar

### 1. Kunlik hisobot
```http
GET /api/reports/daily

Query Parameters:
- date (optional, default: today) - YYYY-MM-DD

Response: 200 OK
{
    "success": true,
    "data": {
        "type": "daily",
        "startDate": "2024-03-20T00:00:00Z",
        "endDate": "2024-03-20T23:59:59Z",
        "totalSales": {
            "count": 50,
            "amount": 1000000
        },
        "productsSold": [
            {
                "productId": "...",
                "name": "Mahsulot",
                "quantity": 10,
                "totalAmount": 100000,
                "category": "Kategoriya"
            }
        ],
        "sellerStats": [
            {
                "sellerId": "...",
                "name": "Sotuvchi",
                "salesCount": 20,
                "totalAmount": 500000,
                "products": [...]
            }
        ],
        "paymentMethods": {
            "cash": {
                "count": 40,
                "amount": 800000
            },
            "card": {
                "count": 10,
                "amount": 200000
            }
        }
    }
}
```

### 2. Inventarizatsiya hisoboti
```http
GET /api/inventory/report

Query Parameters:
- startDate (optional) - YYYY-MM-DD
- endDate (optional) - YYYY-MM-DD

Response: 200 OK
{
    "success": true,
    "data": {
        "inventory": {
            "added": [
                {
                    "productId": "...",
                    "name": "Mahsulot",
                    "quantity": 100,
                    "date": "2024-03-20T12:00:00Z"
                }
            ],
            "removed": [...],
            "current": [
                {
                    "productId": "...",
                    "name": "Mahsulot",
                    "quantity": 50,
                    "value": 500000
                }
            ]
        },
        "lowStock": [
            {
                "productId": "...",
                "name": "Mahsulot",
                "currentQuantity": 5,
                "minimumQuantity": 10
            }
        ]
    }
}
```

## Sotuvchilar bilan ishlash

### 1. Yangi sotuvchi qo'shish
```http
POST /api/sellers

Request Body:
{
    "name": "Sotuvchi F.I.SH",
    "username": "seller1",
    "password": "password123",
    "status": "active"
}

Response: 201 Created
{
    "success": true,
    "data": {
        "_id": "...",
        "name": "Sotuvchi F.I.SH",
        "username": "seller1",
        "status": "active",
        "createdAt": "2024-03-20T12:00:00Z"
    }
}
```

### 2. Sotuvchini o'chirish
```http
DELETE /api/sellers/:id

Path Parameters:
- id: Sotuvchi ID si

Response: 200 OK
{
    "success": true,
    "message": "Sotuvchi muvaffaqiyatli o'chirildi"
}
```

### 3. Sotuvchi statusini o'zgartirish
```http
PATCH /api/sellers/:id/status

Path Parameters:
- id: Sotuvchi ID si

Request Body:
{
    "status": "inactive" // active, inactive
}

Response: 200 OK
{
    "success": true,
    "data": {
        "_id": "...",
        "name": "Sotuvchi F.I.SH",
        "username": "seller1",
        "status": "inactive",
        "updatedAt": "2024-03-20T12:00:00Z"
    }
}
```

## Xatolik kodlari

- 400 Bad Request - So'rov noto'g'ri
- 401 Unauthorized - Token yo'q yoki yaroqsiz
- 403 Forbidden - Huquq yo'q
- 404 Not Found - Ma'lumot topilmadi
- 500 Internal Server Error - Serverda xatolik 