import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { installRetryFetch } from './lib/retry-fetch';

// Retry transient 5xx from the Source Cooperative data host (fields.pmtiles +
// JRC flood COGs) before any map code fetches a tile. See retry-fetch.ts.
installRetryFetch();

// StrictMode is intentionally OFF for now.
// React 19 StrictMode double-mounts effects in dev, which races with
// maplibre-gl's WebGL context lifecycle and causes "context was lost"
// on every page load. Re-enable once the map is on stable footing and
// we've added a proper guard for the second-mount in MapView.
createRoot(document.getElementById('root')!).render(<App />);
