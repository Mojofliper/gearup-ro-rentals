import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // Temporarily disabled CSP to isolate React SWC issue
    // headers: {
    //   'Content-Security-Policy': mode === 'development' 
    //     ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' 'sha256-6U/9Lq/5EaNy2usRGmzYNG3ZkdLkLsozVqVoWBsuR0I=' 'sha256-YmbE79pbJWvt1Auc9J69vK0PToRBM+iS95HvZhZW7fI=' 'sha256-oark6xL9XRmSPSar83hOj6J94OQznmgRESoXinTa5hE=' 'sha256-aCkTEzgGOlEpNsxAdMwPW+a+nOSwOZbxpadPpu1TvYY=' 'sha256-Z2/iFzh9VMlVkEOar1f/oSHWwQk3ve1qk/C2WdsC4Xk=' https://js.stripe.com https://m.stripe.com; style-src 'self' 'unsafe-inline' 'unsafe-hashes' 'sha256-0hAheEzaMe6uXIKV4EehS9pu1am1lj/KnnzrOYqckXk=' 'sha256-GsQC5AaXpdCaKTyWbxBzn7nitfp0Otwn7I/zu0rUKOs=' 'sha256-dd4J3UnQShsOmqcYi4vN5BT3mGZB/0fOwBA72rsguKc='; img-src 'self' data: blob: https:; connect-src 'self' https: wss: https://api.stripe.com https://r.stripe.com; font-src 'self' data:; frame-src 'self' https://js.stripe.com https://hooks.stripe.com;"
    //     : "default-src 'self'; script-src 'self' 'sha256-6U/9Lq/5EaNy2usRGmzYNG3ZkdLkLsozVqVoWBsuR0I=' 'sha256-YmbE79pbJWvt1Auc9J69vK0PToRBM+iS95HvZhZW7fI=' 'sha256-oark6xL9XRmSPSar83hOj6J94OQznmgRESoXinTa5hE=' 'sha256-aCkTEzgGOlEpNsxAdMwPW+a+nOSwOZbxpadPpu1TvYY=' 'sha256-Z2/iFzh9VMlVkEOar1f/oSHWwQk3ve1qk/C2WdsC4Xk=' https://js.stripe.com https://m.stripe.com; style-src 'self' 'unsafe-inline' 'unsafe-hashes' 'sha256-0hAheEzaMe6uXIKV4EehS9pu1am1lj/KnnzrOYqckXk=' 'sha256-GsQC5AaXpdCaKTyWbxBzn7nitfp0Otwn7I/zu0rUKOs=' 'sha256-dd4J3UnQShsOmqcYi4vN5BT3mGZB/0fOwBA72rsguKc='; img-src 'self' https:; connect-src 'self' https: https://api.stripe.com https://r.stripe.com; font-src 'self'; frame-src 'self' https://js.stripe.com https://hooks.stripe.com;"
    // }
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
