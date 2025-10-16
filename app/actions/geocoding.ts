"use server"

export async function searchLocations(query: string) {
  const accessToken = process.env.MAPBOX_ACCESS_TOKEN

  if (!accessToken) {
    throw new Error("Mapbox access token not configured")
  }

  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        query,
      )}.json?access_token=${accessToken}&types=place,locality&limit=5`,
    )

    if (!response.ok) {
      throw new Error("Failed to fetch location suggestions")
    }

    const data = await response.json()
    return data.features || []
  } catch (error) {
    console.error("Error fetching location suggestions:", error)
    return []
  }
}

export async function getMapboxToken() {
  const accessToken = process.env.MAPBOX_ACCESS_TOKEN

  if (!accessToken) {
    throw new Error("Mapbox access token not configured")
  }

  return accessToken
}
