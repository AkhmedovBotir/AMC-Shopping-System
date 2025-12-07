# Sotuvchilar API Dokumentatsiyasi

## Autentifikatsiya

Barcha API endpointlari (login va registratsiya dan tashqari) JWT token talab qiladi. 
Token `Authorization` headerida `Bearer {token}` formatida yuborilishi kerak.

## Sotuvchi API Endpointlari

### 1. Sotuvchi login
- **URL**: `/api/sellers/login`
- **Method**: `POST`
- **Auth**: `No`
- **Body**:
```json
{
    "username": "seller1",
    "password": "password123"
}
```
- **Response**:
```json
{
    "success": true,
    "data": {
        "token": "jwt_token",
        "seller": {
            "_id": "seller_id",
            "username": "seller1",
            "name": "Seller Name",
            "status": "active"
        }
    }
}
```

### 2. Sotuvchi ma'lumotlarini yangilash
- **URL**: `/api/sellers/:id`
- **Method**: `PATCH`
- **Auth**: `Yes (Admin)`
- **Body**: _(O'zgartirish kerak bo'lgan maydonlar)_
```json
{
    "name": "Yangi ism",
    "phone": "+998901234567",
    "status": "active"
}
```
- **Response**:
```json
{
    "success": true,
    "data": {
        "_id": "seller_id",
        "name": "Yangi ism",
        "username": "seller1",
        "phone": "+998901234567",
        "status": "active",
        "updatedAt": "2024-03-20T10:00:00.000Z"
    }
}
```

### 3. Sotuvchi parolini yangilash
- **URL**: `/api/sellers/:id/password`
- **Method**: `PATCH`
- **Auth**: `Yes (Admin or Self)`
- **Body**:
```json
{
    "currentPassword": "eski_parol",  // Faqat o'zi uchun
    "newPassword": "yangi_parol"
}
```
- **Response**:
```json
{
    "success": true,
    "message": "Parol muvaffaqiyatli yangilandi"
}
```

### 4. Sotuvchi sotuvlarini ko'rish
- **URL**: `/api/sales/seller/:sellerId`
- **Method**: `GET`
- **Auth**: `Yes (Admin or Self)`
- **Query Parameters**:
  - `page`: Sahifa raqami (default: 1)
  - `limit`: Sahifadagi elementlar soni (default: 10)
  - `startDate`: Boshlanish sanasi (YYYY-MM-DD)
  - `endDate`: Tugash sanasi (YYYY-MM-DD)
- **Response**:
```json
{
    "success": true,
    "data": [
        {
            "_id": "sale_id",
            "product": {
                "_id": "product_id",
                "name": "Mahsulot nomi",
                "type": "mahsulot turi",
                "properties": {}
            },
            "quantity": 5,
            "totalPrice": 50000,
            "createdAt": "2024-03-20T10:00:00.000Z"
        }
    ],
    "pagination": {
        "total": 100,
        "page": 1,
        "pages": 10
    }
}
```

### 5. Sotuvchi statistikasini ko'rish
- **URL**: `/api/statistics/sellers/:sellerId`
- **Method**: `GET`
- **Auth**: `Yes (Admin or Self)`
- **Query Parameters**:
  - `startDate`: Boshlanish sanasi (YYYY-MM-DD)
  - `endDate`: Tugash sanasi (YYYY-MM-DD)
- **Response**:
```json
{
    "success": true,
    "data": {
        "totalSales": 150,
        "totalAmount": 1500000,
        "averageOrderAmount": 10000,
        "topProducts": [
            {
                "productId": "product_id",
                "name": "Mahsulot nomi",
                "quantity": 50,
                "totalAmount": 500000
            }
        ],
        "dailyStats": [
            {
                "date": "2024-03-20",
                "salesCount": 15,
                "totalAmount": 150000
            }
        ]
    }
}
```

## Xatolik kodlari

- `400`: So'rov noto'g'ri
- `401`: Autentifikatsiya xatosi
- `403`: Ruxsat etilmagan
- `404`: Ma'lumot topilmadi
- `500`: Server xatosi

## Xatolik response formati
```json
{
    "success": false,
    "message": "Xatolik haqida ma'lumot"
}
```

## WebSocket Events

Server quyidagi WebSocket eventlarni yuboradi:

- `seller_status_change`: Sotuvchi statusi o'zgarganda
- `seller_new_sale`: Sotuvchi yangi sotuv qilganda
- `seller_order_update`: Sotuvchi buyurtmasi yangilanganda

## Izohlar

1. Barcha vaqt ma'lumotlari UTC formatida qaytariladi
2. Pul miqdorlari UZS (so'm) da hisoblanadi
3. Sotuvchi faqat o'zining ma'lumotlarini ko'ra oladi
4. Admin barcha sotuvchilarning ma'lumotlarini ko'ra oladi
5. Parolni yangilashda:
   - Admin uchun `currentPassword` talab qilinmaydi
   - Sotuvchi o'z parolini o'zgartirishda `currentPassword` talab qilinadi 