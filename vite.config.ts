import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    headers: {
      // Fix CSP issues for Stripe and other services
      "Content-Security-Policy": [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://m.stripe.network",
        "style-src 'self' 'unsafe-inline' https://m.stripe.network",
        "img-src 'self' data: https: blob:",
        "font-src 'self' data:",
        "connect-src 'self' https://*.stripe.com https://*.supabase.co wss://*.supabase.co",
        "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'self'",
        "upgrade-insecure-requests"
      ].join("; "),
    },
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: 'hidden',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          stripe: ['@stripe/stripe-js'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
  css: {
    devSourcemap: true,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@stripe/stripe-js', '@supabase/supabase-js'],
  },
});
