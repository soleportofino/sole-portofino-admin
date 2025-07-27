// Supabase Database Operations
import { initializeSupabase } from './supabase-config.js';

// Initialize Supabase client
let supabase = null;

async function getSupabaseClient() {
    if (!supabase) {
        supabase = await initializeSupabase();
    }
    return supabase;
}

// Customer Operations
export async function getCustomers(filters = {}) {
    const client = await getSupabaseClient();
    let query = client.from('customers').select('*');
    
    if (filters.segment) {
        query = query.eq('segment', filters.segment);
    }
    if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
}

export async function getCustomer(id) {
    const client = await getSupabaseClient();
    const { data, error } = await client
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();
    
    if (error) throw error;
    return data;
}

export async function createCustomer(customer) {
    const client = await getSupabaseClient();
    const { data, error } = await client
        .from('customers')
        .insert([customer])
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

export async function updateCustomer(id, updates) {
    const client = await getSupabaseClient();
    const { data, error } = await client
        .from('customers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

// Product Operations
export async function getProducts(filters = {}) {
    const client = await getSupabaseClient();
    let query = client.from('products').select('*');
    
    if (filters.category) {
        query = query.eq('category', filters.category);
    }
    if (filters.status) {
        query = query.eq('status', filters.status);
    }
    if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%`);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
}

export async function getProduct(id) {
    const client = await getSupabaseClient();
    const { data, error } = await client
        .from('products')
        .select('*')
        .eq('id', id)
        .single();
    
    if (error) throw error;
    return data;
}

export async function createProduct(product) {
    const client = await getSupabaseClient();
    const { data, error } = await client
        .from('products')
        .insert([product])
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

export async function updateProduct(id, updates) {
    const client = await getSupabaseClient();
    const { data, error } = await client
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

export async function deleteProduct(id) {
    const client = await getSupabaseClient();
    const { error } = await client
        .from('products')
        .delete()
        .eq('id', id);
    
    if (error) throw error;
    return true;
}

// Order Operations
export async function getOrders(filters = {}) {
    const client = await getSupabaseClient();
    let query = client.from('orders').select(`
        *,
        customer:customers(*)
    `);
    
    if (filters.status) {
        query = query.eq('status', filters.status);
    }
    if (filters.customerId) {
        query = query.eq('customer_id', filters.customerId);
    }
    if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
    }
    if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo);
    }
    if (filters.search) {
        query = query.or(`order_number.ilike.%${filters.search}%`);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
}

export async function getOrder(id) {
    const client = await getSupabaseClient();
    const { data, error } = await client
        .from('orders')
        .select(`
            *,
            customer:customers(*)
        `)
        .eq('id', id)
        .single();
    
    if (error) throw error;
    return data;
}

export async function createOrder(order) {
    const client = await getSupabaseClient();
    
    // Generate order number using database function
    const { data: orderNumber } = await client.rpc('generate_order_number');
    
    const { data, error } = await client
        .from('orders')
        .insert([{ ...order, order_number: orderNumber }])
        .select()
        .single();
    
    if (error) throw error;
    
    // Update customer stats
    if (data.customer_id) {
        await updateCustomerStats(data.customer_id);
    }
    
    return data;
}

export async function updateOrder(id, updates) {
    const client = await getSupabaseClient();
    const { data, error } = await client
        .from('orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

// Return Operations
export async function getReturns(filters = {}) {
    const client = await getSupabaseClient();
    let query = client.from('returns').select(`
        *,
        order:orders(*),
        customer:customers(*)
    `);
    
    if (filters.status) {
        query = query.eq('status', filters.status);
    }
    if (filters.customerId) {
        query = query.eq('customer_id', filters.customerId);
    }
    if (filters.search) {
        query = query.or(`return_number.ilike.%${filters.search}%`);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
}

export async function getReturn(id) {
    const client = await getSupabaseClient();
    const { data, error } = await client
        .from('returns')
        .select(`
            *,
            order:orders(*),
            customer:customers(*)
        `)
        .eq('id', id)
        .single();
    
    if (error) throw error;
    return data;
}

export async function createReturn(returnData) {
    const client = await getSupabaseClient();
    
    // Generate return number using database function
    const { data: returnNumber } = await client.rpc('generate_return_number');
    
    const { data, error } = await client
        .from('returns')
        .insert([{ ...returnData, return_number: returnNumber }])
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

export async function updateReturn(id, updates) {
    const client = await getSupabaseClient();
    const { data, error } = await client
        .from('returns')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

// Analytics Operations
export async function getAnalytics(dateRange = {}) {
    const client = await getSupabaseClient();
    let query = client.from('analytics').select('*');
    
    if (dateRange.from) {
        query = query.gte('date', dateRange.from);
    }
    if (dateRange.to) {
        query = query.lte('date', dateRange.to);
    }
    
    const { data, error } = await query.order('date', { ascending: true });
    
    if (error) throw error;
    return data;
}

export async function getTodayAnalytics() {
    const client = await getSupabaseClient();
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await client
        .from('analytics')
        .select('*')
        .eq('date', today)
        .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
    return data || createEmptyAnalytics(today);
}

export async function updateAnalytics(date, updates) {
    const client = await getSupabaseClient();
    const { data, error } = await client
        .from('analytics')
        .upsert({ date, ...updates })
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

// Settings Operations
export async function getSettings() {
    const client = await getSupabaseClient();
    const { data, error } = await client
        .from('settings')
        .select('*');
    
    if (error) throw error;
    
    // Convert array to object
    const settings = {};
    data.forEach(item => {
        settings[item.key] = item.value;
    });
    
    return settings;
}

export async function getSetting(key) {
    const client = await getSupabaseClient();
    const { data, error } = await client
        .from('settings')
        .select('value')
        .eq('key', key)
        .single();
    
    if (error) throw error;
    return data?.value;
}

export async function updateSetting(key, value) {
    const client = await getSupabaseClient();
    const { data, error } = await client
        .from('settings')
        .upsert({ key, value })
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

// Helper Functions
async function updateCustomerStats(customerId) {
    const client = await getSupabaseClient();
    
    // Get all orders for the customer
    const { data: orders } = await client
        .from('orders')
        .select('total')
        .eq('customer_id', customerId)
        .eq('status', 'delivered');
    
    if (orders) {
        const totalSpent = orders.reduce((sum, order) => sum + parseFloat(order.total), 0);
        const totalOrders = orders.length;
        
        // Determine segment based on total spent
        let segment = 'new';
        if (totalSpent >= 5000) segment = 'vip';
        else if (totalSpent >= 1000) segment = 'regular';
        
        await updateCustomer(customerId, {
            total_spent: totalSpent,
            total_orders: totalOrders,
            segment
        });
    }
}

function createEmptyAnalytics(date) {
    return {
        date,
        revenue: 0,
        orders_count: 0,
        avg_order_value: 0,
        new_customers: 0,
        returning_customers: 0,
        visitors: 0,
        conversion_rate: 0,
        top_products: [],
        traffic_sources: {
            organic: 0,
            social: 0,
            email: 0,
            direct: 0
        }
    };
}

// Real-time subscriptions
export function subscribeToOrders(callback) {
    const client = supabase;
    if (!client) return null;
    
    return client
        .channel('orders-changes')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'orders' }, 
            callback
        )
        .subscribe();
}

export function subscribeToProducts(callback) {
    const client = supabase;
    if (!client) return null;
    
    return client
        .channel('products-changes')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'products' }, 
            callback
        )
        .subscribe();
}

// Dashboard Summary
export async function getDashboardSummary() {
    const client = await getSupabaseClient();
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    // Get today's and yesterday's analytics
    const [todayData, yesterdayData] = await Promise.all([
        getTodayAnalytics(),
        client.from('analytics').select('*').eq('date', yesterday).single()
    ]);
    
    // Get recent orders
    const { data: recentOrders } = await client
        .from('orders')
        .select(`
            *,
            customer:customers(name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(10);
    
    // Get low stock products
    const { data: lowStockProducts } = await client
        .from('products')
        .select('*')
        .lte('stock', 10)
        .order('stock', { ascending: true })
        .limit(5);
    
    return {
        today: todayData,
        yesterday: yesterdayData.data || createEmptyAnalytics(yesterday),
        recentOrders: recentOrders || [],
        lowStockProducts: lowStockProducts || []
    };
}