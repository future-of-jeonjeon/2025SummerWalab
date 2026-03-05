import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

const savedTheme = localStorage.getItem('theme');
const initialTheme = savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : 'light';
document.documentElement.classList.toggle('dark', initialTheme === 'dark');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
