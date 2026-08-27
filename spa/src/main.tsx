import '@fontsource-variable/dm-sans/wght.css'
import '@fontsource-variable/noto-sans-jp/wght.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { SvgSpriteDefs } from './icons/SvgSpriteDefs'
import { prefersDarkColorScheme } from './styles/designTokens'
import './index.css'
import './stores/preferencesWatcher'

const rootElement = document.getElementById('redmine-canvas-gantt-root') || document.getElementById('root');
rootElement?.classList.add('rcg-theme');
// Align native form controls (inputs, checkboxes, number spinners) with the
// resolved dark/light scheme so they don't render white in dark mode.
if (rootElement) rootElement.style.colorScheme = prefersDarkColorScheme ? 'dark' : 'light';
createRoot(rootElement!).render(
  <StrictMode>
    <SvgSpriteDefs />
    <App />
  </StrictMode>,
)
