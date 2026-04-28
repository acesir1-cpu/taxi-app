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
  html: `
    <div style="width:26px;height:26px;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 2px 6px rgba(0,0,0,.28));">
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5.2 8.7h13.6c.5 0 1 .3 1.2.8l1.6 4.2v4.1c0 .6-.4 1-1 1h-1.1a2.3 2.3 0 0 1-4.6 0H9.1a2.3 2.3 0 0 1-4.6 0H3.4c-.6 0-1-.4-1-1v-4.1L4 9.5c.2-.5.7-.8 1.2-.8Z" fill="#FFC400" stroke="#071527" stroke-width="1.6" stroke-linejoin="round"/>
        <path d="M7.2 10.6h9.6l1.1 2.9H6.1l1.1-2.9Z" fill="#0F172A" fill-opacity=".18"/>
        <circle cx="6.8" cy="18.6" r="1.4" fill="#071527"/>
        <circle cx="17.2" cy="18.6" r="1.4" fill="#071527"/>
      </svg>
    </div>
  `,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
})
