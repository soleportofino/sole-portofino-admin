// Customers Data Operations
import { 
    getCustomers,
    getCustomer,
    createCustomer,
    updateCustomer,
    getOrders
} from './supabase-db.js';
import { exportToCSV } from './utils.js';

// State variables
let currentPage = 1;
const itemsPerPage = 20;
let allCustomers = [];
let filteredCustomers = [];

// Initialize customers page
export async function initializeCustomers() {
    try {
        // Load initial data
        await loadCustomers();
        
        // Set up event listeners
        setupEventListeners();
        
        // Update statistics
        updateStats();
        
    } catch (error) {
        console.error('Customers initialization error:', error);
        showError('Müşteriler yüklenirken hata oluştu');
    }
}

// Set up event listeners
function setupEventListeners() {
    // Filters
    document.getElementById('segment-filter').addEventListener('change', applyFilters);
    document.getElementById('city-filter').addEventListener('change', applyFilters);
    document.getElementById('search-input').addEventListener('input', debounce(applyFilters, 300));
}

// Load customers from database
async function loadCustomers() {
    try {
        const customers = await getCustomers();
        allCustomers = customers;
        applyFilters();
    } catch (error) {
        console.error('Error loading customers:', error);
        showError('Müşteriler yüklenirken hata oluştu');
    }
}

// Apply filters to customers
function applyFilters() {
    const segment = document.getElementById('segment-filter').value;
    const city = document.getElementById('city-filter').value;
    const search = document.getElementById('search-input').value.toLowerCase();
    
    filteredCustomers = allCustomers.filter(customer => {
        let matches = true;
        
        if (segment && customer.segment !== segment) matches = false;
        if (city && customer.city?.toLowerCase() !== city) matches = false;
        if (search && !customer.name?.toLowerCase().includes(search) && 
            !customer.email?.toLowerCase().includes(search) &&
            !customer.phone?.includes(search)) matches = false;
        
        return matches;
    });
    
    currentPage = 1;
    renderCustomers();
}

// Render customers table
function renderCustomers() {
    const tbody = document.getElementById('customers-list');
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageCustomers = filteredCustomers.slice(startIndex, endIndex);
    
    if (pageCustomers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="no-data">Müşteri bulunamadı</td></tr>';
        updatePagination();
        return;
    }
    
    tbody.innerHTML = pageCustomers.map((customer, index) => {
        const customerNumber = startIndex + index + 1001;
        
        return `
            <tr>
                <td>#${customerNumber}</td>
                <td>${customer.name || 'İsimsiz'}</td>
                <td>${customer.email}</td>
                <td>${customer.phone || '-'}</td>
                <td>${customer.city || '-'}</td>
                <td>${customer.total_orders || 0}</td>
                <td>₺${formatCurrency(customer.total_spent)}</td>
                <td>
                    <span class="badge ${customer.segment === 'vip' ? 'badge-vip' : ''}">
                        ${getSegmentText(customer.segment)}
                    </span>
                </td>
                <td>${formatDate(customer.created_at)}</td>
                <td>
                    <button class="action-btn" onclick="window.viewCustomer('${customer.id}')">
                        Detay
                    </button>
                    <button class="action-btn" onclick="window.editCustomer('${customer.id}')">
                        Düzenle
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    updatePagination();
}

// Update pagination
function updatePagination() {
    const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
    document.getElementById('current-page').textContent = currentPage;
    document.getElementById('total-pages').textContent = totalPages;
}

// Update statistics
function updateStats() {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Total customers
    document.getElementById('total-customers').textContent = allCustomers.length;
    
    // New customers this month
    const newCustomers = allCustomers.filter(c => 
        new Date(c.created_at) >= thisMonthStart
    ).length;
    document.getElementById('new-customers').textContent = newCustomers;
    
    // VIP customers
    const vipCustomers = allCustomers.filter(c => c.segment === 'vip').length;
    document.getElementById('vip-customers').textContent = vipCustomers;
    
    // Average spending
    const totalSpending = allCustomers.reduce((sum, c) => sum + (c.total_spent || 0), 0);
    const avgSpending = allCustomers.length > 0 ? totalSpending / allCustomers.length : 0;
    document.getElementById('avg-spending').textContent = formatCurrency(avgSpending);
}

// View customer details
async function viewCustomerDetails(customerId) {
    try {
        const customer = await getCustomer(customerId);
        
        // Get customer orders
        const orders = await getOrders({ customerId });
        
        const detailHtml = `
            <div class="customer-detail-content">
                <div class="customer-header">
                    <h3>${customer.name}</h3>
                    <span class="badge ${customer.segment === 'vip' ? 'badge-vip' : ''}">
                        ${getSegmentText(customer.segment)}
                    </span>
                </div>
                
                <div class="customer-sections">
                    <div class="customer-section">
                        <h4>İletişim Bilgileri</h4>
                        <p><strong>E-posta:</strong> ${customer.email}</p>
                        <p><strong>Telefon:</strong> ${customer.phone || '-'}</p>
                        <p><strong>Şehir:</strong> ${customer.city || '-'}</p>
                        <p><strong>Adres:</strong> ${customer.address || '-'}</p>
                    </div>
                    
                    <div class="customer-section">
                        <h4>Alışveriş İstatistikleri</h4>
                        <p><strong>Toplam Sipariş:</strong> ${customer.total_orders || 0}</p>
                        <p><strong>Toplam Harcama:</strong> ₺${formatCurrency(customer.total_spent)}</p>
                        <p><strong>Kayıt Tarihi:</strong> ${formatDate(customer.created_at)}</p>
                    </div>
                    
                    <div class="customer-section">
                        <h4>Son Siparişler</h4>
                        ${orders.length > 0 ? `
                            <table class="customer-orders-table">
                                <thead>
                                    <tr>
                                        <th>Sipariş No</th>
                                        <th>Tarih</th>
                                        <th>Tutar</th>
                                        <th>Durum</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${orders.slice(0, 5).map(order => `
                                        <tr>
                                            <td>${order.order_number}</td>
                                            <td>${formatDate(order.created_at)}</td>
                                            <td>₺${formatCurrency(order.total)}</td>
                                            <td>
                                                <span class="status-badge status-${order.status}">
                                                    ${getOrderStatusText(order.status)}
                                                </span>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        ` : '<p>Henüz sipariş yok</p>'}
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('customer-detail').innerHTML = detailHtml;
        document.getElementById('customer-modal').style.display = 'flex';
        
    } catch (error) {
        console.error('Error loading customer details:', error);
        showError('Müşteri detayları yüklenirken hata oluştu');
    }
}

// Export customers to CSV
function exportCustomersData() {
    const data = filteredCustomers.map(customer => ({
        'ID': customer.id,
        'Ad Soyad': customer.name || '',
        'E-posta': customer.email,
        'Telefon': customer.phone || '',
        'Şehir': customer.city || '',
        'Toplam Sipariş': customer.total_orders || 0,
        'Toplam Harcama': customer.total_spent || 0,
        'Segment': getSegmentText(customer.segment),
        'Kayıt Tarihi': formatDate(customer.created_at)
    }));
    
    exportToCSV(data, 'musteriler.csv');
}

// Helper functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('tr-TR').format(amount || 0);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR');
}

function getSegmentText(segment) {
    const segmentMap = {
        vip: 'VIP',
        regular: 'Düzenli',
        new: 'Yeni'
    };
    return segmentMap[segment] || segment;
}

function getOrderStatusText(status) {
    const statusMap = {
        pending: 'Beklemede',
        processing: 'İşleniyor',
        shipped: 'Kargoda',
        delivered: 'Teslim Edildi',
        cancelled: 'İptal'
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
window.viewCustomer = viewCustomerDetails;

window.editCustomer = async (customerId) => {
    // For now, just show alert
    showSuccess('Müşteri düzenleme özelliği yakında eklenecek');
};

window.closeCustomerModal = () => {
    document.getElementById('customer-modal').style.display = 'none';
};

window.exportCustomers = exportCustomersData;

window.previousPage = () => {
    if (currentPage > 1) {
        currentPage--;
        renderCustomers();
    }
};

window.nextPage = () => {
    const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderCustomers();
    }
};