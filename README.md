# UrbanFlow Taxi

**Verzija:** v3

## Demo pristup

- **E-mail:** `korisnik@urbanflow.ba`
- **Lozinka:** `Test12345`
- **Verifikacija (nakon registracije):** `123456`

Google prijava je simulirana (bez pravog OAuth-a). Nakon prijave aplikacija preusmjerava na **putnički** ili **vozački** interfejs ovisno o tipu računa u mock bazi.

## Funkcionalnosti

### Putnik

- Registracija, verifikacija koda, prijava, reset lozinke, simulacija Google prijave
- Naručivanje vožnje (odmah / zakazivanje), procjena cijene, ruta na karti (OpenStreetMap + Leaflet)
- Dodjela najbližeg slobodnog vozača, praćenje statusa i animacija vozača
- Potvrda ulaska, otkazivanje s razlogom, završetak i ocjena
- Historija, detalji, zakazane vožnje, ponavljanje vožnje, prijava problema
- Profil, politika privatnosti, obavještenja, demo kontrole na ekranu aktivne vožnje

### Vozač

- Zaseban shell (mobilni layout): kontrolna tabla, status smjene, statistike
- Aktivna vožnja s kartom, tok prihvata/odbijanja, završetak i sažetak
- Historija vožnji, pregled zarade, postavke vozača
- Demo / simulacija (npr. nova vožnja, animacija rute) za prezentaciju bez backend-a

## Tehnologije

React 19, TypeScript, Vite 8, Tailwind CSS, TanStack Query, Zustand, Zod, React Hook Form, Framer Motion, React Router 7, Leaflet / React-Leaflet, Lucide.

## Napomena

Ovo je isključivo frontend demonstracija, nema pravog SMS-a, plaćanja ni serverskog API-ja. Rute i podaci su mock / lokalni ili preko simuliranih servisa.
