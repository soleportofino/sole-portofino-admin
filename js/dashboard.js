// Sole Portofino Admin Dashboard

// Check authentication
async function checkAuth() {
    // Check if we have Supabase auth available
    if (window.supabaseAuth) {
        const isAuthenticated = await window.supabaseAuth.isAuthenticated();
        if (!isAuthenticated) {
            window.location.href = 'index.html';
            return;
        }
        
        // Get user email from Supabase or localStorage
        const supabase = window.supabaseAuth.getSupabase();
        if (supabase) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                document.getElementById('user-email').textContent = user.email;
                return;
            }
        }
    }
    
    // Fallback to demo mode
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (!isLoggedIn) {
        window.location.href = 'index.html';
        return;
    }
    
    // Update user email
    const userEmail = localStorage.getItem('userEmail') || 'admin@soleportofino.com';
    document.getElementById('user-email').textContent = userEmail;
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    initDashboard();
    initCharts();
    loadRecentOrders();
    setupEventListeners();
});

// Initialize dashboard data
async function initDashboard() {
    const supabase = window.supabaseAuth?.getSupabase();
    
    if (supabase) {
        try {
            // Fetch real data from Supabase
            const [ordersResult, customersResult] = await Promise.all([
                supabase.from('orders').select('*'),
                supabase.from('customers').select('*')
            ]);
            
            // Calculate stats
            const orders = ordersResult.data || [];
            const customers = customersResult.data || [];
            
            const totalSales = orders.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0);
            const totalOrders = orders.length;
            const totalCustomers = customers.length;
            const conversionRate = totalCustomers > 0 ? (totalOrders / totalCustomers * 100).toFixed(1) : 0;
            
            updateStats({
                totalSales,
                totalOrders,
                totalCustomers,
                conversionRate
            });
            
            // Count new orders (pending status)
            const newOrders = orders.filter(order => order.status === 'pending').length;
            updateNewOrdersCount(newOrders);
            
        } catch (error) {
            console.error('Error fetching data from Supabase:', error);
            // Fall back to demo data
            showDemoData();
        }
    } else {
        // Use demo data if Supabase is not available
        showDemoData();
    }
}

function showDemoData() {
    updateStats({
        totalSales: 45750,
        totalOrders: 23,
        totalCustomers: 18,
        conversionRate: 3.2
    });
    
    updateNewOrdersCount(3);
}

// Update statistics
function updateStats(stats) {
    animateValue('total-sales', 0, stats.totalSales, 1500);
    animateValue('total-orders', 0, stats.totalOrders, 1500);
    animateValue('total-customers', 0, stats.totalCustomers, 1500);
    animateValue('conversion-rate', 0, stats.conversionRate, 1500, true);
}

// Animate number counting
function animateValue(id, start, end, duration, isDecimal = false) {
    const element = document.getElementById(id);
    if (!element) return;
    
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const current = start + (end - start) * easeOutQuart(progress);
        
        if (isDecimal) {
            element.textContent = current.toFixed(1);
        } else {
            element.textContent = Math.floor(current).toLocaleString('tr-TR');
        }
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

// Easing function
function easeOutQuart(x) {
    return 1 - Math.pow(1 - x, 4);
}

// Update new orders count
function updateNewOrdersCount(count) {
    const badge = document.getElementById('new-orders-count');
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline-flex' : 'none';
    }
}

// Initialize charts
function initCharts() {
    // Sales Chart
    const salesCtx = document.getElementById('salesChart').getContext('2d');
    const salesChart = new Chart(salesCtx, {
        type: 'line',
        data: {
            labels: ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'],
            datasets: [{
                label: 'Satışlar (₺)',
                data: [3200, 4500, 3800, 5200, 6800, 8500, 7200],
                borderColor: '#8B4513',
                backgroundColor: 'rgba(139, 69, 19, 0.1)',
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
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '₺' + value.toLocaleString('tr-TR');
                        }
                    }
                }
            }
        }
    });
    
    // Traffic Chart
    const trafficCtx = document.getElementById('trafficChart').getContext('2d');
    const trafficChart = new Chart(trafficCtx, {
        type: 'doughnut',
        data: {
            labels: ['Organik', 'Instagram', 'Google Ads', 'Direkt', 'Diğer'],
            datasets: [{
                data: [35, 30, 20, 10, 5],
                backgroundColor: [
                    '#8B4513',
                    '#DC143C',
                    '#2196F3',
                    '#FF9800',
                    '#9E9E9E'
                ]
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
    
    // Store charts for updates
    window.charts = { salesChart, trafficChart };
}

// Load recent orders
async function loadRecentOrders() {
    const tbody = document.getElementById('recent-orders');
    if (!tbody) return;
    
    let ordersData = [];
    const supabase = window.supabaseAuth?.getSupabase();
    
    if (supabase) {
        try {
            // Fetch recent orders from Supabase
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10);
            
            if (error) throw error;
            
            // Map Supabase data to display format
            ordersData = (data || []).map(order => ({
                orderNo: order.order_number || `#${order.id.substring(0, 8)}`,
                customer: order.customer_name,
                product: order.product_name || 'Signature Gingham Tote',
                amount: parseFloat(order.total_amount),
                status: order.status,
                date: new Date(order.created_at).toISOString().split('T')[0]
            }));
            
        } catch (error) {
            console.error('Error fetching orders:', error);
            // Fall back to demo data
            ordersData = getDemoOrders();
        }
    } else {
        // Use demo data if Supabase is not available
        ordersData = getDemoOrders();
    }
    
    tbody.innerHTML = ordersData.map(order => `
        <tr>
            <td>${order.orderNo}</td>
            <td>${order.customer}</td>
            <td>${order.product}</td>
            <td>₺${order.amount.toLocaleString('tr-TR')}</td>
            <td>
                <span class="status-badge ${order.status}">
                    ${getStatusText(order.status)}
                </span>
            </td>
            <td>${formatDate(order.date)}</td>
            <td>
                <button class="action-button" onclick="viewOrder('${order.orderNo}')">
                    Görüntüle
                </button>
            </td>
        </tr>
    `).join('');
}

// Get demo orders data
function getDemoOrders() {
    return [
        {
            orderNo: '#SP2024001',
            customer: 'Ayşe Yılmaz',
            product: 'Signature Gingham Tote',
            amount: 2999,
            status: 'completed',
            date: '2024-01-15'
        },
        {
            orderNo: '#SP2024002',
            customer: 'Mehmet Öz',
            product: 'Signature Gingham Tote',
            amount: 2999,
            status: 'processing',
            date: '2024-01-15'
        },
        {
            orderNo: '#SP2024003',
            customer: 'Zeynep Kara',
            product: 'Signature Gingham Tote',
            amount: 2999,
            status: 'pending',
            date: '2024-01-14'
        }
    ];
}

// Get status text in Turkish
function getStatusText(status) {
    const statusMap = {
        'pending': 'Beklemede',
        'processing': 'İşleniyor',
        'completed': 'Tamamlandı',
        'cancelled': 'İptal'
    };
    return statusMap[status] || status;
}

// Format date
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR');
}

// Setup event listeners
function setupEventListeners() {
    // Logout button
    const logoutBtn = document.getElementById('logout-button');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Sales period selector
    const salesPeriod = document.getElementById('sales-period');
    if (salesPeriod) {
        salesPeriod.addEventListener('change', updateSalesChart);
    }
}

// Handle logout
async function handleLogout() {
    if (confirm('Çıkış yapmak istediğinize emin misiniz?')) {
        if (window.supabaseAuth) {
            await window.supabaseAuth.logout();
        } else {
            // Fallback for demo mode
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('userEmail');
            window.location.href = 'index.html';
        }
    }
}

// Update sales chart based on period
function updateSalesChart(e) {
    const period = e.target.value;
    const chart = window.charts.salesChart;
    
    // Demo data for different periods
    const data = {
        week: {
            labels: ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'],
            data: [3200, 4500, 3800, 5200, 6800, 8500, 7200]
        },
        month: {
            labels: ['1. Hafta', '2. Hafta', '3. Hafta', '4. Hafta'],
            data: [25000, 32000, 28000, 35000]
        },
        year: {
            labels: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'],
            data: [45000, 52000, 48000, 55000, 62000, 68000, 72000, 75000, 68000, 70000, 82000, 95000]
        }
    };
    
    chart.data.labels = data[period].labels;
    chart.data.datasets[0].data = data[period].data;
    chart.update();
}

// View order details
window.viewOrder = function(orderNo) {
    alert(`Sipariş detayları: ${orderNo}`);
    // In real implementation, open order details modal or navigate to order page
};

// Refresh data
window.refreshData = function() {
    const button = event.target.closest('.refresh-button');
    const icon = button.querySelector('.icon');
    
    // Add spinning animation
    icon.style.display = 'inline-block';
    icon.style.animation = 'spin 1s linear infinite';
    
    // Simulate data refresh
    setTimeout(() => {
        icon.style.animation = '';
        alert('Veriler güncellendi!');
        
        // Reload data
        initDashboard();
        loadRecentOrders();
    }, 1000);
};

// CSS for spinning animation
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);