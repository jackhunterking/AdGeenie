"use client"

import { useState, useEffect, useRef } from "react"
import { MapPin, Plus, X, Search, Pencil, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { searchLocations, getMapboxToken } from "@/app/actions/geocoding"

declare global {
  interface Window {
    mapboxgl: any
  }
}

interface Location {
  id: string
  name: string
  coordinates: [number, number]
  radius: number
}

export function LocationTargeting() {
  const [locations, setLocations] = useState<Location[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [selectedLocation, setSelectedLocation] = useState<{
    name: string
    coordinates: [number, number]
  } | null>({
    name: "Toronto, Ontario, Canada",
    coordinates: [-79.3832, 43.6532],
  })
  const [radius, setRadius] = useState(30) // Changed default radius from 25 to 30
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null)
  const [editSearchQuery, setEditSearchQuery] = useState("")
  const [editSuggestions, setEditSuggestions] = useState<any[]>([])
  const [editSelectedLocation, setEditSelectedLocation] = useState<{
    name: string
    coordinates: [number, number]
  } | null>(null)
  const [editRadius, setEditRadius] = useState(30) // Changed default radius from 25 to 30
  const [showEditSuggestions, setShowEditSuggestions] = useState(false)
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const [isEditMapLoaded, setIsEditMapLoaded] = useState(false)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const editMapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const editMapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const editMarkerRef = useRef<any>(null)
  const circleRef = useRef<any>(null)
  const editCircleRef = useRef<any>(null)
  const isSelectingRef = useRef(false)
  const isEditSelectingRef = useRef(false)

  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return

    const initMap = async () => {
      if (!window.mapboxgl) {
        setTimeout(initMap, 100)
        return
      }

      try {
        const accessToken = await getMapboxToken()

        console.log("[v0] Initializing Mapbox map...")
        window.mapboxgl.accessToken = accessToken

        if (!mapRef.current && mapContainerRef.current) {
          mapRef.current = new window.mapboxgl.Map({
            container: mapContainerRef.current,
            style: "mapbox://styles/mapbox/dark-v11",
            center: [-79.3832, 43.6532], // Toronto coordinates
            zoom: 9, // Appropriate zoom for 30 mile radius
          })

          mapRef.current.on("load", () => {
            console.log("[v0] Map loaded successfully")
            setIsMapLoaded(true)
          })

          mapRef.current.on("error", (e: any) => {
            console.log("[v0] Map error:", e)
          })
        }
      } catch (error) {
        console.log("[v0] Error fetching Mapbox token:", error)
      }
    }

    initMap()

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      setIsMapLoaded(false)
    }
  }, [])

  useEffect(() => {
    if (isSelectingRef.current) {
      isSelectingRef.current = false
      return
    }

    const searchTimeout = setTimeout(async () => {
      if (searchQuery.length > 2) {
        const results = await searchLocations(searchQuery)
        setSuggestions(results)
        setShowSuggestions(true)
      } else {
        setSuggestions([])
        setShowSuggestions(false)
      }
    }, 300)

    return () => clearTimeout(searchTimeout)
  }, [searchQuery])

  useEffect(() => {
    if (isEditSelectingRef.current) {
      isEditSelectingRef.current = false
      return
    }

    const searchTimeout = setTimeout(async () => {
      if (editSearchQuery.length > 2) {
        const results = await searchLocations(editSearchQuery)
        setEditSuggestions(results)
        setShowEditSuggestions(true)
      } else {
        setEditSuggestions([])
        setShowEditSuggestions(false)
      }
    }, 300)

    return () => clearTimeout(searchTimeout)
  }, [editSearchQuery])

  useEffect(() => {
    if (typeof window === "undefined" || !editMapContainerRef.current || !showEditModal) return

    const initMap = async () => {
      if (!window.mapboxgl) {
        setTimeout(initMap, 100)
        return
      }

      try {
        const accessToken = await getMapboxToken()
        window.mapboxgl.accessToken = accessToken

        if (!editMapRef.current && editMapContainerRef.current) {
          editMapRef.current = new window.mapboxgl.Map({
            container: editMapContainerRef.current,
            style: "mapbox://styles/mapbox/dark-v11",
            center: editSelectedLocation?.coordinates || [-98.5795, 39.8283],
            zoom: editSelectedLocation ? getZoomLevel(editRadius) : 3,
          })

          editMapRef.current.on("load", () => {
            setIsEditMapLoaded(true)
          })
        }
      } catch (error) {
        console.log("[v0] Error fetching Mapbox token for edit map:", error)
      }
    }

    initMap()

    return () => {
      if (editMapRef.current) {
        editMapRef.current.remove()
        editMapRef.current = null
      }
      setIsEditMapLoaded(false)
    }
  }, [showEditModal])

  useEffect(() => {
    if (!selectedLocation || !mapRef.current || !window.mapboxgl || !isMapLoaded) return

    console.log("[v0] Updating map with location:", selectedLocation.name)

    // Remove existing marker
    if (markerRef.current) {
      markerRef.current.remove()
    }

    // Remove existing circle layers
    if (mapRef.current.getLayer("radius-circle")) {
      mapRef.current.removeLayer("radius-circle")
    }
    if (mapRef.current.getLayer("radius-circle-outline")) {
      mapRef.current.removeLayer("radius-circle-outline")
    }
    if (mapRef.current.getSource("radius-circle")) {
      mapRef.current.removeSource("radius-circle")
    }

    const markerElement = document.createElement("div")
    markerElement.className = "custom-marker"
    markerElement.style.width = "32px"
    markerElement.style.height = "32px"
    markerElement.style.borderRadius = "50%"
    markerElement.style.backgroundColor = "#4B73FF"
    markerElement.style.border = "3px solid white"
    markerElement.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)"
    markerElement.style.display = "flex"
    markerElement.style.alignItems = "center"
    markerElement.style.justifyContent = "center"
    markerElement.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    `

    // Add new marker with custom element
    markerRef.current = new window.mapboxgl.Marker({ element: markerElement })
      .setLngLat(selectedLocation.coordinates)
      .addTo(mapRef.current)

    // Create and add radius circle
    const radiusInMeters = radius * 1609.34
    const circle = createGeoJSONCircle(selectedLocation.coordinates, radiusInMeters)

    mapRef.current.addSource("radius-circle", {
      type: "geojson",
      data: circle,
    })

    mapRef.current.addLayer({
      id: "radius-circle",
      type: "fill",
      source: "radius-circle",
      paint: {
        "fill-color": "#4B73FF",
        "fill-opacity": 0.15, // Lighter opacity like Meta Ads Manager
      },
    })

    mapRef.current.addLayer({
      id: "radius-circle-outline",
      type: "line",
      source: "radius-circle",
      paint: {
        "line-color": "#4B73FF",
        "line-width": 2,
        "line-opacity": 0.6,
      },
    })

    mapRef.current.easeTo({
      center: selectedLocation.coordinates,
      zoom: getZoomLevel(radius),
      duration: 800,
      easing: (t: number) => t * (2 - t), // Ease out quad for smooth deceleration
    })

    console.log("[v0] Map updated with marker and radius circle")
  }, [selectedLocation, radius, isMapLoaded])

  useEffect(() => {
    if (!editSelectedLocation || !editMapRef.current || !window.mapboxgl || !showEditModal || !isEditMapLoaded) return

    if (editMarkerRef.current) editMarkerRef.current.remove()
    if (editCircleRef.current && editMapRef.current.getLayer("edit-radius-circle")) {
      editMapRef.current.removeLayer("edit-radius-circle")
      editMapRef.current.removeLayer("edit-radius-circle-outline")
      editMapRef.current.removeSource("edit-radius-circle")
    }

    editMarkerRef.current = new window.mapboxgl.Marker({ color: "#F59E0B" })
      .setLngLat(editSelectedLocation.coordinates)
      .addTo(editMapRef.current)

    const radiusInMeters = editRadius * 1609.34
    const circle = createGeoJSONCircle(editSelectedLocation.coordinates, radiusInMeters)

    editMapRef.current.addSource("edit-radius-circle", {
      type: "geojson",
      data: circle,
    })

    editMapRef.current.addLayer({
      id: "edit-radius-circle",
      type: "fill",
      source: "edit-radius-circle",
      paint: {
        "fill-color": "#F59E0B",
        "fill-opacity": 0.2,
      },
    })

    editMapRef.current.addLayer({
      id: "edit-radius-circle-outline",
      type: "line",
      source: "edit-radius-circle",
      paint: {
        "line-color": "#F59E0B",
        "line-width": 2,
      },
    })

    editMapRef.current.easeTo({
      center: editSelectedLocation.coordinates,
      zoom: getZoomLevel(editRadius),
      duration: 800,
      easing: (t: number) => t * (2 - t),
    })

    editCircleRef.current = true
  }, [editSelectedLocation, editRadius, showEditModal, isEditMapLoaded])

  const createGeoJSONCircle = (center: [number, number], radiusInMeters: number) => {
    const points = 64
    const coords = {
      latitude: center[1],
      longitude: center[0],
    }

    const km = radiusInMeters / 1000
    const ret = []
    const distanceX = km / (111.32 * Math.cos((coords.latitude * Math.PI) / 180))
    const distanceY = km / 110.574

    for (let i = 0; i < points; i++) {
      const theta = (i / points) * (2 * Math.PI)
      const x = distanceX * Math.cos(theta)
      const y = distanceY * Math.sin(theta)
      ret.push([coords.longitude + x, coords.latitude + y])
    }
    ret.push(ret[0])

    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [ret],
          },
        },
      ],
    }
  }

  const getZoomLevel = (miles: number) => {
    // Lower base zoom and more aggressive adjustment for better visibility of areas outside the radius
    const baseZoom = 8 // Lowered from 9 to provide more padding
    const baseMiles = 30
    const zoomAdjustment = Math.log2(baseMiles / miles) * 1.2 // Multiply by 1.2 for more responsive zoom changes
    return Math.max(6, Math.min(10, baseZoom + zoomAdjustment))
  }

  const handleSelectSuggestion = (suggestion: any) => {
    isSelectingRef.current = true
    setSelectedLocation({
      name: suggestion.place_name,
      coordinates: suggestion.center,
    })
    setSearchQuery(suggestion.place_name)
    setSuggestions([])
    setShowSuggestions(false)
  }

  const handleSelectEditSuggestion = (suggestion: any) => {
    isEditSelectingRef.current = true
    setEditSelectedLocation({
      name: suggestion.place_name,
      coordinates: suggestion.center,
    })
    setEditSearchQuery(suggestion.place_name)
    setEditSuggestions([])
    setShowEditSuggestions(false)
  }

  const handleAddLocation = () => {
    if (!selectedLocation) return

    const newLocation: Location = {
      id: Date.now().toString(),
      name: selectedLocation.name,
      coordinates: selectedLocation.coordinates,
      radius,
    }
    setLocations([...locations, newLocation])

    setSearchQuery("")
    setSelectedLocation({
      name: "Toronto, Ontario, Canada",
      coordinates: [-79.3832, 43.6532],
    })
    setRadius(30)
  }

  const handleUpdateLocation = () => {
    if (!editSelectedLocation || !editingLocationId) return

    setLocations(
      locations.map((loc) =>
        loc.id === editingLocationId
          ? {
              ...loc,
              name: editSelectedLocation.name,
              coordinates: editSelectedLocation.coordinates,
              radius: editRadius,
            }
          : loc,
      ),
    )

    setEditingLocationId(null)
    setEditSearchQuery("")
    setEditSelectedLocation(null)
    setEditRadius(30)
    setShowEditModal(false)
  }

  const handleEditLocation = (location: Location) => {
    setEditingLocationId(location.id)
    setEditSelectedLocation({
      name: location.name,
      coordinates: location.coordinates,
    })
    setEditSearchQuery(location.name)
    setEditRadius(location.radius)
    setShowEditModal(true)
  }

  const handleCancelEdit = () => {
    setEditingLocationId(null)
    setEditSearchQuery("")
    setEditSelectedLocation(null)
    setEditRadius(30) // Reset to default 30 miles
    setShowEditModal(false)
  }

  const handleRemoveLocation = (id: string) => {
    setLocations(locations.filter((loc) => loc.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4 border-transparent bg-transparent">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <Target className="h-4 w-4 text-purple-600" />
          </div>
          <h3 className="font-semibold text-lg">Target a Location</h3>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-600" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for a city..."
              className="pl-10 bg-background border-input focus:border-purple-500 focus:ring-purple-500 h-9 text-sm"
            />

            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-2 rounded-lg border border-border dropdown-surface shadow-lg overflow-hidden">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectSuggestion(suggestion)}
                    className="w-full px-3 py-2 text-left hover-surface transition-colors border-b border-border last:border-b-0"
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs">{suggestion.place_name}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedLocation && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium">Radius</label>
                <span className="text-xs text-muted-foreground">{radius} miles</span>
              </div>
              <Slider
                value={[radius]}
                onValueChange={(value) => setRadius(value[0])}
                min={10}
                max={50}
                step={5}
                className="w-full [&_[role=slider]]:bg-purple-600 [&_[role=slider]]:border-purple-600 [&_.bg-primary]:bg-purple-600"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>10 miles</span>
                <span>50 miles</span>
              </div>
            </div>
          )}

          <div className="rounded-lg overflow-hidden border border-border panel-surface">
            <div ref={mapContainerRef} className="w-full h-[300px]" />
          </div>

          {selectedLocation && (
            <Button
              onClick={handleAddLocation}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white h-9 text-sm"
            >
              <Plus className="h-3.5 w-3.5 mr-2" />
              Target a Location
            </Button>
          )}
        </div>
      </div>

      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-amber-500/50 panel-surface p-6 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Pencil className="h-5 w-5 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold">Edit Location</h3>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-600" />
                <Input
                  value={editSearchQuery}
                  onChange={(e) => setEditSearchQuery(e.target.value)}
                  placeholder="Search for a city..."
                  className="pl-10 bg-background border-input focus:border-purple-500 focus:ring-purple-500 h-11"
                />

                {showEditSuggestions && editSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-2 rounded-lg border border-border dropdown-surface shadow-lg overflow-hidden">
                    {editSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSelectEditSuggestion(suggestion)}
                        className="w-full px-4 py-3 text-left hover-surface transition-colors border-b border-border last:border-b-0"
                      >
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm">{suggestion.place_name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {editSelectedLocation && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Radius</label>
                    <span className="text-sm text-muted-foreground">{editRadius} miles</span>
                  </div>
                  <Slider
                    value={[editRadius]}
                    onValueChange={(value) => setEditRadius(value[0])}
                    min={10}
                    max={50}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>10 miles</span>
                    <span>50 miles</span>
                  </div>
                </div>
              )}

              <div className="rounded-lg overflow-hidden border border-border panel-surface">
                <div ref={editMapContainerRef} className="w-full h-[400px]" />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleUpdateLocation}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white h-11"
                >
                  Update Location
                </Button>
                <Button
                  onClick={handleCancelEdit}
                  variant="outline"
                  className="h-11"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {locations.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-base font-semibold mb-3">Targeted Locations ({locations.length})</h3>
          <div className="space-y-2">
            {locations.map((location) => (
              <div
                key={location.id}
                className="flex items-center justify-between p-3 rounded-lg panel-surface hover:border-accent transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-xs">{location.name}</p>
                    <p className="text-xs text-muted-foreground">{location.radius} mile radius</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditLocation(location)}
                    className="h-7 w-7 text-muted-foreground hover:text-foreground hover-surface"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveLocation(location.id)}
                    className="h-7 w-7 text-muted-foreground hover:text-foreground hover-surface"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
