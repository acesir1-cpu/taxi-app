# UrbanFlow Taxi — putnička aplikacija (MVP)

Moderan frontend za naručivanje taksi vožnji u Sarajevu, s potpuno simuliranim backendom (`localStorage`, mock API, kašnjenja, GPS animacija).

## Pokretanje

```bash
npm install
npm run dev
```

Zatim otvorite URL koji Vite ispiše (obično `http://localhost:5173`).

## Demo pristup

- **E-mail:** `korisnik@urbanflow.ba`
- **Lozinka:** `Test12345`
- **Verifikacija (nakon registracije):** `123456`

Google prijava je simulirana (bez pravog OAuth-a).

## Funkcionalnosti

- Registracija, verifikacija koda, prijava, simulacija Google prijave
- Naručivanje vožnje (odmah / zakazivanje), procjena cijene, ruta na karti (OpenStreetMap + Leaflet)
- Dodjela najbližeg slobodnog vozača, praćenje statusa i animacija vozača
- Potvrda ulaska, otkazivanje s razlogom, završetak i ocjena
- Historija, detalji, ponavljanje vožnje, prijava problema
- Profil, politika privatnosti, obavještenja, demo kontrole na ekranu aktivne vožnje

## Tehnologije

React 19, TypeScript, Vite, Tailwind CSS, TanStack Query, Zustand (toast), Zod, React Hook Form, Framer Motion, Leaflet / React-Leaflet, Lucide.

## Napomena

Ovo je isključivo frontend demonstracija — nema pravog SMS-a, plaćanja ni serverskog API-ja.
