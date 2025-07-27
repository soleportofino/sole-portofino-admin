// Dashboard Data Operations
import { 
    getDashboardSummary, 
    getAnalytics, 
    subscribeToOrders,
    getOrders,
    getCustomers
} from './supabase-db.js';
import { getPlaceholderImage } from './utils.js';

// Initialize dashboard
export async function initializeDashboard() {
    try {
        // Load initial data
        await loadDashboardData();
        
        // Set up charts
        initializeCharts();
        
        // Subscribe to real-time updates
        subscribeToUpdates();
        
        // Set up period change handlers
        document.getElementById('sales-period').addEventListener('change', updateSalesChart);
        
    } catch (error) {
        console.error('Dashboard initialization error:', error);
        showError('Dashboard verisi yüklenirken hata oluştu');
    }
}

// Load dashboard data
async function loadDashboardData() {
    try {
        const summary = await getDashboardSummary();
        
        // Update stats
        updateStats(summary);
        
        // Update recent orders
        updateRecentOrders(summary.recentOrders);
        
        // Update activity feed
        updateActivityFeed(summary.recentOrders);
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showError('Veriler yüklenirken hata oluştu');
    }
}

// Update statistics
function updateStats(summary) {
    const today = summary.today;
    const yesterday = summary.yesterday;
    
    // Calculate changes
    const revenueChange = yesterday.revenue > 0 
        ? ((today.revenue - yesterday.revenue) / yesterday.revenue * 100).toFixed(1)
        : 0;
    
    const ordersChange = today.orders_count - yesterday.orders_count;
    
    // Update DOM
    document.getElementById('total-sales').textContent = formatCurrency(today.revenue);
    document.getElementById('total-orders').textContent = today.orders_count;
    document.getElementById('conversion-rate').textContent = today.conversion_rate.toFixed(1);
    
    // Update customer count (we'll get this from the customers table)
    getCustomers().then(customers => {
        document.getElementById('total-customers').textContent = customers.length;
        
        // Update new customers count
        const newCustomersToday = customers.filter(c => 
            new Date(c.created_at).toDateString() === new Date().toDateString()
        ).length;
        
        const customerChangeEl = document.querySelector('.stat-card:nth-child(3) .stat-change');
        if (newCustomersToday > 0) {
            customerChangeEl.textContent = `+${newCustomersToday} yeni müşteri`;
            customerChangeEl.className = 'stat-change positive';
        }
    });
    
    // Update change indicators
    const salesChangeEl = document.querySelector('.stat-card:first-child .stat-change');
    salesChangeEl.textContent = `${revenueChange >= 0 ? '+' : ''}${revenueChange}% dün`;
    salesChangeEl.className = `stat-change ${revenueChange >= 0 ? 'positive' : 'negative'}`;
    
    const ordersChangeEl = document.querySelector('.stat-card:nth-child(2) .stat-change');
    ordersChangeEl.textContent = `${ordersChange >= 0 ? '+' : ''}${ordersChange} yeni sipariş`;
    ordersChangeEl.className = `stat-change ${ordersChange >= 0 ? 'positive' : 'negative'}`;
    
    // Update new orders badge
    document.getElementById('new-orders-count').textContent = ordersChange > 0 ? ordersChange : '0';
}

// Update recent orders table
function updateRecentOrders(orders) {
    const tbody = document.getElementById('recent-orders');
    
    if (!orders || orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="no-data">Henüz sipariş yok</td></tr>';
        return;
    }
    
    tbody.innerHTML = orders.slice(0, 5).map(order => {
        const customer = order.customer || {};
        const firstItem = order.items?.[0] || {};
        const itemCount = order.items?.length || 0;
        
        return `
            <tr>
                <td>${order.order_number}</td>
                <td>${customer.name || 'Bilinmiyor'}</td>
                <td>
                    ${firstItem.name || 'Ürün'}
                    ${itemCount > 1 ? ` +${itemCount - 1}` : ''}
                </td>
                <td>₺${order.total}</td>
                <td>
                    <span class="status-badge status-${order.status}">
                        ${getStatusText(order.status)}
                    </span>
                </td>
                <td>${formatDate(order.created_at)}</td>
                <td>
                    <button class="action-btn" onclick="viewOrder('${order.id}')">
                        Detay
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Update activity feed
function updateActivityFeed(recentOrders) {
    const feed = document.getElementById('activity-feed');
    const activities = [];
    
    // Add recent orders as activities
    recentOrders.slice(0, 5).forEach(order => {
        activities.push({
            type: 'order',
            icon: '•',
            content: `<strong>Yeni sipariş</strong> - ${order.customer?.name || 'Müşteri'}`,
            time: order.created_at
        });
    });
    
    // Sort by time
    activities.sort((a, b) => new Date(b.time) - new Date(a.time));
    
    // Render activities
    feed.innerHTML = activities.map(activity => `
        <div class="activity-item">
            <span class="activity-icon">${activity.icon}</span>
            <div class="activity-content">
                <p>${activity.content}</p>
                <span class="activity-time">${getRelativeTime(activity.time)}</span>
            </div>
        </div>
    `).join('');
}

// Chart variables
let salesChart = null;
let trafficChart = null;

// Initialize charts
async function initializeCharts() {
    // Sales chart
    const salesCtx = document.getElementById('salesChart').getContext('2d');
    salesChart = new Chart(salesCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Satışlar',
                data: [],
                borderColor: '#5C6AC4',
                backgroundColor: 'rgba(92, 106, 196, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: (context) => `₺${context.parsed.y}`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => `₺${value}`
                    }
                }
            }
        }
    });
    
    // Traffic chart
    const trafficCtx = document.getElementById('trafficChart').getContext('2d');
    trafficChart = new Chart(trafficCtx, {
        type: 'doughnut',
        data: {
            labels: ['Organik', 'Sosyal Medya', 'E-posta', 'Direkt'],
            datasets: [{
                data: [40, 25, 20, 15],
                backgroundColor: ['#5C6AC4', '#00C896', '#FFB400', '#E85DA1']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
    
    // Load initial chart data
    await updateSalesChart();
}

// Update sales chart based on period
async function updateSalesChart() {
    const period = document.getElementById('sales-period').value;
    const now = new Date();
    let dateRange = {};
    let labels = [];
    
    switch (period) {
        case 'week':
            dateRange.from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            dateRange.to = now.toISOString().split('T')[0];
            // Generate last 7 days labels
            for (let i = 6; i >= 0; i--) {
                const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
                labels.push(date.toLocaleDateString('tr-TR', { weekday: 'short' }));
            }
            break;
            
        case 'month':
            dateRange.from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            dateRange.to = now.toISOString().split('T')[0];
            // Generate month days labels
            const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            for (let i = 1; i <= daysInMonth; i++) {
                labels.push(i.toString());
            }
            break;
            
        case 'year':
            dateRange.from = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
            dateRange.to = now.toISOString().split('T')[0];
            // Generate month labels
            labels = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
            break;
    }
    
    try {
        const analyticsData = await getAnalytics(dateRange);
        
        // Process data based on period
        let data = [];
        if (period === 'week' || period === 'month') {
            // Daily data
            const dataMap = {};
            analyticsData.forEach(item => {
                const date = new Date(item.date);
                const key = period === 'week' 
                    ? date.toLocaleDateString('tr-TR', { weekday: 'short' })
                    : date.getDate().toString();
                dataMap[key] = item.revenue;
            });
            
            data = labels.map(label => dataMap[label] || 0);
        } else {
            // Monthly aggregation for year view
            const monthlyData = Array(12).fill(0);
            analyticsData.forEach(item => {
                const month = new Date(item.date).getMonth();
                monthlyData[month] += item.revenue;
            });
            data = monthlyData;
        }
        
        // Update chart
        salesChart.data.labels = labels;
        salesChart.data.datasets[0].data = data;
        salesChart.update();
        
    } catch (error) {
        console.error('Error updating sales chart:', error);
    }
}

// Subscribe to real-time updates
function subscribeToUpdates() {
    subscribeToOrders((payload) => {
        console.log('Order update:', payload);
        // Refresh dashboard data when new orders come in
        loadDashboardData();
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

function getRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 60) return `${minutes} dakika önce`;
    if (hours < 24) return `${hours} saat önce`;
    if (days < 7) return `${days} gün önce`;
    
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

function showError(message) {
    // You can implement a toast notification here
    console.error(message);
}

// Export for global access
window.viewOrder = (orderId) => {
    window.location.href = `order-detail.html?id=${orderId}`;
};

window.refreshData = () => {
    loadDashboardData();
};