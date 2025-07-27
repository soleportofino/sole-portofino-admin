-- Supabase Database Schema for Sole Portofino Admin Panel

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Customers table
CREATE TABLE customers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  city TEXT,
  address TEXT,
  total_spent DECIMAL(10,2) DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  segment TEXT DEFAULT 'new', -- new, regular, vip
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products table
CREATE TABLE products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  stock INTEGER DEFAULT 0,
  category TEXT,
  image_url TEXT,
  status TEXT DEFAULT 'active', -- active, inactive, out_of_stock
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders table
CREATE TABLE orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id),
  items JSONB NOT NULL, -- Array of {product_id, name, quantity, price}
  subtotal DECIMAL(10,2) NOT NULL,
  shipping DECIMAL(10,2) DEFAULT 0,
  tax DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, processing, shipped, delivered, cancelled
  payment_method TEXT,
  payment_status TEXT DEFAULT 'pending', -- pending, paid, failed, refunded
  shipping_address JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Returns table
CREATE TABLE returns (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  return_number TEXT UNIQUE NOT NULL,
  order_id UUID REFERENCES orders(id),
  customer_id UUID REFERENCES customers(id),
  items JSONB NOT NULL, -- Array of {product_id, name, quantity, reason}
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected, completed
  refund_amount DECIMAL(10,2),
  refund_method TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics table (daily aggregated data)
CREATE TABLE analytics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  revenue DECIMAL(10,2) DEFAULT 0,
  orders_count INTEGER DEFAULT 0,
  avg_order_value DECIMAL(10,2) DEFAULT 0,
  new_customers INTEGER DEFAULT 0,
  returning_customers INTEGER DEFAULT 0,
  visitors INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,2) DEFAULT 0,
  top_products JSONB, -- Array of {product_id, name, quantity, revenue}
  traffic_sources JSONB, -- {organic: %, social: %, email: %, direct: %}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Settings table (key-value store)
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_customers_segment ON customers(segment);
CREATE INDEX idx_returns_order_id ON returns(order_id);
CREATE INDEX idx_returns_status ON returns(status);
CREATE INDEX idx_analytics_date ON analytics(date);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to tables
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_returns_updated_at BEFORE UPDATE ON returns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create order_number sequence
CREATE SEQUENCE order_number_seq START 1000;

-- Create return_number sequence
CREATE SEQUENCE return_number_seq START 100;

-- Function to generate order numbers
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
BEGIN
    RETURN 'ORD-' || LPAD(nextval('order_number_seq')::TEXT, 6, '0');
END;
$$ language 'plpgsql';

-- Function to generate return numbers
CREATE OR REPLACE FUNCTION generate_return_number()
RETURNS TEXT AS $$
BEGIN
    RETURN 'RET-' || LPAD(nextval('return_number_seq')::TEXT, 6, '0');
END;
$$ language 'plpgsql';

-- Row Level Security (RLS)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust based on your auth setup)
-- For now, we'll create policies that allow authenticated users to do everything
-- You should adjust these based on your specific requirements

-- Customers policies
CREATE POLICY "Authenticated users can view customers" ON customers
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert customers" ON customers
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update customers" ON customers
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Products policies
CREATE POLICY "Authenticated users can view products" ON products
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert products" ON products
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update products" ON products
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete products" ON products
    FOR DELETE USING (auth.role() = 'authenticated');

-- Orders policies
CREATE POLICY "Authenticated users can view orders" ON orders
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert orders" ON orders
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update orders" ON orders
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Returns policies
CREATE POLICY "Authenticated users can view returns" ON returns
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert returns" ON returns
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update returns" ON returns
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Analytics policies
CREATE POLICY "Authenticated users can view analytics" ON analytics
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert analytics" ON analytics
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Settings policies
CREATE POLICY "Authenticated users can view settings" ON settings
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update settings" ON settings
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Insert default settings
INSERT INTO settings (key, value) VALUES
  ('site_name', '"Sole Portofino"'),
  ('currency', '"TRY"'),
  ('free_shipping_threshold', '500'),
  ('default_shipping_fee', '29.90'),
  ('tax_rate', '18')
ON CONFLICT (key) DO NOTHING;