import L from 'leaflet'

export const pickupIcon = L.divIcon({
  className: 'uf-marker',
  html: '<div style="width:16px;height:16px;border-radius:9999px;background:#14B8A6;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.2)"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

export const destIcon = L.divIcon({
  className: 'uf-marker',
  html: '<div style="width:16px;height:16px;border-radius:9999px;background:#EF4444;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.2)"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

export const driverIcon = L.divIcon({
  className: 'uf-marker',
  html: '<div style="width:16px;height:16px;border-radius:9999px;background:#FFC400;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.2)"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})
