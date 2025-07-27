// Products Data Operations
import { 
    getProducts, 
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    subscribeToProducts
} from './supabase-db.js';
import { getPlaceholderImage } from './utils.js';

// State variables
let currentPage = 1;
const itemsPerPage = 12;
let allProducts = [];
let filteredProducts = [];
let currentProductId = null;

// Initialize products page
export async function initializeProducts() {
    try {
        // Load initial data
        await loadProducts();
        
        // Set up event listeners
        setupEventListeners();
        
        // Subscribe to real-time updates
        subscribeToUpdates();
        
    } catch (error) {
        console.error('Products initialization error:', error);
        showError('Ürünler yüklenirken hata oluştu');
    }
}

// Set up event listeners
function setupEventListeners() {
    // Filters
    document.getElementById('category-filter').addEventListener('change', applyFilters);
    document.getElementById('status-filter').addEventListener('change', applyFilters);
    document.getElementById('search-input').addEventListener('input', debounce(applyFilters, 300));
    
    // Product form
    document.getElementById('product-form').addEventListener('submit', handleProductSubmit);
}

// Load products from database
async function loadProducts() {
    try {
        const products = await getProducts();
        allProducts = products;
        applyFilters();
        updateStats();
    } catch (error) {
        console.error('Error loading products:', error);
        showError('Ürünler yüklenirken hata oluştu');
    }
}

// Apply filters to products
function applyFilters() {
    const category = document.getElementById('category-filter').value;
    const status = document.getElementById('status-filter').value;
    const search = document.getElementById('search-input').value.toLowerCase();
    
    filteredProducts = allProducts.filter(product => {
        let matches = true;
        
        if (category && product.category !== category) matches = false;
        if (status && product.status !== status) matches = false;
        if (search && !product.name.toLowerCase().includes(search) && 
            !product.sku.toLowerCase().includes(search)) matches = false;
        
        return matches;
    });
    
    currentPage = 1;
    renderProducts();
}

// Render products grid
function renderProducts() {
    const grid = document.getElementById('products-grid');
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageProducts = filteredProducts.slice(startIndex, endIndex);
    
    if (pageProducts.length === 0) {
        grid.innerHTML = '<div class="no-data">Ürün bulunamadı</div>';
        updatePagination();
        return;
    }
    
    grid.innerHTML = pageProducts.map(product => `
        <div class="product-card">
            <img src="${product.image_url || getPlaceholderImage()}" alt="${product.name}" class="product-image">
            <div class="product-info">
                <h3>${product.name}</h3>
                <p class="product-sku">SKU: ${product.sku}</p>
                <p class="product-price">₺${formatCurrency(product.price)}</p>
                <p class="product-stock ${product.stock === 0 ? 'out-of-stock' : ''}">
                    Stok: ${product.stock}
                </p>
                <span class="status-badge status-${product.status}">
                    ${getStatusText(product.status)}
                </span>
                <div class="product-actions">
                    <button class="btn-sm" onclick="window.editProduct('${product.id}')">Düzenle</button>
                    <button class="btn-sm btn-danger" onclick="window.confirmDeleteProduct('${product.id}')">Sil</button>
                </div>
            </div>
        </div>
    `).join('');
    
    updatePagination();
}

// Update pagination
function updatePagination() {
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    document.getElementById('current-page').textContent = currentPage;
    document.getElementById('total-pages').textContent = totalPages;
}

// Update statistics
function updateStats() {
    document.getElementById('total-products').textContent = allProducts.length;
    document.getElementById('active-products').textContent = 
        allProducts.filter(p => p.status === 'active').length;
    document.getElementById('out-of-stock').textContent = 
        allProducts.filter(p => p.stock === 0).length;
}

// Handle product form submission
async function handleProductSubmit(e) {
    e.preventDefault();
    
    const productData = {
        name: document.getElementById('product-name').value,
        sku: document.getElementById('product-sku').value,
        category: document.getElementById('product-category').value,
        price: parseFloat(document.getElementById('product-price').value),
        stock: parseInt(document.getElementById('product-stock').value),
        description: document.getElementById('product-description').value,
        status: document.getElementById('product-stock').value > 0 ? 'active' : 'out_of_stock'
    };
    
    try {
        if (currentProductId) {
            // Update existing product
            await updateProduct(currentProductId, productData);
            showSuccess('Ürün güncellendi');
        } else {
            // Create new product
            await createProduct(productData);
            showSuccess('Ürün eklendi');
        }
        
        closeProductModal();
        await loadProducts();
    } catch (error) {
        console.error('Error saving product:', error);
        showError('Ürün kaydedilirken hata oluştu');
    }
}

// Subscribe to real-time updates
function subscribeToUpdates() {
    subscribeToProducts((payload) => {
        console.log('Product update:', payload);
        loadProducts();
    });
}

// Helper functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('tr-TR').format(amount || 0);
}

function getStatusText(status) {
    const statusMap = {
        active: 'Aktif',
        inactive: 'Pasif',
        out_of_stock: 'Stokta Yok'
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
window.addNewProduct = () => {
    currentProductId = null;
    document.getElementById('modal-title').textContent = 'Yeni Ürün Ekle';
    document.getElementById('product-form').reset();
    document.getElementById('product-modal').style.display = 'flex';
};

window.editProduct = async (productId) => {
    try {
        currentProductId = productId;
        const product = await getProduct(productId);
        
        document.getElementById('modal-title').textContent = 'Ürün Düzenle';
        document.getElementById('product-name').value = product.name;
        document.getElementById('product-sku').value = product.sku;
        document.getElementById('product-category').value = product.category;
        document.getElementById('product-price').value = product.price;
        document.getElementById('product-stock').value = product.stock;
        document.getElementById('product-description').value = product.description || '';
        document.getElementById('product-modal').style.display = 'flex';
    } catch (error) {
        console.error('Error loading product:', error);
        showError('Ürün yüklenirken hata oluştu');
    }
};

window.confirmDeleteProduct = async (productId) => {
    if (confirm('Bu ürünü silmek istediğinize emin misiniz?')) {
        try {
            await deleteProduct(productId);
            showSuccess('Ürün silindi');
            await loadProducts();
        } catch (error) {
            console.error('Error deleting product:', error);
            showError('Ürün silinirken hata oluştu');
        }
    }
};

window.closeProductModal = () => {
    document.getElementById('product-modal').style.display = 'none';
    currentProductId = null;
};

window.previousPage = () => {
    if (currentPage > 1) {
        currentPage--;
        renderProducts();
    }
};

window.nextPage = () => {
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderProducts();
    }
};