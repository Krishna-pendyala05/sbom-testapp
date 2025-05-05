// src/components/CdnLoader.js
import React, { useState } from 'react';

function CdnLoader() {
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  const [result, setResult] = useState('');

  const loadMomentFromCDN = () => {
    if (!libraryLoaded) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.4/moment.min.js';
      script.onload = () => {
        setLibraryLoaded(true);
        console.log('Moment.js loaded from CDN');
        // This should trigger the runtime monitor
        if (window.moment) {
          setResult(window.moment().format('MMMM Do YYYY, h:mm:ss a'));
        }
      };
      document.body.appendChild(script);
    } else {
      // Library already loaded, just update the result
      if (window.moment) {
        setResult(window.moment().format('MMMM Do YYYY, h:mm:ss a'));
      }
    }
  };

  return (
    <div className="test-case">
      <h2>Test 1: CDN-Loaded Dependencies</h2>
      <p>This test will load Moment.js from a CDN when you click the button.</p>
      <button onClick={loadMomentFromCDN}>
        {libraryLoaded ? 'Update Time with Moment.js' : 'Load Moment.js from CDN'}
      </button>
      {result && (
        <div className="result">
          <p>Current time from Moment.js: <strong>{result}</strong></p>
        </div>
      )}
    </div>
  );
}

export default CdnLoader;