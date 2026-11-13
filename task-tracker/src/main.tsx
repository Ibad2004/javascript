import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import './index.css';
import { App } from './App.tsx';
import { toLocalDateString } from './utils/dates.ts';

const rootElement = document.getElementById('root');
if (rootElement === null) {
  throw new Error('index.html is missing the <div id="root"> element.');
}

// Read the clock once, outside React, so rendering stays pure.
// Known limit: if the tab stays open past midnight, reload to update "today".
const today = toLocalDateString(new Date());

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <App today={today} />
    </BrowserRouter>
  </StrictMode>,
);
