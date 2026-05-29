# UAT — Test prihvatljivosti korisnika · UrbanFlow Taxi (v3)

> **Napomena o boji (za zajednički dokument):** ako se testovi spajaju u zajednički Google/Word dokument, ovaj set označiti bojom **ZELENA**.
>
> **Status modula:**
> - ✅ **1. Autentifikacija korisnika (TC_AUTH)** — ovaj dokument (14 test caseova) — svi PASS.
> - ✅ **2. Upravljanje vožnjama (TC_RIDE)** — ovaj dokument (30 test caseova) — svi PASS.
> - ✅ **3. Upravljanje vozačima (TC_DRIVER)** — ovaj dokument (15 test caseova) — svi PASS.
> - ✅ **4. Dispečerski tok (TC_DISPATCH)** — ovaj dokument (15 test caseova) — svi PASS.
> - ✅ **5. UI/UX i validacije (TC_UIUX)** — ovaj dokument (15 test caseova) — svi PASS.
>
> **UKUPNO u ovom dokumentu: 89 test caseova — svi izvršeni i prošli (PASS).**

---

## Pristupni podaci (za izvođenje testova)

| Uloga | E-mail | Lozinka | Napomena |
|---|---|---|---|
| Putnik | `korisnik@urbanflow.ba` | `Test12345` | Verifikacijski kod (nakon registracije): `123456` |
| Vozač | `vozac@urbanflow.ba` | `Test12345` | Vozački interfejs (mobilni layout) |
| Dispečer | `dispecer@urbanflow.ba` | `Test12345` | Uloga: **Šef smjene** (pune ovlasti) |

**Dostupne lokacije u aplikaciji:** Baščaršija, Marijin Dvor, Grbavica, Ilidža, Aerodrom Sarajevo, Centar, BCC, Otoka, Vogošća, Alipašino Polje, Stup, Dobrinja, Koševo. Adresa se može unijeti i ručno (npr. „Maršala Tita 54, Sarajevo"), odabrati na karti ili preko trenutne GPS lokacije.

**Legenda statusa testa:** `PASS` · `FAIL` · `BLOCKED` · `NOT EXECUTED`

**Konvencija imenovanja screenshot dokaza:** `Slika 23.[redni_broj]: [ID_testa]_[Kratak_opis]`
(underscore umjesto razmaka, bez dijakritike, opis 3–4 riječi). TC_AUTH zauzima `Slika 23.1`–`23.14`, a TC_RIDE nastavlja od `Slika 23.15`.

---

# MODUL 1 — Autentifikacija korisnika (TC_AUTH)

---

### TC_AUTH_001 — Registracija novog naloga
- **Tip:** Pozitivan
- **Poslovni zahtjev:** Novi korisnik mora moći kreirati putnički nalog.
- **Kriteriji prihvatanja:** Nalog se kreira i korisnik se vodi na verifikaciju; prikazuje se potvrda o kreiranju.
- **Testni scenarij:**
  1. Na početnom ekranu kliknuti **„Registruj se"**.
  2. Unijeti Ime, Prezime, E-mail, Telefon i Lozinku.
  3. Označiti prihvatanje uslova i politike privatnosti.
  4. Kliknuti **„Registruj se"**.
- **Testni podaci:** Ime: Ajla; Prezime: Testić; E-mail: `ajla.test@example.com`; Telefon: `61222333`; Lozinka: `Test12345`.
- **Očekivani rezultat:** Nalog je kreiran (status neaktivan do verifikacije); aplikacija otvara ekran „Verifikacija"; obavještenje „Račun kreiran".
- **Stvarni rezultat:** Nalog je kreiran i aplikacija je otvorila ekran „Verifikacija"; prikazana je potvrda o kreiranju računa.
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.1: TC_AUTH_001_Registracija_naloga

### TC_AUTH_002 — Registracija s postojećim e-mailom/telefonom (negativan)
- **Tip:** Negativan
- **Poslovni zahtjev:** Sistem ne smije dozvoliti dvije registracije s istim e-mailom ili telefonom.
- **Kriteriji prihvatanja:** Registracija se odbija uz poruku da račun već postoji.
- **Testni scenarij:**
  1. Otvoriti „Registruj se".
  2. Unijeti podatke s već postojećim e-mailom.
  3. Pokušati registraciju.
- **Testni podaci:** E-mail: `korisnik@urbanflow.ba` (postojeći).
- **Očekivani rezultat:** Registracija se ne izvršava; poruka „Račun s ovim e-mailom ili telefonom već postoji.".
- **Stvarni rezultat:** Registracija je odbijena; prikazana je poruka „Račun s ovim e-mailom ili telefonom već postoji.".
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.2: TC_AUTH_002_Postojeci_nalog_greska

### TC_AUTH_003 — Validacija polja pri registraciji (negativan)
- **Tip:** Negativan
- **Poslovni zahtjev:** Registracija mora validirati format e-maila/telefona, dužinu lozinke i prihvatanje uslova.
- **Kriteriji prihvatanja:** Nevažeći unosi prikazuju validacijske poruke; bez prihvatanja uslova registracija nije moguća.
- **Testni scenarij:**
  1. Otvoriti „Registruj se".
  2. Unijeti prekratku lozinku (npr. „123") i neispravan e-mail.
  3. Ne označiti prihvatanje uslova i pokušati registraciju.
- **Testni podaci:** E-mail: `nije-email`; Lozinka: `123`; uslovi neoznačeni.
- **Očekivani rezultat:** Prikazane poruke „Neispravan e-mail", „Minimum 8 znakova" i „Morate prihvatiti uslove i politiku privatnosti."; registracija blokirana.
- **Stvarni rezultat:** Prikazane su validacijske poruke za e-mail, dužinu lozinke i prihvatanje uslova; registracija je blokirana.
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.3: TC_AUTH_003_Validacija_registracije

### TC_AUTH_004 — Verifikacija ispravnim kodom
- **Tip:** Pozitivan
- **Poslovni zahtjev:** Korisnik mora aktivirati nalog unosom verifikacijskog koda.
- **Kriteriji prihvatanja:** Ispravan kod aktivira nalog i prijavljuje korisnika u aplikaciju.
- **Testni scenarij:**
  1. Nakon registracije, na ekranu „Verifikacija" unijeti kod.
  2. Kliknuti **„Potvrdi"**.
- **Testni podaci:** Verifikacijski kod: `123456`.
- **Očekivani rezultat:** Nalog aktiviran; korisnik prijavljen i preusmjeren na putničku početnu („Naruči"); obavještenje „Račun aktiviran".
- **Stvarni rezultat:** Nakon unosa koda `123456` nalog je aktiviran, korisnik je prijavljen i preusmjeren na „Naruči".
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.4: TC_AUTH_004_Verifikacija_kod

### TC_AUTH_005 — Verifikacija pogrešnim kodom (negativan)
- **Tip:** Negativan
- **Poslovni zahtjev:** Nalog se ne smije aktivirati pogrešnim verifikacijskim kodom.
- **Kriteriji prihvatanja:** Pogrešan kod prikazuje grešku; nalog ostaje neaktivan.
- **Testni scenarij:**
  1. Na ekranu „Verifikacija" unijeti pogrešan kod.
  2. Kliknuti „Potvrdi".
- **Testni podaci:** Kod: `000000`.
- **Očekivani rezultat:** Poruka „Pogrešan verifikacijski kod."; nalog ostaje neaktivan.
- **Stvarni rezultat:** Prikazana je poruka „Pogrešan verifikacijski kod."; nalog je ostao neaktivan.
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.5: TC_AUTH_005_Pogresan_kod_greska

### TC_AUTH_006 — Prijava s validnim podacima
- **Tip:** Pozitivan
- **Poslovni zahtjev:** Registrovani korisnik mora se moći prijaviti e-mailom/telefonom i lozinkom.
- **Kriteriji prihvatanja:** Ispravni podaci prijavljuju korisnika i otvaraju odgovarajući interfejs prema ulozi.
- **Testni scenarij:**
  1. Otvoriti ekran „Prijava".
  2. Unijeti e-mail/telefon i lozinku.
  3. Kliknuti **„Prijavi se"**.
- **Testni podaci:** `korisnik@urbanflow.ba` / `Test12345`.
- **Očekivani rezultat:** Uspješna prijava; preusmjerenje na putničku početnu („Naruči"); obavještenje „Uspješna prijava.".
- **Stvarni rezultat:** Prijava je uspjela; korisnik je preusmjeren na „Naruči" i prikazano je obavještenje „Uspješna prijava.".
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.6: TC_AUTH_006_Prijava_validna

### TC_AUTH_007 — Prijava s neispravnim podacima (negativan)
- **Tip:** Negativan
- **Poslovni zahtjev:** Prijava ne smije uspjeti s pogrešnom lozinkom/podacima.
- **Kriteriji prihvatanja:** Sistem odbija prijavu uz jasnu poruku; korisnik ostaje na ekranu prijave.
- **Testni scenarij:**
  1. Otvoriti „Prijava".
  2. Unijeti ispravan e-mail i pogrešnu lozinku.
  3. Kliknuti „Prijavi se".
- **Testni podaci:** `korisnik@urbanflow.ba` / `pogresna`.
- **Očekivani rezultat:** Prijava odbijena; poruka „Neispravni podaci za prijavu.".
- **Stvarni rezultat:** Prijava je odbijena; prikazana je poruka „Neispravni podaci za prijavu.".
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.7: TC_AUTH_007_Prijava_neispravna

### TC_AUTH_008 — Uspješna odjava
- **Tip:** Pozitivan
- **Poslovni zahtjev:** Prijavljeni korisnik mora moći završiti sesiju (odjaviti se).
- **Kriteriji prihvatanja:** Nakon odjave sesija se zatvara i korisnik se vraća na javni (welcome/prijava) ekran.
- **Testni scenarij:**
  1. Prijaviti se kao putnik.
  2. Otvoriti **„Postavke"** (Profil).
  3. Kliknuti **„Odjava"**.
- **Testni podaci:** Putnik `korisnik@urbanflow.ba` / `Test12345`.
- **Očekivani rezultat:** Sesija je zatvorena; aplikacija preusmjerava na početni/welcome ekran sa opcijama „Započni vožnju" / „Registruj se".
- **Stvarni rezultat:** Sesija je zatvorena; aplikacija je preusmjerila na welcome ekran.
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.8: TC_AUTH_008_Uspjesna_odjava

### TC_AUTH_009 — Sesija poništena nakon odjave
- **Tip:** Pozitivan
- **Poslovni zahtjev:** Nakon odjave zaštićeni sadržaj ne smije biti dostupan bez ponovne prijave.
- **Kriteriji prihvatanja:** Pokušaj pristupa zaštićenoj ruti nakon odjave (ili osvježavanje stranice) preusmjerava na welcome.
- **Testni scenarij:**
  1. Odjaviti se (TC_AUTH_008).
  2. U adresnu traku unijeti zaštićenu rutu (npr. `/app/order`) ili pritisnuti „Nazad" u pregledniku.
  3. Osvježiti stranicu.
- **Testni podaci:** Ruta `/app/order` nakon odjave.
- **Očekivani rezultat:** Pristup nije moguć; aplikacija preusmjerava na `/welcome`; nakon osvježavanja korisnik ostaje odjavljen.
- **Stvarni rezultat:** Pristup zaštićenoj ruti nije bio moguć; aplikacija je preusmjerila na `/welcome`, a korisnik je ostao odjavljen i nakon osvježavanja.
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.9: TC_AUTH_009_Sesija_ponistena

### TC_AUTH_010 — Reset lozinke (validan e-mail)
- **Tip:** Pozitivan
- **Poslovni zahtjev:** Korisnik mora moći zatražiti link za resetovanje lozinke.
- **Kriteriji prihvatanja:** Unosom e-maila i potvrdom prikazuje se potvrda o slanju linka.
- **Testni scenarij:**
  1. Na ekranu prijave kliknuti **„Zaboravljena lozinka?"**.
  2. Na ekranu „Reset lozinke" unijeti registrovani e-mail.
  3. Kliknuti **„Pošalji link za resetovanje"**.
- **Testni podaci:** E-mail: `korisnik@urbanflow.ba`.
- **Očekivani rezultat:** Prikazuje se potvrda „Link za resetovanje je poslan (demo)."; dostupan je povratak „Nazad na prijavu".
- **Stvarni rezultat:** Prikazana je potvrda „Link za resetovanje je poslan (demo)." uz dostupan povratak „Nazad na prijavu".
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.10: TC_AUTH_010_Reset_validan_email

### TC_AUTH_011 — Reset lozinke (nepostojeći / prazan e-mail)
- **Tip:** Negativan
- **Poslovni zahtjev:** Zahtjev za reset ne smije otkriti da li nalog s datim e-mailom postoji, niti smije proći s praznim poljem.
- **Kriteriji prihvatanja:** Za nepostojeći (ali ispravno formatiran) e-mail prikazuje se ista generička poruka kao i za postojeći; za prazno polje prikazuje se greška.
- **Testni scenarij:**
  1. Otvoriti „Reset lozinke".
  2. Unijeti neregistrovani e-mail i kliknuti „Pošalji link za resetovanje".
  3. Isprazniti polje i ponovo kliknuti „Pošalji link za resetovanje".
- **Testni podaci:** Nepostojeći e-mail: `nepostoji@urbanflow.ba`; te prazno polje.
- **Očekivani rezultat:** Za nepostojeći e-mail: ista poruka „Link za resetovanje je poslan (demo)." (ne otkriva postojanje naloga). Za prazno polje: greška „Unesite e-mail adresu.".
- **Stvarni rezultat:** Za neregistrovani e-mail prikazana je ista generička poruka (bez otkrivanja postojanja naloga); za prazno polje prikazana je greška „Unesite e-mail adresu.".
- **Status:** PASS
- **Komentari/poboljšanja:** Aplikacija (demo) ne validira stvarno postojanje naloga — generička poruka je očekivano ponašanje radi privatnosti. Nema uočenih problema.
- **Screenshot:** Slika 23.11: TC_AUTH_011_Reset_nepostojeci_email

### TC_AUTH_012 — Putnik ne može pristupiti vozačkom panelu
- **Tip:** Negativan
- **Poslovni zahtjev:** Pristup vozačkom interfejsu mora biti ograničen na korisnike s ulogom vozača.
- **Kriteriji prihvatanja:** Prijavljeni putnik koji pokuša otvoriti vozačku rutu biva preusmjeren u putnički interfejs.
- **Testni scenarij:**
  1. Prijaviti se kao putnik.
  2. U adresnu traku unijeti vozačku rutu `/driver`.
- **Testni podaci:** Putnik `korisnik@urbanflow.ba`; ruta `/driver`.
- **Očekivani rezultat:** Pristup je odbijen; aplikacija preusmjerava na `/app/order` (putnička početna); vozački panel nije prikazan.
- **Stvarni rezultat:** Pristup je odbijen; aplikacija je preusmjerila putnika na `/app/order`, a vozački panel nije prikazan.
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.12: TC_AUTH_012_Putnik_bez_vozackog

### TC_AUTH_013 — Vozač ne može naručiti vožnju
- **Tip:** Negativan
- **Poslovni zahtjev:** Naručivanje vožnje dostupno je samo putnicima; vozač nema pristup putničkom toku narudžbe.
- **Kriteriji prihvatanja:** Prijavljeni vozač koji pokuša otvoriti putničku rutu narudžbe biva preusmjeren na vozačku početnu.
- **Testni scenarij:**
  1. Prijaviti se kao vozač.
  2. U adresnu traku unijeti putničku rutu `/app/order`.
- **Testni podaci:** Vozač `vozac@urbanflow.ba`; ruta `/app/order`.
- **Očekivani rezultat:** Pristup je odbijen; aplikacija preusmjerava na `/driver` (vozačka početna); ekran naručivanja nije dostupan.
- **Stvarni rezultat:** Pristup je odbijen; aplikacija je preusmjerila vozača na `/driver`, a ekran naručivanja nije bio dostupan.
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.13: TC_AUTH_013_Vozac_bez_narudzbe

### TC_AUTH_014 — Gost nema pristup zaštićenom sadržaju
- **Tip:** Negativan
- **Poslovni zahtjev:** Neautentificirani korisnik (gost) ne smije pristupiti zaštićenom sadržaju aplikacije.
- **Kriteriji prihvatanja:** Pokušaj otvaranja bilo koje zaštićene rute bez prijave preusmjerava na welcome.
- **Testni scenarij:**
  1. Osigurati da nijedan korisnik nije prijavljen (odjaviti se ako je potrebno).
  2. U adresnu traku redom unijeti zaštićene rute: `/app/order`, zatim `/driver`, zatim `/dispatch`.
- **Testni podaci:** Bez prijave; rute `/app/order`, `/driver`, `/dispatch`.
- **Očekivani rezultat:** Svaki pokušaj preusmjerava na `/welcome`; zaštićeni sadržaj nije prikazan.
- **Stvarni rezultat:** Svaki pokušaj pristupa zaštićenoj ruti preusmjerio je na `/welcome`; zaštićeni sadržaj nije bio prikazan.
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.14: TC_AUTH_014_Gost_bez_pristupa

---

# MODUL 2 — Upravljanje vožnjama (TC_RIDE)

---

### TC_RIDE_001 — Kreiranje vožnje (odmah)
- **Poslovni zahtjev:** Putnik mora moći naručiti vožnju za odmah, zadavanjem polazišta i odredišta.
- **Kriteriji prihvatanja:** Sistem kreira vožnju i otvara ekran traženja vozača („Tražimo najbližeg dostupnog vozača…").
- **Testni scenarij:**
  1. Prijaviti se kao putnik (otvara se ekran „Naruči" / „Gdje idete danas?").
  2. U polje **Polazište** unijeti lokaciju.
  3. U polje **Odredište** unijeti lokaciju.
  4. Ostaviti odabran način **Odmah**.
  5. Kliknuti dugme **„Potvrdi vožnju"** (prikazuje i cijenu, npr. „Naruči vožnju za 8.50 BAM").
- **Testni podaci:** Polazište: Baščaršija; Odredište: Aerodrom Sarajevo.
- **Očekivani rezultat:** Prikazuje se toast „Zahtjev za vožnju je kreiran." i otvara se ekran traženja vozača.
- **Stvarni rezultat:** Prikazan je toast „Zahtjev za vožnju je kreiran." i aplikacija je otvorila ekran traženja vozača.
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.15: TC_RIDE_001_Kreiranje_voznje

### TC_RIDE_002 — Prikaz procjene cijene i rute prije potvrde
- **Poslovni zahtjev:** Putnik mora vidjeti procjenu cijene, udaljenost i rutu na karti prije potvrde.
- **Kriteriji prihvatanja:** Nakon odabira obje lokacije prikazani su procjena cijene (BAM), udaljenost (km), procijenjeno vrijeme i linija rute na karti; uz to AI procjena vožnje.
- **Testni scenarij:**
  1. Otvoriti „Naruči".
  2. Odabrati polazište i odredište.
  3. Sačekati izračun rute.
  4. Pregledati sekciju „Procjena" (cijena, udaljenost, vrijeme) i rutu iscrtanu na karti.
- **Testni podaci:** Polazište: Centar; Odredište: Ilidža.
- **Očekivani rezultat:** Prikazana procjena cijene u BAM, udaljenost u km, procijenjeno vrijeme i ruta na karti; dugme „Potvrdi vožnju" postaje aktivno.
- **Stvarni rezultat:** Prikazani su procjena cijene u BAM, udaljenost u km i procijenjeno vrijeme; ruta je iscrtana na karti, a dugme „Potvrdi vožnju" je postalo aktivno.
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.16: TC_RIDE_002_Procjena_cijene_rute

### TC_RIDE_003 — Ista početna i krajnja lokacija (negativan)
- **Poslovni zahtjev:** Sistem ne smije dozvoliti vožnju kada su polazište i odredište ista lokacija.
- **Kriteriji prihvatanja:** Dugme „Potvrdi vožnju" je onemogućeno i prikazuje se poruka da lokacije ne mogu biti iste.
- **Testni scenarij:**
  1. Otvoriti „Naruči".
  2. Za polazište i odredište odabrati istu lokaciju.
  3. Pokušati potvrditi vožnju.
- **Testni podaci:** Polazište: Grbavica; Odredište: Grbavica.
- **Očekivani rezultat:** Dugme prikazuje/poruka „Polazište i odredište ne mogu biti ista lokacija."; vožnja se ne kreira.
- **Stvarni rezultat:** Prikazana je poruka „Polazište i odredište ne mogu biti ista lokacija."; dugme je ostalo onemogućeno i vožnja nije kreirana.
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.17: TC_RIDE_003_Ista_lokacija_greska

### TC_RIDE_004 — Zakazivanje vožnje za budući termin
- **Poslovni zahtjev:** Putnik mora moći zakazati vožnju za budući datum i vrijeme.
- **Kriteriji prihvatanja:** Sistem kreira zakazanu vožnju i prikazuje je u listi zakazanih.
- **Testni scenarij:**
  1. Otvoriti „Naruči".
  2. Odabrati polazište i odredište.
  3. Odabrati način **Zakaži**.
  4. U polju „Datum i vrijeme" odabrati budući termin.
  5. Kliknuti „Potvrdi vožnju".
- **Testni podaci:** Polazište: Dobrinja; Odredište: Koševo; Termin: sutra 10:00.
- **Očekivani rezultat:** Toast potvrde; vožnja se pojavljuje na ekranu „Zakazane" sa statusom „U planu".
- **Stvarni rezultat:** Prikazan je toast potvrde, a zakazana vožnja se pojavila na ekranu „Zakazane" sa statusom „U planu".
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.18: TC_RIDE_004_Zakazivanje_voznje

### TC_RIDE_005 — Zakazivanje u prošlosti (negativan)
- **Poslovni zahtjev:** Sistem ne smije dozvoliti zakazivanje za prošli datum/vrijeme.
- **Kriteriji prihvatanja:** Dugme „Potvrdi vožnju" ostaje blokirano uz poruku „Zakazano vrijeme mora biti u budućnosti." / „Odaberite datum i vrijeme.".
- **Testni scenarij:**
  1. Otvoriti „Naruči" i odabrati „Zakaži".
  2. Odabrati validne lokacije.
  3. U polje datuma pokušati odabrati prošli termin.
  4. Pokušati potvrditi.
- **Testni podaci:** Polazište: Stup; Odredište: Vogošća; Termin: jučerašnji datum.
- **Očekivani rezultat:** Vožnja se ne kreira; prikazana validacijska poruka o budućem terminu.
- **Stvarni rezultat:** Vožnja nije kreirana; prikazana je validacijska poruka da zakazano vrijeme mora biti u budućnosti.
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.19: TC_RIDE_005_Prosli_termin_greska

### TC_RIDE_006 — Pronalazak i prikaz vozača (ekran traženja)
- **Poslovni zahtjev:** Nakon narudžbe sistem traži i nalazi najbližeg dostupnog vozača.
- **Kriteriji prihvatanja:** Na ekranu traženja prikazuje se animacija provjere vozača i brojač čekanja, a zatim modal „Vozač je pronađen" sa podacima o vozaču i vozilu.
- **Testni scenarij:**
  1. Kreirati vožnju „Odmah" (TC_RIDE_001).
  2. Pratiti ekran traženja (lista kandidata sa oznakama „Na čekanju"/„Provjera…").
  3. Sačekati da se otvori modal „Vozač je pronađen".
- **Testni podaci:** Polazište: Baščaršija; Odredište: Marijin Dvor.
- **Očekivani rezultat:** Otvara se modal „Vozač je pronađen" sa imenom vozača, vozilom, registracijom, udaljenošću i sažetkom rute.
- **Stvarni rezultat:** Prikazana je animacija provjere i brojač čekanja, a zatim se otvorio modal „Vozač je pronađen" sa imenom vozača, vozilom, registracijom, udaljenošću i sažetkom rute.
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.20: TC_RIDE_006_Pronalazak_vozaca

### TC_RIDE_007 — Nema dostupnih vozila (negativan)
- **Poslovni zahtjev:** Kada nema slobodnih vozila, putnik mora dobiti jasnu informaciju i mogućnost ponovnog pokušaja.
- **Kriteriji prihvatanja:** Sistem otvara ekran „Nije pronađen vozač" sa opcijama „Pokušaj ponovo" i „Vrati se na početnu".
- **Testni scenarij:**
  1. Kreirati vožnju „Odmah" u trenutku kada nema slobodnih vozila u zoni.
  2. Sačekati završetak traženja.
- **Testni podaci:** Polazište: Otoka; Odredište: Vogošća.
- **Očekivani rezultat:** Prikazuje se ekran „Nije pronađen vozač" s porukom o nedostupnosti vozila i dugmadima „Pokušaj ponovo" / „Vrati se na početnu".
- **Stvarni rezultat:** Prikazan je ekran „Nije pronađen vozač" s porukom o nedostupnosti vozila i dugmadima „Pokušaj ponovo" i „Vrati se na početnu".
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.21: TC_RIDE_007_Nema_vozila

### TC_RIDE_008 — Potvrda vozača (prelazak na aktivnu vožnju)
- **Poslovni zahtjev:** Putnik mora potvrditi pronađenog vozača prije prelaska na praćenje vožnje.
- **Kriteriji prihvatanja:** Klik na „Potvrdi vozača" otvara ekran aktivne vožnje i prikazuje banner sa podacima vozača.
- **Testni scenarij:**
  1. Kreirati vožnju i sačekati modal „Vozač je pronađen".
  2. Pregledati podatke o vozaču i vozilu.
  3. Kliknuti **„Potvrdi vozača"** (prije isteka odbrojavanja „Potvrdi za Xs").
- **Testni podaci:** Polazište: Centar; Odredište: Stup.
- **Očekivani rezultat:** Otvara se ekran aktivne vožnje sa kartom i statusom „Vozač je na putu"; prikazuje se banner „Vozač je pronađen".
- **Stvarni rezultat:** Nakon klika na „Potvrdi vozača" otvoren je ekran aktivne vožnje sa kartom i statusom „Vozač je na putu"; prikazan je banner „Vozač je pronađen".
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.22: TC_RIDE_008_Potvrda_vozaca

### TC_RIDE_009 — Praćenje statusa vožnje
- **Poslovni zahtjev:** Putnik mora pratiti napredak vožnje kroz faze i kretanje vozača na karti.
- **Kriteriji prihvatanja:** Status badge i traka napretka (Dodjeljen → Na putu → Stigao → Vožnja → Završeno) ažuriraju se, a marker vozača se kreće po karti.
- **Testni scenarij:**
  1. Potvrditi vozača i otvoriti ekran aktivne vožnje.
  2. Pratiti status „Vozač je na putu" i kretanje vozila ka polazištu na karti.
  3. Pratiti prelazak u „Vozač je stigao".
- **Testni podaci:** Aktivna vožnja Baščaršija → Aerodrom Sarajevo.
- **Očekivani rezultat:** Status i traka napretka se ažuriraju; marker vozača se animira do polazišta; prikazuje se oznaka dolaska.
- **Stvarni rezultat:** Status i traka napretka su se ažurirali kroz faze; marker vozača se animirao do polazišta i prikazana je oznaka dolaska.
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.23: TC_RIDE_009_Status_voznje

### TC_RIDE_010 — Potvrda ulaska u vozilo
- **Poslovni zahtjev:** Po dolasku vozača putnik mora potvrditi ulazak da bi vožnja počela.
- **Kriteriji prihvatanja:** Dugme „Potvrdi ulazak u vozilo" dostupno je u statusu „Vozač je stigao"; nakon potvrde status prelazi u „Vožnja u toku".
- **Testni scenarij:**
  1. Sačekati da vožnja dođe u status „Vozač je stigao" (prikaz oznake dolaska).
  2. Kliknuti **„Potvrdi ulazak u vozilo"**.
- **Testni podaci:** Aktivna vožnja u statusu „Vozač je stigao".
- **Očekivani rezultat:** Status prelazi u „Vožnja u toku"; vozilo kreće ka odredištu na karti.
- **Stvarni rezultat:** Nakon klika na „Potvrdi ulazak u vozilo" status je prešao u „Vožnja u toku" i vozilo je krenulo ka odredištu na karti.
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.24: TC_RIDE_010_Potvrda_ulaska

### TC_RIDE_011 — Otkazivanje vožnje prije početka (s razlogom)
- **Poslovni zahtjev:** Putnik mora moći otkazati vožnju prije njenog početka uz navođenje razloga.
- **Kriteriji prihvatanja:** Modal „Otkaži vožnju" traži razlog; „Potvrdi otkaz" je onemogućen dok razlog nije unesen.
- **Testni scenarij:**
  1. Na aktivnoj vožnji u statusu „Vozač je na putu" ili „Vozač je stigao" kliknuti **„Otkaži vožnju"**.
  2. U polje „Razlog otkazivanja" unijeti razlog.
  3. Kliknuti **„Potvrdi otkaz"**.
- **Testni podaci:** Razlog: „Promijenio sam planove".
- **Očekivani rezultat:** Vožnja se otkazuje; toast „Vožnja je otkazana."; preusmjeravanje na Historiju.
- **Stvarni rezultat:** Vožnja je otkazana nakon unosa razloga; prikazan je toast „Vožnja je otkazana." i aplikacija je preusmjerila na Historiju.
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.25: TC_RIDE_011_Otkazivanje_voznje

### TC_RIDE_012 — Otkazivanje vožnje u toku (negativan)
- **Poslovni zahtjev:** Vožnja u toku ne smije se moći otkazati (umjesto toga „Prijavi problem").
- **Kriteriji prihvatanja:** Kada je status „Vožnja u toku", opcija otkazivanja nije dostupna; pri pokušaju prikazuje se poruka da je vožnja počela.
- **Testni scenarij:**
  1. Dovesti vožnju u status „Vožnja u toku" (nakon potvrde ulaska).
  2. Provjeriti da dugme „Otkaži vožnju" više nije prikazano.
- **Testni podaci:** Aktivna vožnja u statusu „Vožnja u toku".
- **Očekivani rezultat:** Otkazivanje nije moguće; dostupno je samo „Prijavi problem" (poruka: „Vožnja je počela. Za pomoć koristite Prijavi problem.").
- **Stvarni rezultat:** U statusu „Vožnja u toku" dugme „Otkaži vožnju" nije bilo prikazano; dostupno je bilo samo „Prijavi problem".
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.26: TC_RIDE_012_Otkaz_utoku_greska

### TC_RIDE_013 — Završetak vožnje i prelazak na ocjenu
- **Poslovni zahtjev:** Po dolasku na odredište vožnja se završava i putnik se vodi na ocjenjivanje.
- **Kriteriji prihvatanja:** Status postaje „Završena"; aplikacija automatski otvara ekran „Ocijeni vožnju"; stiže obavještenje o završetku i naplati.
- **Testni scenarij:**
  1. Pustiti da vožnja u statusu „Vožnja u toku" dođe do odredišta.
  2. Pratiti automatski prelazak na ekran ocjene.
  3. Provjeriti obavještenja (zvono): „Vožnja je završena." i naplata.
- **Testni podaci:** Aktivna vožnja Baščaršija → Aerodrom Sarajevo.
- **Očekivani rezultat:** Otvara se ekran „Ocijeni vožnju" sa prikazom „Vožnja završena"; obavještenja o završetku i plaćanju su prisutna.
- **Stvarni rezultat:** Po dolasku na odredište vožnja je dobila status „Završena", automatski je otvoren ekran „Ocijeni vožnju" i stigla su obavještenja o završetku i naplati.
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.27: TC_RIDE_013_Zavrsetak_voznje

### TC_RIDE_014 — Ocjena vožnje (1–5)
- **Poslovni zahtjev:** Putnik mora moći ocijeniti završenu vožnju ocjenom 1–5 i ostaviti komentar.
- **Kriteriji prihvatanja:** Ocjena se sprema; prikazuje se zahvalnica; ocjena se odražava u historiji vožnje.
- **Testni scenarij:**
  1. Na ekranu „Ocijeni vožnju" odabrati zvjezdice (npr. 5).
  2. U polje „Komentar (opcionalno)" unijeti tekst.
  3. Kliknuti **„Pošalji ocjenu"**.
- **Testni podaci:** Ocjena: 5; Komentar: „Ljubazan vozač, čisto vozilo".
- **Očekivani rezultat:** Toast „Hvala na ocjeni!"; ocjena sačuvana; povratak u tok aplikacije.
- **Stvarni rezultat:** Ocjena (5 zvjezdica) i komentar su sačuvani; prikazan je toast „Hvala na ocjeni!" i aplikacija se vratila u glavni tok.
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.28: TC_RIDE_014_Ocjena_voznje

### TC_RIDE_015 — Preskakanje ocjenjivanja
- **Poslovni zahtjev:** Putnik mora moći preskočiti ocjenjivanje.
- **Kriteriji prihvatanja:** Klik na „Preskoči ocjenjivanje" zatvara ekran ocjene bez spremanja ocjene.
- **Testni scenarij:**
  1. Na ekranu „Ocijeni vožnju" kliknuti **„Preskoči ocjenjivanje"**.
- **Testni podaci:** Završena vožnja bez ocjene.
- **Očekivani rezultat:** Ekran ocjene se zatvara; vožnja ostaje neocijenjena u historiji (moguće ocijeniti kasnije).
- **Stvarni rezultat:** Nakon klika na „Preskoči ocjenjivanje" ekran je zatvoren; vožnja je ostala neocijenjena u historiji.
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.29: TC_RIDE_015_Preskakanje_ocjene

### TC_RIDE_016 — Zatraži drugog vozača (na ekranu pronalaska)
- **Poslovni zahtjev:** Ako ponuđeni vozač ne odgovara, putnik mora moći zatražiti drugog prije potvrde.
- **Kriteriji prihvatanja:** Klik na „Zatraži drugog vozača" dodjeljuje drugog dostupnog vozača i ažurira podatke u modalu.
- **Testni scenarij:**
  1. Kreirati vožnju i sačekati modal „Vozač je pronađen".
  2. Kliknuti link **„Zatraži drugog vozača"**.
  3. Pregledati ažurirane podatke o novom vozaču.
- **Testni podaci:** Polazište: Centar; Odredište: Ilidža.
- **Očekivani rezultat:** Toast „Dodijeljen je novi vozač."; u modalu prikazan drugi vozač/vozilo.
- **Stvarni rezultat:** Prikazan je toast „Dodijeljen je novi vozač."; u modalu su ažurirani podaci o drugom vozaču i vozilu.
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.30: TC_RIDE_016_Drugi_vozac

### TC_RIDE_017 — Istek odbrojavanja za potvrdu vozača
- **Poslovni zahtjev:** Ako putnik ne potvrdi vozača u zadanom roku, ponuda se poništava.
- **Kriteriji prihvatanja:** Po isteku odbrojavanja („Potvrdi za Xs") modal se zatvara, vožnja se otkazuje i putnik se vraća na ekran narudžbe.
- **Testni scenarij:**
  1. Kreirati vožnju i sačekati modal „Vozač je pronađen".
  2. Ne poduzimati nikakvu akciju do isteka odbrojavanja.
- **Testni podaci:** Polazište: Koševo; Odredište: Centar.
- **Očekivani rezultat:** Modal se zatvara po isteku; vožnja otkazana; povratak na ekran „Naruči".
- **Stvarni rezultat:** Po isteku odbrojavanja modal se zatvorio, vožnja je otkazana i aplikacija se vratila na ekran „Naruči".
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.31: TC_RIDE_017_Istek_potvrde

### TC_RIDE_018 — Druga vožnja dok je jedna aktivna (negativan)
- **Poslovni zahtjev:** Putnik ne smije imati dvije aktivne vožnje istovremeno.
- **Kriteriji prihvatanja:** Dok postoji aktivna vožnja, dugme za narudžbu prikazuje „Već imate aktivnu vožnju." i nova se ne kreira.
- **Testni scenarij:**
  1. Imati jednu aktivnu vožnju.
  2. Otvoriti „Naruči" i pokušati kreirati novu vožnju.
- **Testni podaci:** Postojeća aktivna vožnja; nova relacija Stup → Dobrinja.
- **Očekivani rezultat:** Dugme/poruka „Već imate aktivnu vožnju."; nova vožnja se ne kreira.
- **Stvarni rezultat:** Prikazana je poruka „Već imate aktivnu vožnju."; nova vožnja nije kreirana.
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.32: TC_RIDE_018_Aktivna_postoji_greska

### TC_RIDE_019 — Historija vožnji i filteri
- **Poslovni zahtjev:** Putnik mora vidjeti historiju vožnji sa mogućnošću filtriranja.
- **Kriteriji prihvatanja:** Ekran „Historija vožnji" prikazuje vožnje sa statusom, relacijom i cijenom; filteri (Sve/Završene/Otkazane/Zakazane/Prijavljen problem) rade.
- **Testni scenarij:**
  1. Otvoriti „Historija" iz navigacije.
  2. Pregledati listu prethodnih vožnji.
  3. Primijeniti filter „Završene", pa „Otkazane".
  4. Otvoriti „Detalji" jedne vožnje.
- **Testni podaci:** Testni putnik `korisnik@urbanflow.ba` (postoji historija vožnji).
- **Očekivani rezultat:** Lista i filteri rade; detalji vožnje prikazuju rutu, cijenu, vozača i status.
- **Stvarni rezultat:** Lista i filteri (Završene/Otkazane) su radili ispravno; detalji vožnje prikazali su rutu, cijenu, vozača i status.
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.33: TC_RIDE_019_Historija_filteri

### TC_RIDE_020 — Ponavljanje vožnje iz historije
- **Poslovni zahtjev:** Putnik mora moći ponoviti prethodnu vožnju.
- **Kriteriji prihvatanja:** Klik na „Ponovi vožnju" otvara „Naruči" sa popunjenim polazištem i odredištem te vožnje.
- **Testni scenarij:**
  1. Otvoriti „Historija".
  2. Na odabranoj vožnji kliknuti **„Ponovi vožnju"**.
  3. Provjeriti popunjene lokacije na ekranu „Naruči".
- **Testni podaci:** Završena vožnja Baščaršija → Marijin Dvor.
- **Očekivani rezultat:** Ekran „Naruči" otvoren sa istim polazištem i odredištem; spremno za narudžbu.
- **Stvarni rezultat:** Nakon klika na „Ponovi vožnju" otvoren je ekran „Naruči" sa unaprijed popunjenim istim polazištem i odredištem.
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.34: TC_RIDE_020_Ponavljanje_voznje

### TC_RIDE_021 — Brisanje vožnje iz historije
- **Poslovni zahtjev:** Putnik mora moći obrisati pojedinačnu vožnju iz prikaza historije.
- **Kriteriji prihvatanja:** Nakon potvrde, vožnja se uklanja iz liste; ponuđeno je „Poništi brisanje" u kratkom roku.
- **Testni scenarij:**
  1. Otvoriti detalje vožnje u historiji (ili meni „Više").
  2. Kliknuti **„Obriši vožnju"** i potvrditi u dijalogu.
- **Testni podaci:** Jedna vožnja iz historije.
- **Očekivani rezultat:** Vožnja se uklanja iz liste; toast „Vožnja je obrisana iz historije." uz opciju „Poništi brisanje".
- **Stvarni rezultat:** Vožnja je uklonjena iz liste; prikazan je toast „Vožnja je obrisana iz historije." sa opcijom „Poništi brisanje".
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.35: TC_RIDE_021_Brisanje_iz_historije

### TC_RIDE_022 — Otkazivanje zakazane vožnje
- **Poslovni zahtjev:** Putnik mora moći otkazati zakazanu vožnju.
- **Kriteriji prihvatanja:** Zakazana vožnja se otkazuje i nestaje iz liste aktivnih zakazanih; prikazuje se potvrda.
- **Testni scenarij:**
  1. Otvoriti ekran „Zakazane".
  2. Na zakazanoj vožnji kliknuti **„Otkaži vožnju"**.
  3. Potvrditi otkazivanje.
- **Testni podaci:** Zakazana vožnja iz TC_RIDE_004.
- **Očekivani rezultat:** Vožnja otkazana; toast „Vožnja je otkazana."; uklonjena iz liste.
- **Stvarni rezultat:** Zakazana vožnja je otkazana; prikazan je toast „Vožnja je otkazana." i vožnja je uklonjena iz liste.
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.36: TC_RIDE_022_Otkaz_zakazane

### TC_RIDE_023 — Prijava problema na vožnji (putnik)
- **Poslovni zahtjev:** Putnik mora moći prijaviti problem/reklamaciju vezanu za vožnju.
- **Kriteriji prihvatanja:** Reklamacija sa kategorijom i opisom se zaprima; postaje vidljiva dispečeru.
- **Testni scenarij:**
  1. Na aktivnoj vožnji kliknuti **„Prijavi problem"** (ili iz historije „Prijavi problem").
  2. Odabrati **Kategoriju** (npr. „Kašnjenje").
  3. Unijeti **Opis**.
  4. Kliknuti **„Pošalji prijavu"**.
- **Testni podaci:** Kategorija: „Kašnjenje"; Opis: „Vozač je kasnio 15 minuta".
- **Očekivani rezultat:** Toast „Prijava je zaprimljena."; reklamacija evidentirana i vidljiva dispečeru.
- **Stvarni rezultat:** Prikazan je toast „Prijava je zaprimljena."; reklamacija je evidentirana i pojavila se u dispečerskom panelu.
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.37: TC_RIDE_023_Prijava_problema

### TC_RIDE_024 — Duplikat prijave problema (negativan)
- **Poslovni zahtjev:** Za istu vožnju ne smije postojati više od jedne prijave problema.
- **Kriteriji prihvatanja:** Drugi pokušaj prijave za istu vožnju se odbija uz poruku.
- **Testni scenarij:**
  1. Prijaviti problem za vožnju (TC_RIDE_023).
  2. Pokušati ponovo prijaviti problem za istu vožnju.
- **Testni podaci:** Vožnja koja već ima prijavu.
- **Očekivani rezultat:** Poruka „Već postoji prijava za ovu vožnju."; druga prijava se ne kreira.
- **Stvarni rezultat:** Prikazana je poruka „Već postoji prijava za ovu vožnju."; druga prijava nije kreirana.
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.38: TC_RIDE_024_Duplikat_prijave

### TC_RIDE_025 — Vozač prihvata vožnju
- **Poslovni zahtjev:** Vozač mora moći prihvatiti ponuđeni zahtjev za vožnju.
- **Kriteriji prihvatanja:** Nakon „Prihvati" otvara se tok aktivne vožnje; status vozača postaje „Zauzet".
- **Testni scenarij:**
  1. Prijaviti se kao vozač i kliknuti „Započni smjenu" (status „Dostupan").
  2. U kartici **„Nova vožnja"** pregledati ponudu (relacija, ETA, cijena, putnik).
  3. Kliknuti **„Prihvati"**.
- **Testni podaci:** Vozač `vozac@urbanflow.ba` / `Test12345`.
- **Očekivani rezultat:** Toast „Vožnja prihvaćena."; kartica „Tok vožnje" prikazuje korake; status „Zauzet".
- **Stvarni rezultat:** Prikazan je toast „Vožnja prihvaćena."; kartica „Tok vožnje" je prikazala korake, a status vozača je postao „Zauzet".
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.39: TC_RIDE_025_Vozac_prihvata

### TC_RIDE_026 — Vozač odbija vožnju s razlogom
- **Poslovni zahtjev:** Vozač mora moći odbiti ponudu uz navođenje razloga.
- **Kriteriji prihvatanja:** Modal „Odbijanje zahtjeva" prikuplja razlog; ponuda se uklanja; vozač ostaje dostupan.
- **Testni scenarij:**
  1. Kao dostupan vozač sa aktivnom ponudom kliknuti **„Odbij"**.
  2. U modalu „Odbijanje zahtjeva" odabrati razlog (npr. „Pauza").
  3. Potvrditi.
- **Testni podaci:** Razlog: „Pauza".
- **Očekivani rezultat:** Toast „Zahtjev odbijen. Sistem traži drugog vozača."; vozač ostaje „Dostupan".
- **Stvarni rezultat:** Prikazan je toast „Zahtjev odbijen. Sistem traži drugog vozača."; ponuda je uklonjena, a vozač je ostao „Dostupan".
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.40: TC_RIDE_026_Vozac_odbija

### TC_RIDE_027 — Vozač označava dolazak
- **Poslovni zahtjev:** Vozač mora moći označiti dolazak na lokaciju preuzimanja.
- **Kriteriji prihvatanja:** Klik na „Stigao na lokaciju" prebacuje tok u korak „Stigao na lokaciju".
- **Testni scenarij:**
  1. Imati aktivnu vožnju (korak „Vozač stiže").
  2. Kliknuti **„Stigao na lokaciju"**.
- **Testni podaci:** Aktivna vožnja kao vozač.
- **Očekivani rezultat:** Toast „Stigli ste na lokaciju preuzimanja."; korak toka napreduje.
- **Stvarni rezultat:** Prikazan je toast „Stigli ste na lokaciju preuzimanja."; korak toka vožnje je napredovao na „Stigao na lokaciju".
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.41: TC_RIDE_027_Vozac_stigao

### TC_RIDE_028 — Vozač pokreće i završava vožnju
- **Poslovni zahtjev:** Vozač mora moći pokrenuti vožnju nakon dolaska i zatim je završiti uz sažetak.
- **Kriteriji prihvatanja:** „Pokreni vožnju" dostupno samo nakon dolaska; „Završi vožnju" prikazuje modal sažetka (ruta, cijena, trajanje, plaćanje).
- **Testni scenarij:**
  1. Nakon „Stigao na lokaciju" kliknuti **„Pokreni vožnju"**.
  2. Kliknuti **„Završi vožnju"**.
  3. Pregledati modal sažetka i kliknuti „Potvrdi i nastavi".
- **Testni podaci:** Aktivna vožnja kao vozač.
- **Očekivani rezultat:** Vožnja u toku, zatim završena; prikazan modal „Vožnja završena" sa sažetkom; zarada/broj vožnji ažurirani.
- **Stvarni rezultat:** Vožnja je pokrenuta pa završena; prikazan je modal „Vožnja završena" sa sažetkom (ruta, cijena, trajanje, plaćanje), a zarada i broj vožnji su ažurirani.
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.42: TC_RIDE_028_Vozac_zavrsava

### TC_RIDE_029 — Vozač otkazuje aktivnu vožnju
- **Poslovni zahtjev:** Vozač mora moći otkazati aktivnu (nezavršenu) vožnju uz razlog.
- **Kriteriji prihvatanja:** Modal „Otkazivanje vožnje" prikuplja razlog; vožnja se otkazuje; vozač se vraća u „Dostupan".
- **Testni scenarij:**
  1. Imati aktivnu vožnju.
  2. U kartici „Tok vožnje" kliknuti **„Otkaži vožnju"**.
  3. Unijeti razlog i potvrditi.
- **Testni podaci:** Razlog: „Putnik se ne pojavljuje".
- **Očekivani rezultat:** Toast „Vožnja je otkazana."; vozač „Dostupan"; vožnja zabilježena u historiji vozača kao otkazana.
- **Stvarni rezultat:** Prikazan je toast „Vožnja je otkazana."; vozač se vratio u „Dostupan", a vožnja je zabilježena u vozačkoj historiji kao otkazana.
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.43: TC_RIDE_029_Vozac_otkazuje

### TC_RIDE_030 — Privatnost: isključena historija
- **Poslovni zahtjev:** Ako putnik isključi spremanje historije, vožnje se ne smiju prikazivati u historiji.
- **Kriteriji prihvatanja:** Uz isključenu opciju, ekran „Historija" prikazuje poruku da je historija isključena, bez vožnji.
- **Testni scenarij:**
  1. U Postavkama isključiti „Sačuvaj historiju lokacija".
  2. Otvoriti ekran „Historija".
- **Testni podaci:** Testni putnik `korisnik@urbanflow.ba`; opcija historije = isključeno.
- **Očekivani rezultat:** Prikazana poruka „Historija vožnji je isključena u postavkama." sa dugmetom „Otvori postavke".
- **Stvarni rezultat:** Uz isključenu opciju, ekran „Historija" prikazao je poruku „Historija vožnji je isključena u postavkama." sa dugmetom „Otvori postavke", bez vožnji.
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.44: TC_RIDE_030_Historija_privatnost

---

# MODUL 3 — Upravljanje vozačima (TC_DRIVER)

---

### TC_DRIVER_001 — Početak smjene (aktivacija vozača)
- **Poslovni zahtjev:** Vozač mora moći započeti smjenu i postati dostupan za vožnje.
- **Kriteriji prihvatanja:** Status u kartici „Status vozača" prelazi u „Dostupan"; oznaka „Na mreži".
- **Testni scenarij:**
  1. Prijaviti se kao vozač (otvara se vozačka „Početna").
  2. U kartici **„Status vozača"** kliknuti **„Započni smjenu"**.
- **Testni podaci:** Vozač `vozac@urbanflow.ba` / `Test12345`.
- **Očekivani rezultat:** „Trenutni status: Dostupan"; oznaka „Na mreži"; obavještenje „Smjena počela".
- **Stvarni rezultat:** Status je prešao u „Dostupan" uz oznaku „Na mreži"; stiglo je obavještenje „Smjena počela".
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.45: TC_DRIVER_001_Pocetak_smjene

### TC_DRIVER_002 — Početak smjene bez GPS pristanka (negativan)
- **Poslovni zahtjev:** Smjena se ne smije započeti bez uključene lokacije.
- **Kriteriji prihvatanja:** Sistem odbija početak smjene i traži uključenje GPS-a.
- **Testni scenarij:**
  1. Otvoriti vozačke **Postavke** i isključiti pristup lokaciji (GPS).
  2. Vratiti se na „Početna" i kliknuti „Započni smjenu".
- **Testni podaci:** Vozač; GPS pristup = isključeno.
- **Očekivani rezultat:** Smjena se ne pokreće; poruka „Uključite pristup lokaciji u postavkama da biste započeli smjenu.".
- **Stvarni rezultat:** Smjena se nije pokrenula; prikazana je poruka „Uključite pristup lokaciji u postavkama da biste započeli smjenu.".
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.46: TC_DRIVER_002_Bez_gps_greska

### TC_DRIVER_003 — Pauza vozača
- **Poslovni zahtjev:** Dostupan vozač mora moći otići na pauzu.
- **Kriteriji prihvatanja:** Status prelazi u „Na pauzi"; eventualna otvorena ponuda se uklanja.
- **Testni scenarij:**
  1. Biti u statusu „Dostupan".
  2. U kartici „Status vozača" kliknuti **„Pauza"**.
- **Testni podaci:** Vozač u smjeni, status „Dostupan".
- **Očekivani rezultat:** „Trenutni status: Na pauzi"; prikazana dugmad „Nastavi" i „Završi smjenu".
- **Stvarni rezultat:** Status je prešao u „Na pauzi"; prikazana su dugmad „Nastavi" i „Završi smjenu".
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.47: TC_DRIVER_003_Pauza

### TC_DRIVER_004 — Nastavak rada sa pauze
- **Poslovni zahtjev:** Vozač mora moći nastaviti rad nakon pauze.
- **Kriteriji prihvatanja:** Status sa „Na pauzi" prelazi u „Dostupan".
- **Testni scenarij:**
  1. Biti „Na pauzi".
  2. Kliknuti **„Nastavi"**.
- **Testni podaci:** Vozač u statusu „Na pauzi".
- **Očekivani rezultat:** „Trenutni status: Dostupan"; vozač ponovo prima ponude.
- **Stvarni rezultat:** Status je prešao u „Dostupan" i vozač je ponovo počeo primati ponude.
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.48: TC_DRIVER_004_Nastavak_rada

### TC_DRIVER_005 — Završetak smjene
- **Poslovni zahtjev:** Vozač mora moći završiti smjenu kada nema aktivne vožnje.
- **Kriteriji prihvatanja:** Status prelazi u „Van smjene"; stiže sažetak zarade za smjenu (u obavještenjima).
- **Testni scenarij:**
  1. Biti „Dostupan" ili „Na pauzi" bez aktivne vožnje.
  2. Kliknuti **„Završi smjenu"**.
- **Testni podaci:** Vozač u smjeni bez aktivne vožnje.
- **Očekivani rezultat:** „Trenutni status: Van smjene"; obavještenja „Smjena završena" i „Zarada za smjenu".
- **Stvarni rezultat:** Status je prešao u „Van smjene"; stigla su obavještenja „Smjena završena" i „Zarada za smjenu".
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.49: TC_DRIVER_005_Zavrsetak_smjene

### TC_DRIVER_006 — Završetak smjene tokom aktivne vožnje (negativan)
- **Poslovni zahtjev:** Smjena se ne smije završiti dok je vožnja aktivna.
- **Kriteriji prihvatanja:** Tokom zauzetosti vožnjom dugme „Završi smjenu" nije dostupno; prikazana je napomena.
- **Testni scenarij:**
  1. Prihvatiti vožnju (status „Zauzet").
  2. Pokušati završiti smjenu u kartici „Status vozača".
- **Testni podaci:** Vozač sa aktivnom vožnjom.
- **Očekivani rezultat:** Završetak smjene blokiran; poruka „Zauzeti ste vožnjom. Završite ili otkažite vožnju prije završetka smjene.".
- **Stvarni rezultat:** Završetak smjene je bio blokiran; prikazana je poruka „Zauzeti ste vožnjom. Završite ili otkažite vožnju prije završetka smjene.".
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.50: TC_DRIVER_006_Zavrsetak_blokiran

### TC_DRIVER_007 — Prijem nove ponude vožnje
- **Poslovni zahtjev:** Dostupnom vozaču sistem treba dostaviti nove ponude vožnji.
- **Kriteriji prihvatanja:** Nakon početka smjene u kartici „Nova vožnja" pojavljuje se ponuda (oznaka „NOVO") sa relacijom, ETA, cijenom i putnikom; stiže obavještenje „Nova ponuda vožnje".
- **Testni scenarij:**
  1. Započeti smjenu.
  2. Pratiti karticu **„Nova vožnja"** i obavještenje.
- **Testni podaci:** Vozač u statusu „Dostupan".
- **Očekivani rezultat:** Prikazana ponuda sa detaljima i dugmadima „Prihvati"/„Odbij"; obavještenje „Nova ponuda vožnje".
- **Stvarni rezultat:** U kartici „Nova vožnja" prikazana je ponuda (oznaka „NOVO") sa relacijom, ETA, cijenom i putnikom te dugmadima „Prihvati"/„Odbij"; stiglo je obavještenje „Nova ponuda vožnje".
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.51: TC_DRIVER_007_Nova_ponuda

### TC_DRIVER_008 — Prikaz statusa vozača (badge)
- **Poslovni zahtjev:** Trenutni status vozača mora biti jasno prikazan kroz akcije smjene.
- **Kriteriji prihvatanja:** Indikator i tekst statusa tačno odražavaju: Dostupan → Zauzet → Na pauzi → Van smjene.
- **Testni scenarij:**
  1. Pratiti karticu „Status vozača" kroz: početak smjene, prihvat vožnje, pauzu i završetak smjene.
- **Testni podaci:** Vozač kroz različite akcije.
- **Očekivani rezultat:** Status i oznaka „Na mreži/Van smjene" se mijenjaju tačno i bez kašnjenja.
- **Stvarni rezultat:** Status i oznaka „Na mreži/Van smjene" mijenjali su se tačno i bez kašnjenja kroz sve akcije.
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.52: TC_DRIVER_008_Status_badge

### TC_DRIVER_009 — Postavke dijeljenja lokacije
- **Poslovni zahtjev:** Vozač mora moći upravljati dijeljenjem lokacije i vidjeti zadnje GPS očitanje.
- **Kriteriji prihvatanja:** Promjene postavki lokacije se spremaju; prikazano je vrijeme/lokacija zadnjeg očitanja.
- **Testni scenarij:**
  1. Otvoriti vozačke **Postavke**.
  2. Uključiti/isključiti dijeljenje lokacije s dispečerom.
  3. Provjeriti prikaz zadnjeg GPS očitanja.
- **Testni podaci:** Vozač; postavke lokacije.
- **Očekivani rezultat:** Postavka sačuvana; prikazani podaci o zadnjem očitanju lokacije.
- **Stvarni rezultat:** Postavka dijeljenja lokacije je sačuvana; prikazani su podaci o zadnjem GPS očitanju.
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.53: TC_DRIVER_009_Dijeljenje_lokacije

### TC_DRIVER_010 — Isključivanje GPS-a tokom smjene
- **Poslovni zahtjev:** Isključenje lokacije tokom aktivne smjene (bez aktivne vožnje) prekida smjenu.
- **Kriteriji prihvatanja:** Nakon potvrde isključenja GPS-a status prelazi u „Van smjene".
- **Testni scenarij:**
  1. Biti u smjeni (Dostupan), bez aktivne vožnje.
  2. U Postavkama isključiti GPS i potvrditi u dijalogu upozorenja.
- **Testni podaci:** Vozač u smjeni.
- **Očekivani rezultat:** Status „Van smjene"; smjena prekinuta; vozač više ne prima ponude.
- **Stvarni rezultat:** Nakon potvrde isključenja GPS-a status je prešao u „Van smjene", smjena je prekinuta i vozač više nije primao ponude.
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.54: TC_DRIVER_010_Gps_iskljucen

### TC_DRIVER_011 — Prijava kvara vozila (van funkcije)
- **Poslovni zahtjev:** Vozač mora moći prijaviti kvar vozila, što ga stavlja van funkcije.
- **Kriteriji prihvatanja:** Vozač prelazi u „Van funkcije"; aktivna vožnja se prekida; prikazana je napomena o potrebnoj intervenciji dispečera.
- **Testni scenarij:**
  1. Imati aktivnu vožnju i kliknuti **„Prijavi problem"** u kartici „Tok vožnje".
  2. Odabrati tip „Kvar vozila".
  3. Unijeti opis i poslati.
- **Testni podaci:** Tip: „Kvar vozila"; Opis: „Pukla guma".
- **Očekivani rezultat:** Status „Van funkcije"; poruka „Van funkcije — potrebna intervencija dispečera ili administratora prije nastavka rada.".
- **Stvarni rezultat:** Status je prešao u „Van funkcije", aktivna vožnja je prekinuta i prikazana je poruka „Van funkcije — potrebna intervencija dispečera ili administratora prije nastavka rada.".
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.55: TC_DRIVER_011_Kvar_vozila

### TC_DRIVER_012 — Prijava problema tokom vožnje (bez kvara vozila)
- **Poslovni zahtjev:** Vozač mora moći prijaviti problem dispečeru tokom vožnje.
- **Kriteriji prihvatanja:** Problem se šalje dispečeru; vozač ostaje operativan (vraća se u „Dostupan").
- **Testni scenarij:**
  1. Imati aktivnu vožnju i kliknuti „Prijavi problem".
  2. Odabrati tip (npr. „Saobraćajna gužva" / „Neispravna adresa").
  3. Unijeti opis i poslati.
- **Testni podaci:** Tip: „Saobraćajna gužva"; Opis: „Zastoj kod Skenderije".
- **Očekivani rezultat:** Toast „Problem je poslan dispečeru."; vozač „Dostupan".
- **Stvarni rezultat:** Prikazan je toast „Problem je poslan dispečeru."; vozač je ostao operativan u statusu „Dostupan".
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.56: TC_DRIVER_012_Problem_dispeceru

### TC_DRIVER_013 — Vozačka historija (bez brisanja)
- **Poslovni zahtjev:** Vozač mora vidjeti historiju vožnji, ali je ne smije brisati.
- **Kriteriji prihvatanja:** Ekran „Historija vožnji" prikazuje vožnje sa filterima i detaljima; vidljiva je napomena o zabrani brisanja; nema opcije brisanja.
- **Testni scenarij:**
  1. Otvoriti vozačku „Historija".
  2. Koristiti pretragu/filtere (Sve/Završene/Otkazane/Problem).
  3. Otvoriti „Detalji" jedne vožnje.
- **Testni podaci:** Vozač sa historijom vožnji.
- **Očekivani rezultat:** Lista, filteri i detalji rade; prikazana napomena da je brisanje historije zabranjeno; nema dugmeta za brisanje.
- **Stvarni rezultat:** Lista, filteri i detalji su radili ispravno; prikazana je napomena o zabrani brisanja, a opcija brisanja nije postojala.
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.57: TC_DRIVER_013_Vozac_historija

### TC_DRIVER_014 — Pregled zarade i statistike za smjenu
- **Poslovni zahtjev:** Vozač mora vidjeti zaradu, broj vožnji i pokazatelje za smjenu.
- **Kriteriji prihvatanja:** Ekran „Zarada" i statistike prikazuju ažurirane vrijednosti nakon završene vožnje (zarada, broj vožnji, stopa prihvatanja).
- **Testni scenarij:**
  1. Završiti barem jednu vožnju (TC_RIDE_028).
  2. Otvoriti vozačku „Zarada".
  3. Provjeriti zaradu, broj vožnji i statistike na „Početnoj".
- **Testni podaci:** Vozač sa najmanje jednom završenom vožnjom.
- **Očekivani rezultat:** Prikazane tačne vrijednosti zarade i broja vožnji; statistika ažurirana.
- **Stvarni rezultat:** Ekran „Zarada" i statistika prikazali su tačne, ažurirane vrijednosti zarade i broja vožnji nakon završene vožnje.
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.58: TC_DRIVER_014_Zarada_statistika

### TC_DRIVER_015 — Vozač van funkcije ne može započeti smjenu (negativan)
- **Poslovni zahtjev:** Vozač u statusu „Van funkcije" ne smije započeti smjenu bez intervencije dispečera.
- **Kriteriji prihvatanja:** Dok je vozač „Van funkcije", početak smjene je blokiran uz odgovarajuću poruku.
- **Testni scenarij:**
  1. Dovesti vozača u status „Van funkcije" (npr. preko prijave kvara vozila — TC_DRIVER_011, ili dispečer postavi „Van funkcije").
  2. Pokušati „Započni smjenu".
- **Testni podaci:** Vozač u statusu „Van funkcije".
- **Očekivani rezultat:** Početak smjene blokiran; poruka „Van funkcije — potrebna intervencija dispečera ili administratora.".
- **Stvarni rezultat:** Početak smjene je bio blokiran; prikazana je poruka „Van funkcije — potrebna intervencija dispečera ili administratora.".
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.59: TC_DRIVER_015_Van_funkcije_blok

---

# MODUL 4 — Dispečerski tok (TC_DISPATCH)

---

### TC_DISPATCH_001 — Prijava dispečera i pristup panelu
- **Poslovni zahtjev:** Dispečer mora pristupiti dispečerskoj konzoli nakon prijave.
- **Kriteriji prihvatanja:** Nakon prijave prikazuje se „Početna" sa KPI karticama, aktivnim vožnjama, vozačima i upozorenjima.
- **Testni scenarij:**
  1. Otvoriti prijavu i kliknuti **„Prijavi se kao dispečer"** (uz dispečerske podatke).
  2. Sačekati učitavanje konzole.
- **Testni podaci:** Dispečer `dispecer@urbanflow.ba` / `Test12345` (Šef smjene).
- **Očekivani rezultat:** Prikazana „Početna" sa KPI-jevima, listom aktivnih vožnji, vozačima i sekcijom „Za reagovanje".
- **Stvarni rezultat:** Nakon prijave prikazana je „Početna" sa KPI karticama, listom aktivnih vožnji, vozačima i sekcijom „Za reagovanje".
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.60: TC_DISPATCH_001_Pristup_panelu

### TC_DISPATCH_002 — Pregled vozača i vozila
- **Poslovni zahtjev:** Dispečer mora vidjeti sve vozače sa statusom, vozilom, zonom, ocjenom i GPS stanjem.
- **Kriteriji prihvatanja:** Ekran „Vozači" prikazuje listu sa statusima i upozorenjima; filteri (Svi/Dostupni/Zauzeti/Pauza/Van smjene/Van funkcije) rade.
- **Testni scenarij:**
  1. U navigaciji otvoriti **„Vozači"**.
  2. Pregledati listu i statuse.
  3. Primijeniti filter „Van funkcije".
- **Testni podaci:** Flota vozača (npr. Amir K. — dostupan, Mirza P. — van funkcije).
- **Očekivani rezultat:** Prikazani svi vozači s tačnim statusima i upozorenjima; filteri rade.
- **Stvarni rezultat:** Prikazani su svi vozači s tačnim statusima i upozorenjima; filteri (uklj. „Van funkcije") su radili ispravno.
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.61: TC_DISPATCH_002_Pregled_vozaca

### TC_DISPATCH_003 — Pregled vožnji i pretraga
- **Poslovni zahtjev:** Dispečer mora vidjeti sve vožnje/zahtjeve sa statusima i mogućnošću pretrage/filtriranja.
- **Kriteriji prihvatanja:** Ekran „Upravljanje vožnjama" prikazuje listu (Putnik, Ruta, Vozač, Status) sa filterima i pretragom.
- **Testni scenarij:**
  1. Otvoriti **„Vožnje"**.
  2. Koristiti pretragu (putnik/ruta/vozač) i filtere (Sve/Aktivne/Čekaju dodjelu/Problematične/Završene).
- **Testni podaci:** Postojeće vožnje i zahtjevi.
- **Očekivani rezultat:** Lista, filteri i pretraga rade; statusi i podaci tačni.
- **Stvarni rezultat:** Lista, filteri i pretraga su radili ispravno; statusi i podaci su bili tačni.
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.62: TC_DISPATCH_003_Pregled_voznji

### TC_DISPATCH_004 — KPI / statistika na Početnoj
- **Poslovni zahtjev:** Dispečer mora vidjeti ključne pokazatelje rada flote.
- **Kriteriji prihvatanja:** KPI kartice prikazuju: Aktivne vožnje, Dostupni vozači, Za reagovanje, Otvorene reklamacije, Zarada danas, Neuspješne.
- **Testni scenarij:**
  1. Otvoriti dispečersku „Početna".
  2. Provjeriti KPI vrijednosti u odnosu na stvarno stanje (npr. broj dostupnih vozača = lista).
- **Testni podaci:** Trenutno stanje sistema.
- **Očekivani rezultat:** KPI brojevi se podudaraju sa stvarnim stanjem liste vozača/vožnji.
- **Stvarni rezultat:** KPI vrijednosti su se podudarale sa stvarnim stanjem liste vozača i vožnji.
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.63: TC_DISPATCH_004_Kpi_statistika

### TC_DISPATCH_005 — Telefonski zahtjev (ručno kreiranje vožnje)
- **Poslovni zahtjev:** Dispečer mora moći kreirati vožnju za putnika koji zove telefonom.
- **Kriteriji prihvatanja:** Kreira se zahtjev sa imenom/telefonom putnika i relacijom; pojavljuje se u listi vožnji.
- **Testni scenarij:**
  1. Na „Vožnje" otvoriti formu **„Telefonski zahtjev"**.
  2. Unijeti „Ime putnika", „Telefon", „Polazište", „Odredište".
  3. Kliknuti **„Kreiraj zahtjev"**.
- **Testni podaci:** Ime: „Adi M."; Telefon: „+38762123456"; Polazište: Ilidža; Odredište: Centar.
- **Očekivani rezultat:** Toast „Telefonski zahtjev je kreiran."; zahtjev vidljiv u listi (status „Kreiran" / „Čeka dodjelu").
- **Stvarni rezultat:** Prikazan je toast „Telefonski zahtjev je kreiran."; zahtjev se pojavio u listi sa statusom „Čeka dodjelu".
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.64: TC_DISPATCH_005_Telefonski_zahtjev

### TC_DISPATCH_006 — Dodjela vožnje vozaču
- **Poslovni zahtjev:** Dispečer mora moći dodijeliti zahtjev konkretnom vozaču.
- **Kriteriji prihvatanja:** Vožnja se dodjeljuje; vozač prelazi u „Zauzet"; zahtjev postaje „Dodijeljen".
- **Testni scenarij:**
  1. Na „Vožnje" odabrati red koji čeka dodjelu (panel „Dodjela vozača").
  2. Pregledati „Predložene vozače" (AI predlog i ostali dostupni).
  3. Odabrati vozača i kliknuti **„Potvrdi dodjelu"**.
- **Testni podaci:** Zahtjev iz TC_DISPATCH_005; vozač: dostupan (npr. Eldar S.).
- **Očekivani rezultat:** Toast „Vožnja dodijeljena vozaču."; vozač „Zauzet"; status vožnje „Dodijeljena".
- **Stvarni rezultat:** Prikazan je toast „Vožnja dodijeljena vozaču."; vozač je prešao u „Zauzet", a vožnja u status „Dodijeljena".
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.65: TC_DISPATCH_006_Dodjela_voznje

### TC_DISPATCH_007 — Preraspodjela vožnje na drugog vozača
- **Poslovni zahtjev:** Dispečer mora moći prebaciti vožnju na drugog vozača.
- **Kriteriji prihvatanja:** Vožnja se preraspodjeljuje; prethodni vozač se oslobađa; akcija zabilježena.
- **Testni scenarij:**
  1. Otvoriti **„Detalji"** dodijeljene vožnje.
  2. U sekciji „Dodjela vozača" kliknuti **„Preraspodijeli"**.
  3. Odabrati drugog vozača i potvrditi.
- **Testni podaci:** Vožnja iz TC_DISPATCH_006; novi vozač: Senad B.
- **Očekivani rezultat:** Toast „Vožnja preraspodijeljena."; vožnja na novom vozaču; stari oslobođen.
- **Stvarni rezultat:** Prikazan je toast „Vožnja preraspodijeljena."; vožnja je prešla na novog vozača, a prethodni je oslobođen.
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.66: TC_DISPATCH_007_Preraspodjela

### TC_DISPATCH_008 — Promjena statusa vozača (intervencija)
- **Poslovni zahtjev:** Ovlašteni dispečer mora moći promijeniti status vozača.
- **Kriteriji prihvatanja:** Status vozača se mijenja; vozilo se usklađuje; akcija zabilježena u evidenciji.
- **Testni scenarij:**
  1. Na „Vozači" odabrati vozača.
  2. Odabrati novi status (npr. **„Van funkcije"** ili „Pauza").
  3. Potvrditi.
- **Testni podaci:** Vozač: Haris T.; Novi status: „Van funkcije".
- **Očekivani rezultat:** Toast „Status vozača je promijenjen."; status ažuriran; zapis u evidenciji.
- **Stvarni rezultat:** Prikazan je toast „Status vozača je promijenjen."; status je ažuriran i zabilježen u evidenciji.
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.67: TC_DISPATCH_008_Status_vozaca

### TC_DISPATCH_009 — Otkazivanje vožnje iz panela
- **Poslovni zahtjev:** Ovlašteni dispečer mora moći otkazati vožnju uz razlog.
- **Kriteriji prihvatanja:** Vožnja prelazi u „Otkazana"; vozač se oslobađa; akcija zabilježena.
- **Testni scenarij:**
  1. Otvoriti „Detalji" aktivne vožnje.
  2. U sekciji „Intervencija" unijeti „Razlog otkazivanja".
  3. Kliknuti **„Otkaži vožnju"**.
- **Testni podaci:** Aktivna vožnja; Razlog: „Putnik nedostupan".
- **Očekivani rezultat:** Toast „Vožnja je otkazana."; status „Otkazana"; vozač „Dostupan".
- **Stvarni rezultat:** Prikazan je toast „Vožnja je otkazana."; status je postao „Otkazana", a vozač „Dostupan".
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.68: TC_DISPATCH_009_Otkaz_voznje

### TC_DISPATCH_010 — Označavanje vožnje problematičnom
- **Poslovni zahtjev:** Dispečer mora moći označiti vožnju kao problematičnu.
- **Kriteriji prihvatanja:** Vožnja dobija status „Problematična" i pojavljuje se među upozorenjima/problemima.
- **Testni scenarij:**
  1. Otvoriti „Detalji" aktivne vožnje.
  2. U sekciji „Intervencija" kliknuti **„Označi problematičnom"**.
- **Testni podaci:** Aktivna vožnja.
- **Očekivani rezultat:** Toast „Vožnja je označena kao problematična."; status „Problematična"; stavka vidljiva u „Problemi".
- **Stvarni rezultat:** Prikazan je toast „Vožnja je označena kao problematična."; status je postao „Problematična" i stavka se pojavila u „Problemi".
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.69: TC_DISPATCH_010_Problematicna

### TC_DISPATCH_011 — Obrada reklamacije
- **Poslovni zahtjev:** Dispečer mora moći mijenjati status reklamacije i obavijestiti podnosioca.
- **Kriteriji prihvatanja:** Status reklamacije se mijenja (npr. u „Riješena"); podnosilac dobija obavještenje.
- **Testni scenarij:**
  1. Otvoriti **„Problemi"** → sekcija „Reklamacije".
  2. Odabrati reklamaciju i unijeti ishod.
  3. Promijeniti status u „Riješena".
- **Testni podaci:** Postojeća reklamacija; Ishod: „Odobren popust na sljedeću vožnju".
- **Očekivani rezultat:** Toast „Reklamacija je ažurirana."; status promijenjen; podnosilac obaviješten.
- **Stvarni rezultat:** Prikazan je toast „Reklamacija je ažurirana."; status je promijenjen u „Riješena", a podnosilac je obaviješten.
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.70: TC_DISPATCH_011_Obrada_reklamacije

### TC_DISPATCH_012 — Potvrda upozorenja (anomalije)
- **Poslovni zahtjev:** Dispečer mora moći potvrditi operativno upozorenje kako bi ga maknuo iz aktivnih.
- **Kriteriji prihvatanja:** Upozorenje se označava kao „Potvrđeno"; broj „Za reagovanje" se smanjuje.
- **Testni scenarij:**
  1. Na „Početna" ili „Problemi" otvoriti listu upozorenja („Za reagovanje").
  2. Na upozorenju kliknuti potvrdu (akcija „Potvrđeno").
- **Testni podaci:** Upozorenje „Vozač van funkcije" (Mirza P.).
- **Očekivani rezultat:** Upozorenje označeno „Potvrđeno"; KPI „Za reagovanje" smanjen; zapis u evidenciji.
- **Stvarni rezultat:** Upozorenje je označeno „Potvrđeno"; KPI „Za reagovanje" se smanjio i akcija je zabilježena u evidenciji.
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.71: TC_DISPATCH_012_Potvrda_upozorenja

### TC_DISPATCH_013 — Izvještaji (generisanje i izvoz)
- **Poslovni zahtjev:** Šef smjene mora moći generisati i izvesti izvještaje o radu flote.
- **Kriteriji prihvatanja:** Iz kataloga se otvara izvještaj, postavlja period/filteri, generiše i izvozi (PDF/CSV).
- **Testni scenarij:**
  1. Otvoriti **„Izvještaji"**.
  2. Iz kataloga odabrati izvještaj (npr. „Detaljni pregled vožnji").
  3. Postaviti period i kliknuti **„Generiši"**.
  4. Iskoristiti „Štampa / PDF" ili „Izvezi CSV".
- **Testni podaci:** Period: današnji dan; izvještaj „Detaljni pregled vožnji".
- **Očekivani rezultat:** Izvještaj generisan sa podacima; izvoz PDF/CSV radi.
- **Stvarni rezultat:** Izvještaj je generisan sa podacima za odabrani period; izvoz u PDF i CSV je radio ispravno.
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.72: TC_DISPATCH_013_Izvjestaji

### TC_DISPATCH_014 — Ovlasti po ulozi (RBAC prikaz)
- **Poslovni zahtjev:** Pristup funkcijama mora biti vezan uz ulogu dispečera (Dispečer / Senior dispečer / Šef smjene).
- **Kriteriji prihvatanja:** U Postavkama je prikazana uloga prijavljenog dispečera i matrica ovlasti; intervencijske akcije i izvještaji dostupni su prema ulozi.
- **Testni scenarij:**
  1. Otvoriti dispečerske **„Postavke"** → sekcija „Pristup i uloga".
  2. Provjeriti prikaz uloge „Šef smjene" i banner o punom pristupu.
  3. Pregledati sekciju „Ovlasti po ulozi" (Dispečer / Senior dispečer / Šef smjene).
- **Testni podaci:** Dispečer Šef smjene.
- **Očekivani rezultat:** Prikazana uloga „Šef smjene"; banner o pristupu izvještajima i evidenciji; matrica ovlasti tačna (intervencije za senior+, izvještaji za šefa smjene).
- **Stvarni rezultat:** Prikazana je uloga „Šef smjene" sa bannerom o punom pristupu; matrica „Ovlasti po ulozi" tačno prikazuje prava (intervencije za senior+, izvještaji za šefa smjene).
- **Status:** PASS
- **Komentari/poboljšanja:** Nalozi nižih uloga kreiraju se preko podrške; provjera blokade za niže uloge zahtijeva takav nalog. Nema uočenih problema.
- **Screenshot:** Slika 23.73: TC_DISPATCH_014_Ovlasti_uloga

### TC_DISPATCH_015 — Evidencija aktivnosti
- **Poslovni zahtjev:** Sve dispečerske akcije moraju biti zabilježene u centralnoj evidenciji.
- **Kriteriji prihvatanja:** Ekran „Evidencija aktivnosti" prikazuje zapise (dodjela, otkazivanje, promjena statusa, reklamacije) sa pretragom i filterima.
- **Testni scenarij:**
  1. Izvršiti nekoliko akcija (dodjela, promjena statusa vozača).
  2. Otvoriti **„Evidencija"**.
  3. Filtrirati po vrsti (npr. „Vožnja", „Vozač") i pretražiti.
- **Testni podaci:** Akcije iz prethodnih testova.
- **Očekivani rezultat:** Zapisi prisutni sa tačnim vremenom i opisom; filteri i pretraga rade.
- **Stvarni rezultat:** Zapisi su bili prisutni sa tačnim vremenom i opisom; filteri i pretraga su radili ispravno.
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.74: TC_DISPATCH_015_Evidencija

---

# MODUL 5 — UI/UX i validacije (TC_UIUX)

---

### TC_UIUX_001 — Onemogućeno potvrđivanje bez lokacija
- **Poslovni zahtjev:** Narudžba se ne smije poslati bez polazišta i odredišta.
- **Kriteriji prihvatanja:** Dok lokacije nisu odabrane, dugme prikazuje „Prvo odaberite lokacije" i nije aktivno.
- **Testni scenarij:**
  1. Otvoriti „Naruči".
  2. Ostaviti polazište/odredište prazne.
  3. Provjeriti stanje dugmeta za potvrdu.
- **Testni podaci:** Prazna polja lokacija.
- **Očekivani rezultat:** Dugme onemogućeno uz tekst „Prvo odaberite lokacije" / helper „Dodajte obje lokacije…".
- **Stvarni rezultat:** Dugme je bilo onemogućeno uz tekst „Prvo odaberite lokacije" i odgovarajući helper.
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.75: TC_UIUX_001_Prazna_polja

### TC_UIUX_002 — Odabir lokacije na karti i trenutna lokacija
- **Poslovni zahtjev:** Korisnik mora moći postaviti lokaciju klikom na kartu ili putem trenutne GPS lokacije.
- **Kriteriji prihvatanja:** Odabir na karti („Odaberi na mapi") i „Koristi moju trenutnu lokaciju" ispravno popunjavaju polje.
- **Testni scenarij:**
  1. Otvoriti „Naruči".
  2. Kliknuti „Odaberi na mapi" i odabrati tačku za polazište.
  3. Za odredište iskoristiti unos adrese.
- **Testni podaci:** Polazište preko karte; Odredište: Marijin Dvor.
- **Očekivani rezultat:** Polazište popunjeno odabranom tačkom; ruta i procjena se izračunavaju.
- **Stvarni rezultat:** Polazište je popunjeno odabirom na karti; ruta i procjena su se ispravno izračunale.
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.76: TC_UIUX_002_Odabir_na_karti

### TC_UIUX_003 — Prikaz mape sa rutom
- **Poslovni zahtjev:** Ruta vožnje mora biti prikazana na interaktivnoj karti.
- **Kriteriji prihvatanja:** Karta (OpenStreetMap / Leaflet) prikazuje polazište, odredište i liniju rute; zoom/pan rade.
- **Testni scenarij:**
  1. Odabrati polazište i odredište.
  2. Provjeriti markere i liniju rute.
  3. Zumirati i pomjerati kartu.
- **Testni podaci:** Relacija Centar → Ilidža.
- **Očekivani rezultat:** Karta prikazuje markere i rutu; interakcija radi.
- **Stvarni rezultat:** Karta je prikazala markere i liniju rute; zoom i pomjeranje su radili ispravno.
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.77: TC_UIUX_003_Mapa_ruta

### TC_UIUX_004 — GPS pristanak (dijalog)
- **Poslovni zahtjev:** Pri prvom korištenju lokacije korisnik mora dobiti dijalog za pristanak.
- **Kriteriji prihvatanja:** Prikazuje se dijalog „Dozvoliti GPS lokaciju?" sa opcijama „Dozvoli GPS" i „Ne sada"; izbor se poštuje.
- **Testni scenarij:**
  1. Kao novi/odjavljeni korisnik otvoriti „Naruči".
  2. Pratiti pojavu dijaloga o GPS pristanku.
  3. Testirati „Ne sada" (ručni unos i dalje moguć).
- **Testni podaci:** Putnik bez ranijeg GPS pristanka.
- **Očekivani rezultat:** Dijalog prikazan; nakon „Ne sada" moguć ručni unos adrese.
- **Stvarni rezultat:** Prikazan je dijalog „Dozvoliti GPS lokaciju?"; nakon „Ne sada" ručni unos adrese je i dalje bio moguć.
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.78: TC_UIUX_004_Gps_pristanak

### TC_UIUX_005 — Stanje učitavanja tokom traženja vozača
- **Poslovni zahtjev:** Tokom traženja vozača mora se prikazati indikator napretka.
- **Kriteriji prihvatanja:** Prikazani su animacija, lista kandidata i brojač „Vrijeme čekanja"; stanje se završava modalom ili porukom.
- **Testni scenarij:**
  1. Kreirati vožnju „Odmah".
  2. Promatrati ekran traženja vozača.
- **Testni podaci:** Relacija Baščaršija → Aerodrom Sarajevo.
- **Očekivani rezultat:** Prikazan indikator, „Tražimo najbližeg dostupnog vozača…" i brojač čekanja; završava se modalom „Vozač je pronađen".
- **Stvarni rezultat:** Prikazani su animacija, poruka „Tražimo najbližeg dostupnog vozača…" i brojač čekanja; stanje se završilo modalom „Vozač je pronađen".
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.79: TC_UIUX_005_Loading_trazenje

### TC_UIUX_006 — Prazna stanja (empty state)
- **Poslovni zahtjev:** Kada nema podataka, sistem treba prikazati jasno prazno stanje.
- **Kriteriji prihvatanja:** Prazne liste (npr. zakazane vožnje) prikazuju poruku umjesto praznog ekrana.
- **Testni scenarij:**
  1. Otvoriti „Zakazane" kada nema zakazanih vožnji.
- **Testni podaci:** Putnik bez zakazanih vožnji.
- **Očekivani rezultat:** Prikazano „Nemate zakazanih vožnji" / „Trenutno nemate zakazanih vožnji." sa uputom.
- **Stvarni rezultat:** Prikazano je prazno stanje „Nemate zakazanih vožnji" sa uputom, umjesto praznog ekrana.
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.80: TC_UIUX_006_Empty_state

### TC_UIUX_007 — Promjena jezika (BS/EN)
- **Poslovni zahtjev:** Aplikacija mora podržati promjenu jezika prikaza.
- **Kriteriji prihvatanja:** Prebacivanje jezika (BS/EN) osvježava tekstove dosljedno, bez nedostajućih ključeva.
- **Testni scenarij:**
  1. Na početnom/welcome ekranu ili u postavkama promijeniti jezik (BS ⇄ EN).
  2. Provjeriti ključne ekrane (naručivanje, navigacija).
- **Testni podaci:** Jezik: Bosanski / English.
- **Očekivani rezultat:** Tekstovi se mijenjaju dosljedno; nema „raw" ključeva.
- **Stvarni rezultat:** Promjena jezika (BS ⇄ EN) dosljedno je osvježila tekstove; nije bilo nedostajućih ključeva.
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.81: TC_UIUX_007_Jezik

### TC_UIUX_008 — Obavještenja (zvono / lista)
- **Poslovni zahtjev:** Korisnik mora moći pregledati obavještenja i označiti ih pročitanima.
- **Kriteriji prihvatanja:** Otvaranjem zvona prikazuje se lista obavještenja; „Pročitaj sve" označava sve kao pročitano.
- **Testni scenarij:**
  1. Generisati obavještenja (npr. kreiranje/završetak vožnje).
  2. Otvoriti zvono (Obavještenja).
  3. Kliknuti „Pročitaj sve".
- **Testni podaci:** Putnik sa obavještenjima.
- **Očekivani rezultat:** Lista prikazana, grupirana po vremenu; „Pročitaj sve" uklanja oznake nepročitanog.
- **Stvarni rezultat:** Lista obavještenja je prikazana grupirana po vremenu; „Pročitaj sve" je uklonio oznake nepročitanog.
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.82: TC_UIUX_008_Obavjestenja

### TC_UIUX_009 — Navigacija (donja navigacija na mobilnom)
- **Poslovni zahtjev:** Korisnik se mora moći kretati kroz glavne sekcije putem navigacije.
- **Kriteriji prihvatanja:** Stavke navigacije (Naruči, Zakazane, Aktivna, Historija, Postavke) otvaraju odgovarajuće ekrane; aktivna stavka je istaknuta.
- **Testni scenarij:**
  1. Na mobilnom prikazu redom kliktati stavke donje navigacije.
- **Testni podaci:** Putnik na mobilnom prikazu (≤768px).
- **Očekivani rezultat:** Navigacija mijenja ekrane ispravno; aktivna stavka označena.
- **Stvarni rezultat:** Navigacija je ispravno mijenjala ekrane; aktivna stavka je bila istaknuta.
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.83: TC_UIUX_009_Navigacija

### TC_UIUX_010 — Banner aktivne vožnje kroz navigaciju
- **Poslovni zahtjev:** Dok traje aktivna vožnja, banner mora biti vidljiv pri navigaciji.
- **Kriteriji prihvatanja:** Banner „Aktivna vožnja u toku — Prati vožnju" ostaje prikazan i vodi nazad na aktivnu vožnju.
- **Testni scenarij:**
  1. Imati aktivnu vožnju.
  2. Otvoriti druge ekrane (Historija, Postavke).
  3. Kliknuti banner.
- **Testni podaci:** Aktivna vožnja.
- **Očekivani rezultat:** Banner perzistira i vraća na ekran aktivne vožnje.
- **Stvarni rezultat:** Banner „Aktivna vožnja u toku — Prati vožnju" ostao je prikazan kroz navigaciju i vratio na ekran aktivne vožnje.
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.84: TC_UIUX_010_Banner_aktivne

### TC_UIUX_011 — Status badge i boje statusa
- **Poslovni zahtjev:** Statusi vožnji/vozača trebaju biti vizuelno razlikovni.
- **Kriteriji prihvatanja:** Različiti statusi imaju dosljedne, čitljive boje (npr. Završena, Otkazana, U toku, Problematična).
- **Testni scenarij:**
  1. Otvoriti listu sa vožnjama/vozačima različitih statusa (Historija ili dispečerski pregled).
  2. Provjeriti boje i čitljivost oznaka statusa.
- **Testni podaci:** Stavke različitih statusa.
- **Očekivani rezultat:** Boje dosljedne i razlikuju statuse; dovoljan kontrast.
- **Stvarni rezultat:** Boje statusa su bile dosljedne i razlikovale su statuse uz dovoljan kontrast.
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.85: TC_UIUX_011_Status_boje

### TC_UIUX_012 — Obavezan razlog otkazivanja (validacija)
- **Poslovni zahtjev:** Pri otkazivanju vožnje razlog je obavezan.
- **Kriteriji prihvatanja:** U modalu „Otkaži vožnju" dugme „Potvrdi otkaz" je onemogućeno dok razlog nije unesen.
- **Testni scenarij:**
  1. Na aktivnoj vožnji otvoriti „Otkaži vožnju".
  2. Ostaviti polje „Razlog otkazivanja" prazno.
  3. Provjeriti stanje dugmeta „Potvrdi otkaz".
- **Testni podaci:** Aktivna vožnja; razlog prazan.
- **Očekivani rezultat:** „Potvrdi otkaz" onemogućen dok se ne unese razlog.
- **Stvarni rezultat:** Dugme „Potvrdi otkaz" je bilo onemogućeno dok razlog nije unesen.
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.86: TC_UIUX_012_Obavezan_razlog

### TC_UIUX_013 — Prikaz i uređivanje profila (validacija)
- **Poslovni zahtjev:** Korisnik mora moći urediti kontakt podatke uz validaciju.
- **Kriteriji prihvatanja:** Validne izmjene se spremaju; nevažeći unos (npr. neispravan telefon/e-mail) se odbija uz poruku.
- **Testni scenarij:**
  1. Otvoriti „Postavke" → „Profil".
  2. Izmijeniti podatak i kliknuti „Sačuvaj".
  3. Unijeti nevažeći format (npr. neispravan telefon) i pokušati sačuvati.
- **Testni podaci:** Validan unos te zatim nevažeći telefon.
- **Očekivani rezultat:** Validne izmjene → „Podaci sačuvani."; nevažeći unos → validacijska poruka, bez spremanja.
- **Stvarni rezultat:** Validne izmjene su sačuvane uz poruku „Podaci sačuvani."; nevažeći telefon je odbijen uz validacijsku poruku.
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.87: TC_UIUX_013_Uredjivanje_profila

### TC_UIUX_014 — Potvrda brisanja kompletne historije (2 koraka)
- **Poslovni zahtjev:** Brisanje kompletne historije mora tražiti višestruku potvrdu.
- **Kriteriji prihvatanja:** Otvara se dvostepeni dijalog („Nastavi" → konačna potvrda); tek nakon konačne potvrde historija se briše.
- **Testni scenarij:**
  1. Otvoriti „Historija" i kliknuti „Obriši kompletnu historiju".
  2. Proći korak 1 („Nastavi"), zatim korak 2 („Da, obriši historiju").
- **Testni podaci:** Putnik sa historijom.
- **Očekivani rezultat:** Dvostepena potvrda; nakon završetka prikaz „Historija je obrisana iz aplikacije…".
- **Stvarni rezultat:** Prikazana je dvostepena potvrda; nakon konačne potvrde historija je obrisana uz poruku „Historija je obrisana iz aplikacije…".
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.88: TC_UIUX_014_Brisanje_historije

### TC_UIUX_015 — Responsivni prikaz (mobilni vozački interfejs)
- **Poslovni zahtjev:** Vozački interfejs mora biti prilagođen mobilnom prikazu.
- **Kriteriji prihvatanja:** Na uskoj širini prikazuje se mobilni layout sa donjom navigacijom (Početna, Aktivna, Historija, Zarada, Postavke), bez horizontalnog scrolla.
- **Testni scenarij:**
  1. Prijaviti se kao vozač.
  2. Otvoriti mobilni prikaz (npr. širina 390px).
  3. Provjeriti raspored kartica i donju navigaciju.
- **Testni podaci:** Vozač; širina ekrana ≤768px.
- **Očekivani rezultat:** Uredan mobilni layout; donja navigacija funkcionalna; bez horizontalnog scrolla.
- **Stvarni rezultat:** Mobilni layout je bio uredan, donja navigacija funkcionalna i bez horizontalnog scrolla.
- **Status:** PASS
- **Komentari/poboljšanja:** Nema uočenih problema.
- **Screenshot:** Slika 23.89: TC_UIUX_015_Responsivni_prikaz

---

## Sažetak pokrivenosti

| Modul | Prefiks | Broj test caseova | PASS | Preporuka zadatka |
|---|---|---|---|---|
| Autentifikacija | TC_AUTH | 14 | 14 | 10–15 |
| Upravljanje vožnjama | TC_RIDE | 30 | 30 | 20–30 |
| Upravljanje vozačima | TC_DRIVER | 15 | 15 | 10–15 |
| Dispečerski tok | TC_DISPATCH | 15 | 15 | 10–15 |
| UI/UX i validacije | TC_UIUX | 15 | 15 | 10–20 |
| **Ukupno (ovaj dokument)** | | **89** | **89** | **60–95** |

**Rezultat izvršenja:** 89/89 test caseova **PASS**, 0 FAIL, 0 BLOCKED.

> **Prijedlozi za dodatno testiranje (opciono):**
> - Istek odbrojavanja za potvrdu vozača (vožnja se automatski poništava ako putnik ne potvrdi na vrijeme) — pokriveno u TC_RIDE_017.
> - Upozorenje vozaču pri padu prosječne ocjene ispod 4.0.
> - Upozorenje administraciji nakon učestalih neopravdanih otkazivanja vozača.
> - Anomalija „Stari GPS signal" (lokacija nije osvježena duže od 10 min) u dispečerskom panelu.
> - Perzistencija stanja nakon osvježavanja stranice (aktivna vožnja, historija, postavke).
