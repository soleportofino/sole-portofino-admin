# Sole Portofino Admin Panel

Sole Portofino e-ticaret sitesi için yönetim paneli.

## Özellikler

- 🔒 Güvenli giriş sistemi (Supabase Authentication)
- 📊 Dashboard ile sipariş ve müşteri yönetimi
- 🛒 Ürün yönetimi
- 📦 Stok takibi
- 💳 Ödeme ve sipariş durumu takibi

## Teknolojiler

- HTML5/CSS3/JavaScript
- Supabase (Authentication & Database)
- Cloudflare Pages (Hosting)
- Environment Variables ile güvenli konfigürasyon

## Kurulum

1. Repository'yi klonlayın
2. Cloudflare Pages'de projeyi oluşturun
3. Environment variables'ları ekleyin:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`

## Deployment

Cloudflare Pages otomatik olarak master branch'teki değişiklikleri deploy eder.

## Güvenlik

- Tüm hassas bilgiler environment variables ile saklanır
- Hardcoded credential bulunmaz
- Cloudflare Workers ile runtime injection

## URL

- Production: https://admin.soleportofino.com