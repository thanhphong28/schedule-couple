// hooks/useCoupleLocation.js
// Backward-compatible hook delegating to global LocationContext
import { useLocation } from '../context/LocationContext.jsx';

export function useCoupleLocation() {
  return useLocation();
}

export default useCoupleLocation;
