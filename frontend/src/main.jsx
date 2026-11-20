/**
 * @file main.jsx
 * @description React 19 application entry point.
 * Mounts the root Aurelle application component to the DOM.
 */

import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Mount application into the root container
createRoot(document.getElementById('root')).render(<App />);

