// Minimal location helpers used by components
export const getCurrentLocation = async ({ timeout = 10000 } = {}) => {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return {
      ok: false,
      error: "Geolocation is not supported in this environment",
    };
  }

  return new Promise((resolve) => {
    let finished = false;

    const onSuccess = (pos) => {
      if (finished) return;
      finished = true;
      resolve({
        ok: true,
        coords: {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        },
      });
    };

    const onError = (err) => {
      if (finished) return;
      finished = true;
      resolve({ ok: false, error: err?.message || String(err) });
    };

    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      timeout,
    });

    // Fallback timeout in case the browser behaves unexpectedly
    setTimeout(() => {
      if (finished) return;
      finished = true;
      resolve({ ok: false, error: "Location request timed out" });
    }, timeout + 500);
  });
};

export const buildMapsLink = (lat, lng) => {
  if (!lat || !lng) return null;
  try {
    const latitude = Number(lat);
    const longitude = Number(lng);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;
    return `https://www.google.com/maps?q=${latitude},${longitude}`;
  } catch (e) {
    return null;
  }
};

export const isValidCoordinate = (lat, lng) => {
  const latitude = Number(lat);
  const longitude = Number(lng);
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
};

export const sanitizeCoordinates = (coordsArray) => {
  if (!Array.isArray(coordsArray)) return [];
  
  return coordsArray.reduce((acc, coord) => {
    if (!coord) return acc;
    
    let lat, lng;
    if (Array.isArray(coord) && coord.length >= 2) {
      lat = coord[0];
      lng = coord[1];
    } else if (typeof coord === "object" && "lat" in coord && "lng" in coord) {
      lat = coord.lat;
      lng = coord.lng;
    } else {
      return acc;
    }

    if (isValidCoordinate(lat, lng)) {
      acc.push([Number(lat), Number(lng)]);
    }
    
    return acc;
  }, []);
};

export const getSafeBounds = (coordsArray, defaultCenter = [14.6091, 121.0223], defaultZoom = 13) => {
  const sanitized = sanitizeCoordinates(coordsArray);
  
  if (sanitized.length === 0) {
    return {
      isValid: false,
      center: defaultCenter,
      zoom: defaultZoom,
      bounds: null
    };
  }
  
  if (sanitized.length === 1) {
    return {
      isValid: true,
      center: sanitized[0],
      zoom: defaultZoom,
      bounds: [sanitized[0], sanitized[0]]
    };
  }

  const lats = sanitized.map(c => c[0]);
  const lngs = sanitized.map(c => c[1]);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  return {
    isValid: true,
    center: [(minLat + maxLat) / 2, (minLng + maxLng) / 2],
    bounds: [[minLat, minLng], [maxLat, maxLng]]
  };
};

export default {
  getCurrentLocation,
  buildMapsLink,
  isValidCoordinate,
  sanitizeCoordinates,
  getSafeBounds,
};
