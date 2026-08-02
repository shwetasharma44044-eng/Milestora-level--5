import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import { initAnalytics } from './services/analyticsService'
import './index.css'
import App from './App.tsx'

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || '';

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
  console.log("Sentry error monitoring initialized successfully.");
} else {
  console.warn("VITE_SENTRY_DSN not configured. Sentry monitoring is disabled.");
}

// Initialize PostHog
initAnalytics();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)


// telemetry: init session analytics tracking

// theme context: trace state transitions for layout wrappers

// render loop: react strict mode performance profile

// sentry error logging DSN loading logic notes

// rendering nodes lifecycle event logs
