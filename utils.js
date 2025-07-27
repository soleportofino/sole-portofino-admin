// Utility functions for admin panel

// Placeholder image as base64 SVG
const PLACEHOLDER_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjBGMEYwIi8+CjxwYXRoIGQ9Ik04MCA4MEgxMjBWMTIwSDgwVjgwWiIgZmlsbD0iI0RERERERCIvPgo8cGF0aCBkPSJNOTAgOTBIMTEwVjExMEg5MFY5MFoiIGZpbGw9IiNDQ0NDQ0MiLz4KPHRleHQgeD0iNTAlIiB5PSIxNDAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OTk5OSI+Tm8gSW1hZ2U8L3RleHQ+Cjwvc3ZnPg==';

// Get placeholder image
function getPlaceholderImage() {
    return PLACEHOLDER_IMAGE;
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(amount);
}

// Format date
function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('tr-TR');
}

// Format datetime
function formatDateTime(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('tr-TR') + ' ' + d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

// Convert data to CSV
function convertToCSV(data, headers) {
    if (!data || data.length === 0) return '';
    
    // Get headers from first object if not provided
    if (!headers) {
        headers = Object.keys(data[0]);
    }
    
    // Create header row
    let csv = headers.join(',') + '\n';
    
    // Add data rows
    data.forEach(row => {
        const values = headers.map(header => {
            const value = row[header];
            // Escape values containing commas or quotes
            if (value && (value.toString().includes(',') || value.toString().includes('"'))) {
                return `"${value.toString().replace(/"/g, '""')}"`;
            }
            return value || '';
        });
        csv += values.join(',') + '\n';
    });
    
    return csv;
}

// Download file
function downloadFile(content, filename, type = 'text/csv') {
    const blob = new Blob([content], { type });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// Export to CSV
function exportToCSV(data, filename = 'export.csv', headers = null) {
    const csv = convertToCSV(data, headers);
    downloadFile(csv, filename);
}

// Export analytics report
function exportAnalyticsReport() {
    // Sample data - replace with actual data from Supabase
    const reportData = [
        {
            period: 'Ocak 2024',
            revenue: 487250,
            orders: 342,
            avgOrder: 1425,
            conversionRate: 3.8
        },
        {
            period: 'Aralık 2023',
            revenue: 394800,
            orders: 289,
            avgOrder: 1361,
            conversionRate: 4.1
        }
    ];
    
    const headers = ['Dönem', 'Gelir (₺)', 'Sipariş Sayısı', 'Ortalama Sipariş (₺)', 'Dönüşüm Oranı (%)'];
    const formattedData = reportData.map(row => ({
        'Dönem': row.period,
        'Gelir (₺)': row.revenue,
        'Sipariş Sayısı': row.orders,
        'Ortalama Sipariş (₺)': row.avgOrder,
        'Dönüşüm Oranı (%)': row.conversionRate
    }));
    
    exportToCSV(formattedData, `analiz-raporu-${formatDate(new Date())}.csv`, headers);
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
        color: white;
        border-radius: 4px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Chart.js default options for consistent styling
const chartDefaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            display: true,
            position: 'bottom',
            labels: {
                padding: 20,
                font: {
                    size: 12,
                    family: 'Inter'
                }
            }
        },
        tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            cornerRadius: 4,
            titleFont: {
                size: 13,
                weight: 'normal'
            },
            bodyFont: {
                size: 12
            }
        }
    },
    scales: {
        y: {
            beginAtZero: true,
            grid: {
                color: 'rgba(0, 0, 0, 0.05)',
                drawBorder: false
            },
            ticks: {
                font: {
                    size: 11
                }
            }
        },
        x: {
            grid: {
                display: false,
                drawBorder: false
            },
            ticks: {
                font: {
                    size: 11
                }
            }
        }
    }
};

// Export functions and constants
window.utils = {
    PLACEHOLDER_IMAGE,
    getPlaceholderImage,
    formatCurrency,
    formatDate,
    formatDateTime,
    convertToCSV,
    downloadFile,
    exportToCSV,
    exportAnalyticsReport,
    showNotification,
    chartDefaultOptions
};