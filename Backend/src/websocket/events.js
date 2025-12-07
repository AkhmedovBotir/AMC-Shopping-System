// WebSocket event nomlari
module.exports = {
    // Admin events
    ADMIN_CONNECTED: 'admin_connected',
    ADMIN_DISCONNECTED: 'admin_disconnected',

    // Sotuvchi events
    SELLER_CONNECTED: 'seller_connected',
    SELLER_DISCONNECTED: 'seller_disconnected',
    SELLER_LOGIN: 'seller_login',
    SELLER_LOGOUT: 'seller_logout',

    // Kategoriya events
    CATEGORY_CREATED: 'category_created',
    CATEGORY_UPDATED: 'category_updated',
    CATEGORY_DELETED: 'category_deleted',
    SUBCATEGORY_ADDED: 'subcategory_added',
    SUBCATEGORY_UPDATED: 'subcategory_updated',
    SUBCATEGORY_DELETED: 'subcategory_deleted',

    // Mahsulot events
    PRODUCT_CREATED: 'product_created',
    PRODUCT_UPDATED: 'product_updated',
    PRODUCT_DELETED: 'product_deleted',
    PRODUCT_INVENTORY_UPDATED: 'product_inventory_updated',

    // Draft order events
    DRAFT_ORDER_CREATED: 'draft_order_created',
    DRAFT_ORDER_UPDATED: 'draft_order_updated',
    DRAFT_ORDER_DELETED: 'draft_order_deleted',
    DRAFT_ORDER_COMPLETED: 'draft_order_completed',
    DRAFT_ORDER_CANCELLED: 'draft_order_cancelled',

    // Sotuvlar tarixi events
    SALE_CREATED: 'sale_created',
    SALE_UPDATED: 'sale_updated',
    SALE_CANCELLED: 'sale_cancelled',
    SALE_REFUNDED: 'sale_refunded',

    // Order history events
    ORDER_HISTORY_UPDATED: 'order_history_updated',
    ORDER_STATUS_CHANGED: 'order_status_changed'
};
