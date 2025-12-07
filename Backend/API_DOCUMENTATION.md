# Do'kon Boshqaruv Tizimi API Dokumentatsiyasi

## Autentifikatsiya

Barcha API endpointlari (login va registratsiya dan tashqari) JWT token talab qiladi. 
Token `Authorization` headerida `Bearer {token}` formatida yuborilishi kerak.

## Admin API

### Admin login
- **URL**: `/api/admin/login`
- **Method**: `POST`
- **Auth**: `No`
- **Body**:
```json
{
    "username": "admin",
    "password": "password123"
}
```
- **Response**:
```json
{
    "success": true,
    "data": {
        "token": "jwt_token",
        "admin": {
            "_id": "admin_id",
            "username": "admin",
            "name": "Admin Name",
            "isAdmin": true
        }
    }
}
```

## Kategoriyalar API

### Yangi kategoriya yaratish
- **URL**: `/api/categories`
- **Method**: `POST`
- **Auth**: `Yes (Admin)`
- **Body**:
```json
{
    "name": "Kategoriya nomi",
    "description": "Kategoriya haqida ma'lumot",
    "subcategories": [
        {
            "name": "Subkategoriya nomi",
            "description": "Subkategoriya haqida ma'lumot"
        }
    ]
}
```

### Kategoriyani olish
- **URL**: `/api/categories/:id`
- **Method**: `GET`
- **Auth**: `Yes`

### Kategoriyani yangilash
- **URL**: `/api/categories/:id`
- **Method**: `PATCH`
- **Auth**: `Yes (Admin)`
- **Body**: _(O'zgartirish kerak bo'lgan maydonlar)_
```json
{
    "name": "Yangi nom",
    "description": "Yangi ma'lumot"
}
```

### Subkategoriyani yangilash
- **URL**: `/api/categories/subcategories/:subcategoryId`
- **Method**: `PATCH`
- **Auth**: `Yes (Admin)`
- **Body**: _(O'zgartirish kerak bo'lgan maydonlar)_
```json
{
    "name": "Yangi nom",
    "description": "Yangi ma'lumot"
}
```

### Kategoriyani o'chirish
- **URL**: `/api/categories/:id`
- **Method**: `DELETE`
- **Auth**: `Yes (Admin)`

## Mahsulotlar API

### Yangi mahsulot qo'shish
- **URL**: `/api/products`
- **Method**: `POST`
- **Auth**: `Yes (Admin)`
- **Body**:
```json
{
    "name": "Mahsulot nomi",
    "category": "category_id",
    "subcategory": "subcategory_id",
    "price": 10000,
    "unit": "dona",
    "unitSize": 1,
    "inventory": 100
}
```

### Mahsulotni yangilash
- **URL**: `/api/products/:id`
- **Method**: `PUT`
- **Auth**: `Yes (Admin)`
- **Body**: _(O'zgartirish kerak bo'lgan maydonlar)_
```json
{
    "name": "Yangi nom",
    "price": 15000,
    "inventory": 150
}
```

### Mahsulotni o'chirish
- **URL**: `/api/products/:id`
- **Method**: `DELETE`
- **Auth**: `Yes (Admin)`

## Sotuvchilar API

### Sotuvchini yangilash
- **URL**: `/api/sellers/:id`
- **Method**: `PATCH`
- **Auth**: `Yes (Admin)`
- **Body**: _(O'zgartirish kerak bo'lgan maydonlar)_
```json
{
    "name": "Yangi ism",
    "status": "active"
}
```

### Sotuvchi parolini yangilash
- **URL**: `/api/sellers/:id/password`
- **Method**: `PATCH`
- **Auth**: `Yes (Admin)`
- **Body**:
```json
{
    "newPassword": "yangi_parol"
}
```

## Sotuvlar API

### Yangi sotuv yaratish
- **URL**: `/api/sales`
- **Method**: `POST`
- **Auth**: `Yes`
- **Body**:
```json
{
    "products": [
        {
            "productId": "product_id",
            "quantity": 5,
            "price": 10000
        }
    ],
    "totalAmount": 50000,
    "paymentMethod": "cash"
}
```

### Barcha sotuvlarni olish
- **URL**: `/api/sales`
- **Method**: `GET`
- **Auth**: `Yes (Admin)`
- **Query Parameters**:
  - `page`: Sahifa raqami (default: 1)
  - `limit`: Sahifadagi elementlar soni (default: 10)
  - `startDate`: Boshlanish sanasi
  - `endDate`: Tugash sanasi

### Sotuvni ID bo'yicha olish
- **URL**: `/api/sales/:id`
- **Method**: `GET`
- **Auth**: `Yes`

### Sotuvchi bo'yicha sotuvlarni olish
- **URL**: `/api/sales/seller/:sellerId`
- **Method**: `GET`
- **Auth**: `Yes`

### Sotuvlar statistikasi
- **URL**: `/api/sales/statistics/summary`
- **Method**: `GET`
- **Auth**: `Yes (Admin)`

## Hisobotlar API

### Yangi hisobot yaratish
- **URL**: `/api/reports`
- **Method**: `POST`
- **Auth**: `Yes (Admin)`
- **Body**:
```json
{
    "type": "custom",
    "startDate": "2024-03-01",
    "endDate": "2024-03-31",
    "totalSales": {
        "count": 150,
        "amount": 1500000
    },
    "productsSold": [...],
    "sellerStats": [...],
    "paymentMethods": {
        "cash": { "count": 100, "amount": 1000000 },
        "card": { "count": 50, "amount": 500000 }
    }
}
```

### Hisobotlar ro'yxatini olish
- **URL**: `/api/reports`
- **Method**: `GET`
- **Auth**: `Yes (Admin)`
- **Query Parameters**:
  - `type`: Hisobot turi (daily/weekly/monthly/custom)
  - `startDate`: Boshlanish sanasi
  - `endDate`: Tugash sanasi
  - `page`: Sahifa raqami
  - `limit`: Sahifadagi elementlar soni

### Hisobotni ID bo'yicha olish
- **URL**: `/api/reports/:id`
- **Method**: `GET`
- **Auth**: `Yes (Admin)`

### Kunlik hisobot yaratish
- **URL**: `/api/reports/daily`
- **Method**: `POST`
- **Auth**: `Yes (Admin)`

### Haftalik hisobot yaratish
- **URL**: `/api/reports/weekly`
- **Method**: `POST`
- **Auth**: `Yes (Admin)`

### Oylik hisobot yaratish
- **URL**: `/api/reports/monthly`
- **Method**: `POST`
- **Auth**: `Yes (Admin)`

## Inventarizatsiya API

### Yangi inventarizatsiya yaratish
- **URL**: `/api/inventory`
- **Method**: `POST`
- **Auth**: `Yes (Admin)`
- **Body**:
```json
{
    "type": "check",
    "products": [
        {
            "productId": "product_id",
            "previousQuantity": 100,
            "newQuantity": 95,
            "difference": -5,
            "reason": "Kamomad"
        }
    ],
    "notes": "Oylik inventarizatsiya"
}
```

### Inventarizatsiya ro'yxatini olish
- **URL**: `/api/inventory`
- **Method**: `GET`
- **Auth**: `Yes (Admin)`
- **Query Parameters**:
  - `type`: Inventarizatsiya turi
  - `status`: Holati (pending/completed/cancelled)
  - `startDate`: Boshlanish sanasi
  - `endDate`: Tugash sanasi
  - `page`: Sahifa raqami
  - `limit`: Sahifadagi elementlar soni

### Inventarizatsiyani ID bo'yicha olish
- **URL**: `/api/inventory/:id`
- **Method**: `GET`
- **Auth**: `Yes (Admin)`

### Inventarizatsiyani tasdiqlash
- **URL**: `/api/inventory/:id/complete`
- **Method**: `PATCH`
- **Auth**: `Yes (Admin)`

### Inventarizatsiyani bekor qilish
- **URL**: `/api/inventory/:id/cancel`
- **Method**: `PATCH`
- **Auth**: `Yes (Admin)`

## WebSocket Events

Server quyidagi WebSocket eventlarni yuboradi:

- `new_sale`: Yangi sotuv amalga oshirilganda
- `inventory_change`: Inventar o'zgarganda
- `inventory_complete`: Inventarizatsiya tasdiqlanganda
- `inventory_cancel`: Inventarizatsiya bekor qilinganda
- `product_update`: Mahsulot ma'lumotlari yangilanganda
- `seller_update`: Sotuvchi ma'lumotlari yangilanganda

## Xatolik kodlari

- `400`: So'rov noto'g'ri
- `401`: Autentifikatsiya xatosi
- `403`: Ruxsat etilmagan
- `404`: Ma'lumot topilmadi
- `500`: Server xatosi

## Response formati

### Muvaffaqiyatli so'rov
```json
{
    "success": true,
    "data": {...}
}
```

### Pagination bilan
```json
{
    "success": true,
    "data": [...],
    "pagination": {
        "total": 100,
        "page": 1,
        "pages": 10
    }
}
```

### Xatolik
```json
{
    "success": false,
    "message": "Xatolik haqida ma'lumot"
}
``` 