const events = require('./events');

class WebSocketHandlers {
    constructor(io) {
        this.io = io;
        this.connectedSellers = new Map();
    }

    // Yangi ulanish
    handleConnection(socket) {
        console.log('Yangi mijoz ulandi:', socket.id);

        // Sotuvchi ulanishi
        socket.on(events.SELLER_CONNECTED, (sellerId) => {
            this.connectedSellers.set(sellerId, socket.id);
            console.log(`Sotuvchi ${sellerId} ulandi`);
            
            // Boshqa sotuvchilarga xabar yuborish
            socket.broadcast.emit(events.SELLER_CONNECTED, { sellerId });
        });

        // Sotuvchi uzilishi
        socket.on(events.DISCONNECT, () => {
            let disconnectedSellerId = null;
            
            // Uzilgan sotuvchini topish
            for (let [sellerId, socketId] of this.connectedSellers.entries()) {
                if (socketId === socket.id) {
                    disconnectedSellerId = sellerId;
                    break;
                }
            }

            if (disconnectedSellerId) {
                this.connectedSellers.delete(disconnectedSellerId);
                console.log(`Sotuvchi ${disconnectedSellerId} uzildi`);
                
                // Boshqa sotuvchilarga xabar yuborish
                socket.broadcast.emit(events.SELLER_DISCONNECTED, { sellerId: disconnectedSellerId });
            }
        });

        // Yangi sotuv
        socket.on(events.NEW_SALE, (saleData) => {
            // Barcha mijozlarga yangi sotuv haqida xabar yuborish
            this.io.emit(events.NEW_SALE, saleData);
        });

        // Chek yaratilganda
        socket.on('new_receipt', (receipt) => {
            console.log('Yangi chek yaratildi:', receipt);
        });

        // Admin xonasiga ulanish
        socket.on('join_admin_room', () => {
            socket.join('admin_room');
        });

        // Inventory kam qolganda
        socket.on('low_inventory', (product) => {
            this.broadcastLowInventory(product);
        });
    }

    setupHandlers(io, socket) {
        // Mahsulot yaratilganda
        this.notifyProductCreated = (product) => {
            io.emit(events.PRODUCT_CREATED, { product });
        };

        // Mahsulot yangilanganda
        this.notifyProductUpdated = (product) => {
            io.emit(events.PRODUCT_UPDATED, { product });
        };

        // Mahsulot o'chirilganda
        this.notifyProductDeleted = (productId) => {
            io.emit(events.PRODUCT_DELETED, { productId });
        };

        // Kategoriya yaratilganda
        this.notifyCategoryCreated = (category) => {
            io.emit(events.CATEGORY_CREATED, { category });
        };

        // Kategoriya yangilanganda
        this.notifyCategoryUpdated = (category) => {
            io.emit(events.CATEGORY_UPDATED, { category });
        };

        // Kategoriya o'chirilganda
        this.notifyCategoryDeleted = (categoryId) => {
            io.emit(events.CATEGORY_DELETED, { categoryId });
        };

        // Subkategoriya qo'shilganda
        this.notifySubcategoryAdded = (category, subcategory) => {
            io.emit(events.SUBCATEGORY_ADDED, { category, subcategory });
        };

        // Subkategoriya yangilanganda
        this.notifySubcategoryUpdated = (category, subcategory) => {
            io.emit(events.SUBCATEGORY_UPDATED, { category, subcategory });
        };

        // Subkategoriya o'chirilganda
        this.notifySubcategoryDeleted = (category, subcategoryId) => {
            io.emit(events.SUBCATEGORY_DELETED, { category, subcategoryId });
        };

        // Draft order handlers
        this.notifyDraftOrderCreated = (draftOrder) => {
            io.emit(events.DRAFT_ORDER_CREATED, { draftOrder });
        };

        this.notifyDraftOrderUpdated = (draftOrder) => {
            io.emit(events.DRAFT_ORDER_UPDATED, { draftOrder });
        };

        this.notifyDraftOrderDeleted = (draftOrderId) => {
            io.emit(events.DRAFT_ORDER_DELETED, { draftOrderId });
        };

        this.notifyDraftOrderCompleted = (draftOrder) => {
            io.emit(events.DRAFT_ORDER_COMPLETED, { draftOrder });
        };

        this.notifyDraftOrderCancelled = (draftOrder) => {
            io.emit(events.DRAFT_ORDER_CANCELLED, { draftOrder });
        };

        // Sotuvlar tarixi handlers
        this.notifySaleCreated = (sale) => {
            io.emit(events.SALE_CREATED, { sale });
        };

        this.notifySaleUpdated = (sale) => {
            io.emit(events.SALE_UPDATED, { sale });
        };

        this.notifySaleCancelled = (sale) => {
            io.emit(events.SALE_CANCELLED, { sale });
        };

        this.notifySaleRefunded = (sale) => {
            io.emit(events.SALE_REFUNDED, { sale });
        };

        // Order history handlers
        this.notifyOrderHistoryUpdated = (orderHistory) => {
            io.emit(events.ORDER_HISTORY_UPDATED, { orderHistory });
        };

        this.notifyOrderStatusChanged = (orderId, oldStatus, newStatus) => {
            io.emit(events.ORDER_STATUS_CHANGED, { 
                orderId, 
                oldStatus, 
                newStatus,
                timestamp: Date.now()
            });
        };
    }

    // Yangi sotuv qo'shilganda
    broadcastNewSale(saleData) {
        this.io.emit(events.NEW_SALE, saleData);
    }

    // Mahsulot yangilanganda
    broadcastProductUpdate(productData) {
        this.io.emit(events.PRODUCT_UPDATED, productData);
    }

    // Mahsulot o'chirilganda
    broadcastProductDeletion(productId) {
        this.io.emit(events.PRODUCT_DELETED, { productId });
    }

    // Chek yaratilganda
    broadcastNewReceipt(receipt) {
        this.io.emit('new_receipt', receipt);
        // Admin xonasiga alohida xabar yuborish
        this.io.to('admin_room').emit('admin_new_receipt', receipt);
    }

    // Inventory kam qolganda
    broadcastLowInventory(product) {
        this.io.to('admin_room').emit('low_inventory', {
            productId: product._id,
            name: product.name,
            inventory: product.inventory
        });
    }

    // Sotuvchi o'chirilganda xabar yuborish
    notifySellerDeleted(sellerId) {
        this.io.emit('seller_deleted', { sellerId });
    }

    // Sotuvchi yangilanganda xabar yuborish
    notifySellerUpdated(sellerId) {
        this.io.emit('seller_updated', { sellerId });
    }

    // Admin handlers
    notifyAdminConnected(admin) {
        this.io.emit(events.ADMIN_CONNECTED, { admin });
    }

    notifyAdminDisconnected(admin) {
        this.io.emit(events.ADMIN_DISCONNECTED, { admin });
    }

    // Seller handlers
    notifySellerConnected(seller) {
        this.io.emit(events.SELLER_CONNECTED, { seller });
    }

    notifySellerDisconnected(seller) {
        this.io.emit(events.SELLER_DISCONNECTED, { seller });
    }

    notifySellerLogin(seller) {
        this.io.emit(events.SELLER_LOGIN, { seller });
    }

    notifySellerLogout(seller) {
        this.io.emit(events.SELLER_LOGOUT, { seller });
    }

    // Category handlers
    notifyCategoryCreated(category) {
        this.io.emit(events.CATEGORY_CREATED, { category });
    }

    notifyCategoryUpdated(category) {
        this.io.emit(events.CATEGORY_UPDATED, { category });
    }

    notifyCategoryDeleted(categoryId) {
        this.io.emit(events.CATEGORY_DELETED, { categoryId });
    }

    notifySubcategoryAdded(category, subcategory) {
        this.io.emit(events.SUBCATEGORY_ADDED, { category, subcategory });
    }

    notifySubcategoryUpdated(category, subcategory) {
        this.io.emit(events.SUBCATEGORY_UPDATED, { category, subcategory });
    }

    notifySubcategoryDeleted(category, subcategoryId) {
        this.io.emit(events.SUBCATEGORY_DELETED, { category, subcategoryId });
    }

    // Product handlers
    notifyProductCreated(product) {
        this.io.emit(events.PRODUCT_CREATED, { product });
    }

    notifyProductUpdated(product) {
        this.io.emit(events.PRODUCT_UPDATED, { product });
    }

    notifyProductDeleted(productId) {
        this.io.emit(events.PRODUCT_DELETED, { productId });
    }

    notifyProductInventoryUpdated(product) {
        this.io.emit(events.PRODUCT_INVENTORY_UPDATED, { product });
    }
}

module.exports = WebSocketHandlers;
