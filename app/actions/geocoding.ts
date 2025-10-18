"use server"

// Type definitions for Nominatim API responses
interface NominatimResult {
  display_name: string;
  lon: string;
  lat: string;
  boundingbox?: string[];
  type: string;
}

interface GeoJSONGeometry {
  type: string;
  coordinates: number[] | number[][] | number[][][] | number[][][][];
}

// Use OpenStreetMap Nominatim API for geocoding (FREE!)
export async function searchLocations(query: string) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'AdGeenie-LocationTargeting/1.0'
        }
      }
    )

    if (!response.ok) {
      throw new Error("Failed to fetch location suggestions from OpenStreetMap")
    }

    const data = await response.json() as NominatimResult[]
    
    // Convert Nominatim format to our expected format
    return data.map((item) => ({
      place_name: item.display_name,
      center: [parseFloat(item.lon), parseFloat(item.lat)],
      bbox: item.boundingbox ? [
        parseFloat(item.boundingbox[2]), // minLng
        parseFloat(item.boundingbox[0]), // minLat
        parseFloat(item.boundingbox[3]), // maxLng
        parseFloat(item.boundingbox[1])  // maxLat
      ] : null,
      place_type: [item.type],
    }))
  } catch (error) {
    console.error("Error fetching location suggestions from OpenStreetMap:", error)
    return []
  }
}

// Fetch detailed boundary data using OpenStreetMap Nominatim API (FREE!)
export async function getLocationBoundary(coordinates: [number, number], placeName: string) {
  try {
    // Use Nominatim to search for the place with polygon data
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(placeName)}&format=geojson&polygon_geojson=1&limit=1`,
      {
        headers: {
          'User-Agent': 'AdGeenie-LocationTargeting/1.0' // Required by Nominatim
        }
      }
    )

    if (!response.ok) {
      console.error("Failed to fetch boundary from Nominatim OSM")
      return null
    }

    const data = await response.json()
    
    if (data.features && data.features.length > 0) {
      const feature = data.features[0]
      
      if (feature.geometry) {
        // Calculate bbox from geometry if not provided
        const bbox = feature.bbox 
          ? [feature.bbox[0], feature.bbox[1], feature.bbox[2], feature.bbox[3]]
          : calculateBBoxFromGeometry(feature.geometry)
        
        console.log(`✅ Got boundary geometry from OpenStreetMap for ${placeName}`)
        
        return {
          geometry: feature.geometry,
          bbox: bbox as [number, number, number, number] | null,
          adminLevel: 8,
          source: 'OpenStreetMap'
        }
      }
    }

    console.warn(`⚠️ No boundary geometry found for ${placeName}`)
    return null
  } catch (error) {
    console.error("Error fetching boundary from OpenStreetMap:", error)
    return null
  }
}

// Helper function to calculate bounding box from GeoJSON geometry
function calculateBBoxFromGeometry(geometry: GeoJSONGeometry): [number, number, number, number] | null {
  if (!geometry || !geometry.coordinates) return null

  let minLng = Infinity, minLat = Infinity
  let maxLng = -Infinity, maxLat = -Infinity

  const processCoords = (coords: number[] | number[][] | number[][][] | number[][][][]): void => {
    if (typeof coords[0] === 'number') {
      // Type assertion after runtime check - it's a coordinate pair [lng, lat]
      const [lng, lat] = coords as number[]
      minLng = Math.min(minLng, lng)
      maxLng = Math.max(maxLng, lng)
      minLat = Math.min(minLat, lat)
      maxLat = Math.max(maxLat, lat)
    } else {
      // It's an array of coordinates, recurse
      (coords as (number[] | number[][] | number[][][] | number[][][][])[]).forEach(c => processCoords(c))
    }
  }

  processCoords(geometry.coordinates)

  if (minLng === Infinity) return null
  return [minLng, minLat, maxLng, maxLat]
}

// No longer needed - OpenStreetMap is free and doesn't require tokens!
