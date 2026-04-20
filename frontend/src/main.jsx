import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster position="top-right" toastOptions={{
        style: { background: 'rgba(22,26,46,.9)', color: '#e8ecff', border: '1px solid rgba(124,247,198,.3)', backdropFilter: 'blur(12px)' }
      }}/>
    </BrowserRouter>
  </React.StrictMode>
)
