import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './Connect4.css'
import Connect from './Connect4.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Connect />
  </StrictMode>,
)
