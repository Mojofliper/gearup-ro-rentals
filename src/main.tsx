import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './utils/stripeErrorHandler.ts'
import { setupConsoleFilter } from './utils/consoleFilter'
import { setupGlobalErrorHandler } from './utils/errorReporting'

// Setup console filter to suppress non-critical errors
setupConsoleFilter();

// Setup global error handling
setupGlobalErrorHandler();

createRoot(document.getElementById("root")!).render(<App />);
