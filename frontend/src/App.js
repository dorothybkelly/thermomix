// frontend/src/App.jsx
import React, { useState } from 'react';
import './App.css'; // Import CSS for styling

function App() {
  // State variables
  const [recipeText, setRecipeText] = useState(''); // Input recipe text
  const [thermomixSteps, setThermomixSteps] = useState(''); // Output steps
  const [isLoading, setIsLoading] = useState(false); // Loading indicator
  const [error, setError] = useState(''); // Error messages
  const [copyButtonText, setCopyButtonText] = useState('Copy Recipe'); // Copy button text

  // Handle form submission
  const handleSubmit = async (event) => {
    event.preventDefault(); // Prevent default form submission
    setIsLoading(true); // Show loading indicator
    setError(''); // Clear previous errors
    setThermomixSteps(''); // Clear previous results
    setCopyButtonText('Copy Recipe'); // Reset copy button text

    try {
      // Send recipe text to the backend API endpoint
      const response = await fetch('/api/convert', { // Relative path assumes backend is served at /api
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recipeText }), // Send text in JSON body
      });

      // Check if the request was successful
      if (!response.ok) {
        // Try to get error message from backend response body
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
            const errorData = await response.json();
            errorMsg = errorData.error || errorMsg; // Use backend error if available
        } catch (e) {
            // Ignore if response body isn't valid JSON
        }
        throw new Error(errorMsg);
      }

      // Parse the JSON response from the backend
      const data = await response.json();
      setThermomixSteps(data.thermomixSteps); // Update state with the converted steps

    } catch (err) {
      console.error("Conversion failed:", err);
      setError(err.message || 'Failed to convert recipe. Please try again.'); // Set error message
    } finally {
      setIsLoading(false); // Hide loading indicator regardless of success/failure
    }
  };

  // Handle copying the recipe to clipboard
  const handleCopy = () => {
    if (!thermomixSteps) return; // Do nothing if there's no text

    navigator.clipboard.writeText(thermomixSteps)
      .then(() => {
        setCopyButtonText('Copied!'); // Provide feedback
        setTimeout(() => setCopyButtonText('Copy Recipe'), 2000); // Reset after 2s
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
        setError('Failed to copy recipe to clipboard.');
      });
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Thermomix Recipe Converter <span role="img" aria-label="robot chef">🤖🍳</span></h1>
        <p>Paste your traditional recipe below and get AI-powered Thermomix steps!</p>
      </header>

      <main className="App-main">
        <form onSubmit={handleSubmit}>
          <label htmlFor="recipe-input">Paste Recipe Here:</label>
          <textarea
            id="recipe-input"
            value={recipeText}
            onChange={(e) => setRecipeText(e.target.value)}
            placeholder="e.g., Ingredients:\n1 onion, chopped\n2 cloves garlic, minced\n...\n\nInstructions:\n1. Sauté onions and garlic in oil...\n2. Add tomatoes and simmer..."
            rows={15} // Adjust rows as needed
            required
          />
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Converting...' : 'Convert Recipe'}
          </button>
        </form>

        {isLoading && <div className="loading-spinner"></div>}

        {error && <div className="error-message">Error: {error}</div>}

        {thermomixSteps && (
          <div className="results-container">
            <h2>Suggested Thermomix Steps:</h2>
            {/* Use 'pre' tag to preserve whitespace and line breaks from AI response */}
            <pre className="thermomix-steps">{thermomixSteps}</pre>
            <button onClick={handleCopy} className="copy-button">
              {copyButtonText}
            </button>
          </div>
        )}
      </main>

      <footer className="App-footer">
        <p>Powered by AI. Always review steps carefully before cooking.</p>
      </footer>
    </div>
  );
}

export default App;

