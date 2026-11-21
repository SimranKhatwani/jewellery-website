/**
 * @file main.jsx
 * @description React 19 application entry point.
 * Mounts the root Aurelle application component to the DOM with a resilient ErrorBoundary.
 */

import React, { Component } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[Application ErrorBoundary Caught]:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center p-6 text-center text-[#593D30]">
          <div className="max-w-md w-full p-8 bg-white border border-[#D7C5AF]/60 rounded-2xl shadow-xl space-y-5">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#FAF7F2] border border-[#D7C5AF] flex items-center justify-center text-[#A85F49]">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="font-serif text-2xl text-[#593D30]">Aurelle Platform Notice</h2>
            <p className="text-xs text-[#8E8172] leading-relaxed">
              An unexpected render anomaly occurred. Your session and store data remain secure.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.href = '/aurelle';
                }}
                className="px-5 py-2.5 bg-[#593D30] hover:bg-[#A85F49] text-white rounded-full text-xs uppercase tracking-wider font-semibold transition-colors cursor-pointer"
              >
                Open Storefront
              </button>
              <button
                onClick={this.handleReset}
                className="px-5 py-2.5 border border-[#D7C5AF] hover:bg-[#FAF7F2] text-[#593D30] rounded-full text-xs uppercase tracking-wider font-semibold transition-colors cursor-pointer"
              >
                Platform Home
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Mount application into the root container
createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
