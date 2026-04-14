import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { PortfolioProvider } from './context/PortfolioContext'
import { WorkspaceProvider } from './context/WorkspaceContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <WorkspaceProvider>
        <PortfolioProvider>
          <App />
        </PortfolioProvider>
      </WorkspaceProvider>
    </BrowserRouter>
  </React.StrictMode>
)
