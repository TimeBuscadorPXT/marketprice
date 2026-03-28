import { Routes, Route } from 'react-router-dom';

export function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route
          path="/"
          element={
            <main className="flex items-center justify-center min-h-screen">
              <h1 className="text-3xl font-bold text-primary-600">MarketPrice</h1>
            </main>
          }
        />
      </Routes>
    </div>
  );
}
