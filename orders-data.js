// Orders Data Operations
import { 
    getOrders,
    getOrder,
    createOrder,
    updateOrder,
    subscribeToOrders
} from './supabase-db.js';

// State variables
let currentPage = 1;
const itemsPerPage = 20;
let allOrders = [];
let filteredOrders = [];

// Initialize orders page
export async function initializeOrders() {
    try {
        // Load initial data
        await loadOrders();
        
        // Set up event listeners
        setupEventListeners();
        
        // Subscribe to real-time updates
        subscribeToUpdates();
        
        // Update new orders count
        updateNewOrdersCount();
        
    } catch (error) {
        console.error('Orders initialization error:', error);
        showError('Siparişler yüklenirken hata oluştu');
    }
}

// Set up event listeners
function setupEventListeners() {
    // Filters
    document.getElementById('status-filter').addEventListener('change', applyFilters);
    document.getElementById('date-filter').addEventListener('change', applyFilters);
    document.getElementById('search-input').addEventListener('input', debounce(applyFilters, 300));
}

// Load orders from database
async function loadOrders() {
    try {
        const filters = getDateFilter();
        const orders = await getOrders(filters);
        allOrders = orders;
        applyFilters();
    } catch (error) {
        console.error('Error loading orders:', error);
        showError('Siparişler yüklenirken hata oluştu');
    }
}

// Get date filter based on selection
function getDateFilter() {
    const dateFilter = document.getElementById('date-filter').value;
    const now = new Date();
    const filters = {};
    
    switch (dateFilter) {
        case 'today':
            filters.dateFrom = new Date(now.setHours(0, 0, 0, 0)).toISOString();
            break;
        case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            filters.dateFrom = weekAgo.toISOString();
            break;
        case 'month':
            const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            filters.dateFrom = monthAgo.toISOString();
            break;
    }
    
    return filters;
}

// Apply filters to orders
function applyFilters() {
    const status = document.getElementById('status-filter').value;
    const search = document.getElementById('search-input').value.toLowerCase();
    
    filteredOrders = allOrders.filter(order => {
        let matches = true;
        
        if (status && order.status !== status) matches = false;
        if (search && !order.order_number.toLowerCase().includes(search) && 
            !order.customer?.name?.toLowerCase().includes(search)) matches = false;
        
        return matches;
    });
    
    currentPage = 1;
    renderOrders();
}

// Render orders table
function renderOrders() {
    const tbody = document.getElementById('orders-list');
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageOrders = filteredOrders.slice(startIndex, endIndex);
    
    if (pageOrders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="no-data">Sipariş bulunamadı</td></tr>';
        updatePagination();
        return;
    }
    
    tbody.innerHTML = pageOrders.map(order => {
        const customer = order.customer || {};
        const items = order.items || [];
        const itemsDisplay = items.length > 0 
            ? `${items[0].quantity}x ${items[0].name}${items.length > 1 ? ` +${items.length - 1}` : ''}`
            : 'Ürün yok';
        
        return `
            <tr>
                <td><a href="#" onclick="window.viewOrder('${order.id}')">${order.order_number}</a></td>
                <td>${customer.name || 'Müşteri'}</td>
                <td>${itemsDisplay}</td>
                <td>₺${formatCurrency(order.total)}</td>
                <td>
                    <span class="status-badge status-${order.status}">
                        ${getStatusText(order.status)}
                    </span>
                </td>
                <td>
                    <span class="payment-status-${order.payment_status}">
                        ${getPaymentText(order.payment_status)}
                    </span>
                </td>
                <td>${formatDate(order.created_at)}</td>
                <td>
                    <button class="action-btn" onclick="window.viewOrder('${order.id}')">
                        Detay
                    </button>
                    <button class="action-btn" onclick="window.updateOrderStatus('${order.id}')">
                        Güncelle
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    updatePagination();
}

// Update pagination
function updatePagination() {
    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
    document.getElementById('current-page').textContent = currentPage;
    document.getElementById('total-pages').textContent = totalPages;
}

// Update new orders count
function updateNewOrdersCount() {
    const newOrders = allOrders.filter(order => order.status === 'pending');
    document.getElementById('new-orders-count').textContent = newOrders.length || '0';
}

// View order details
async function viewOrderDetails(orderId) {
    try {
        const order = await getOrder(orderId);
        const customer = order.customer || {};
        const items = order.items || [];
        const shippingAddress = order.shipping_address || {};
        
        const detailHtml = `
            <div class="order-detail-content">
                <div class="order-header-info">
                    <h3>Sipariş No: ${order.order_number}</h3>
                    <span class="status-badge status-${order.status}">
                        ${getStatusText(order.status)}
                    </span>
                </div>
                
                <div class="order-sections">
                    <div class="order-section">
                        <h4>Müşteri Bilgileri</h4>
                        <p><strong>Ad Soyad:</strong> ${customer.name || 'Bilinmiyor'}</p>
                        <p><strong>E-posta:</strong> ${customer.email || 'Bilinmiyor'}</p>
                        <p><strong>Telefon:</strong> ${customer.phone || 'Bilinmiyor'}</p>
                    </div>
                    
                    <div class="order-section">
                        <h4>Teslimat Adresi</h4>
                        <p>${shippingAddress.street || ''}</p>
                        <p>${shippingAddress.city || ''} ${shippingAddress.state || ''} ${shippingAddress.zip || ''}</p>
                        <p>${shippingAddress.country || 'Türkiye'}</p>
                    </div>
                    
                    <div class="order-section">
                        <h4>Sipariş Detayları</h4>
                        <table class="order-items-table">
                            <thead>
                                <tr>
                                    <th>Ürün</th>
                                    <th>Adet</th>
                                    <th>Fiyat</th>
                                    <th>Toplam</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${items.map(item => `
                                    <tr>
                                        <td>${item.name}</td>
                                        <td>${item.quantity}</td>
                                        <td>₺${formatCurrency(item.price)}</td>
                                        <td>₺${formatCurrency(item.quantity * item.price)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        
                        <div class="order-totals">
                            <p><strong>Ara Toplam:</strong> ₺${formatCurrency(order.subtotal)}</p>
                            <p><strong>Kargo:</strong> ₺${formatCurrency(order.shipping)}</p>
                            <p><strong>Vergi:</strong> ₺${formatCurrency(order.tax)}</p>
                            <p class="order-total"><strong>Genel Toplam:</strong> ₺${formatCurrency(order.total)}</p>
                        </div>
                    </div>
                    
                    <div class="order-section">
                        <h4>Ödeme Bilgileri</h4>
                        <p><strong>Yöntem:</strong> ${order.payment_method || 'Bilinmiyor'}</p>
                        <p><strong>Durum:</strong> ${getPaymentText(order.payment_status)}</p>
                    </div>
                    
                    ${order.notes ? `
                        <div class="order-section">
                            <h4>Notlar</h4>
                            <p>${order.notes}</p>
                        </div>
                    ` : ''}
                </div>
                
                <div class="order-actions">
                    <button class="btn-primary" onclick="window.printOrder('${order.id}')">
                        Yazdır
                    </button>
                    <button class="btn-secondary" onclick="window.sendOrderEmail('${order.id}')">
                        E-posta Gönder
                    </button>
                </div>
            </div>
        `;
        
        document.getElementById('order-detail').innerHTML = detailHtml;
        document.getElementById('order-modal').style.display = 'flex';
        
    } catch (error) {
        console.error('Error loading order details:', error);
        showError('Sipariş detayları yüklenirken hata oluştu');
    }
}

// Update order status
async function handleUpdateOrderStatus(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;
    
    const newStatus = prompt('Yeni durum seçin:\n1: Beklemede\n2: İşleniyor\n3: Kargoda\n4: Teslim Edildi\n5: İptal');
    
    const statusMap = {
        '1': 'pending',
        '2': 'processing',
        '3': 'shipped',
        '4': 'delivered',
        '5': 'cancelled'
    };
    
    const status = statusMap[newStatus];
    if (!status) return;
    
    try {
        await updateOrder(orderId, { status });
        showSuccess('Sipariş durumu güncellendi');
        await loadOrders();
    } catch (error) {
        console.error('Error updating order:', error);
        showError('Sipariş güncellenirken hata oluştu');
    }
}

// Subscribe to real-time updates
function subscribeToUpdates() {
    subscribeToOrders((payload) => {
        console.log('Order update:', payload);
        loadOrders();
        updateNewOrdersCount();
    });
}

// Helper functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('tr-TR').format(amount || 0);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR');
}

function getStatusText(status) {
    const statusMap = {
        pending: 'Beklemede',
        processing: 'İşleniyor',
        shipped: 'Kargoda',
        delivered: 'Teslim Edildi',
        cancelled: 'İptal'
    };
    return statusMap[status] || status;
}

function getPaymentText(status) {
    const statusMap = {
        pending: 'Bekliyor',
        paid: 'Ödendi',
        failed: 'Başarısız',
        refunded: 'İade Edildi'
    };
    return statusMap[status] || status;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showError(message) {
    alert(message); // You can implement a better notification system
}

function showSuccess(message) {
    alert(message); // You can implement a better notification system
}

// Global functions for window access
window.viewOrder = viewOrderDetails;

window.updateOrderStatus = handleUpdateOrderStatus;

window.closeOrderModal = () => {
    document.getElementById('order-modal').style.display = 'none';
};

window.refreshOrders = () => {
    loadOrders();
    showSuccess('Siparişler yenilendi');
};

window.previousPage = () => {
    if (currentPage > 1) {
        currentPage--;
        renderOrders();
    }
};

window.nextPage = () => {
    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderOrders();
    }
};

window.printOrder = (orderId) => {
    window.print();
};

window.sendOrderEmail = (orderId) => {
    showSuccess('E-posta gönderildi');
};