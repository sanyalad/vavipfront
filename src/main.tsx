import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './assets/styles/globals.css'
import './styles/animations.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
})

const basename = import.meta.env.BASE_URL || '/'

// Safety: Clean up any stuck intro-active class that might block content
if (typeof document !== 'undefined' && document.body) {
  // Remove intro-active after a delay to ensure content is visible
  setTimeout(() => {
    if (document.body && document.body.classList.contains('intro-active')) {
      document.body.classList.remove('intro-active')
      document.body.classList.add('intro-revealed')
    }
  }, 3000) // After 3 seconds, force remove intro-active
}

const rootElement = document.getElementById('root')
if (!rootElement) {
  console.error('Root element not found')
} else {
  ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter 
        basename={basename}
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
  )
}

