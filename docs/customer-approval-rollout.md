# Odobravanje novih kupaca — aktiviranje

Kod je pripremljen za pregled. **Ne spajati u produkciju pre podešavanja serverskog tokena i usaglašenog aktiviranja pravila/baze.** GitHub merge sam ne postavlja Firebase pravila niti privatnost Sanity baze.

## Ponašanje

- Nove registracije unose ime, firmu, PIB, adresu, telefon i mejl; dobijaju `approvalStatus: pending`.
- Vlasnik `nikola.borisavljevic.bgd@gmail.com` dobija stavku **Korisnici**, pretragu, pregled podataka i odobravanje/odbijanje sa potvrdom. Odobrenje automatski dodaje prodavnicu, bez duplikata pri ponovnom pokušaju.
- Nalozi kreirani u Firebase Authentication pre **4. septembra 2026. u 16:55:23 po vremenu u Srbiji** zadržavaju pristup, osim ako vlasnik izričito odbije/ukine pristup. Koristi se Firebase creation time, ne promenljivi datum u profilu.
- Neodobreni korisnici vide javni katalog bez cena i poruku da čekaju odobrenje. Mogu dopuniti svoje podatke. Status se proverava pri prijavi, vraćanju u prozor, klikom na proveru i svakih 30 sekundi. API proverava odobrenje pri svakom zahtevu za zaštićene podatke/poručivanje.
- Lozinke ostaju u Firebase Authentication; ne prikazuju se vlasniku i ne čuvaju u profilima.

## Potrebna podešavanja izvan GitHub-a

1. Sačuvati postojeća Firebase pravila i rezervne kopije podataka. Uporediti `firestore.rules` sa aktivnim pravilima i proveriti eventualne druge aplikacije: priložena pravila zatvaraju sve kolekcije osim `users`, jedine koju ovaj kod koristi. Za proveru su potrebna vlasnička prava u Firebase projektu `marbok-3a9e2`.
2. U Sanity projektu `xkw8ym5s` napraviti nov serverski token sa dozvolama za čitanje sadržaja, pisanje prodavnica/porudžbina i upload dokumenata. Dodati ga u Vercel Environment Variables kao **SANITY_API_TOKEN**, za Production i kontrolisani Preview. Bez prefiksa `NEXT_PUBLIC_`. Ne unositi token u GitHub niti slati u poruci.
3. Testirati pregled ove grane uz podešen token. Koristiti odvojenu Firebase/Sanity testnu konfiguraciju za stvarne probne registracije; automatizovani testovi u repozitorijumu koriste samo lokalni demo projekat.
4. Tokom usaglašenog puštanja objaviti `firestore.rules` za `marbok-3a9e2`, objaviti ovaj kod i postaviti Sanity dataset `production` na **private**. Privatni dataset zahteva odgovarajući Sanity plan (prema dokumentaciji Growth ili viši). Uskladiti redosled sa vlasnikom produkcije; između koraka ne smatrati kontrolu pristupa aktivnom. Ako je potrebna pauza za radove, obavestiti korisnike pre početka.
5. Opozvati stari Sanity token koji je ranije bio u klijentskom kodu, nakon prelaska na novi serverski token. Proveriti stare Vercel deploymente i zaštititi/isključiti dostupnost zastarelih verzija aplikacije. Stare verzije ne treba vraćati u produkciju sa izloženim tokenom.
6. Proveriti anonimni Sanity upit: mora biti odbijen nakon promene na private. Ako je dataset i dalje public, sakrivanje cena na sajtu ne sprečava direktno čitanje cena iz baze. Provera pre ove izmene pokazala je da javni upit prolazi.

Firebase pravila mogu da se objave iz Firebase Console → Firestore Database → Rules, ili autorizovanim CLI nalogom:

```sh
firebase deploy --only firestore:rules --project marbok-3a9e2
```

## Provera nakon aktiviranja

1. Postojeći kupac se prijavljuje i vidi cene; vlasnik vidi Korisnici/Prodavnice/Porudžbine i postojeći Excel izvoz.
2. Novi probni kupac se registruje sa kompletnim podacima: ne dobija cene ni mogućnost poručivanja; podaci su vidljivi vlasniku u Korisnici → Na čekanju.
3. Provera direktnog poziva `/api/content?kind=categories` tokenom tog kupca: nema cena. `/api/orders/create` vraća 403. Anonimni HTML/Next page data ne sadrži cene, porudžbine ili listu prodavnica.
4. Vlasnik odobri; kupac klikne Proveri status i dobija cene/poručivanje. Odobrenje iz korisničkog zahteva sa tuđim email poljem mora biti odbijeno.
5. Vlasnik ukine pristup; dalji zahtevi za poručivanje su blokirani. Drugi kupac ne može da otvori tuđu porudžbinu niti profil.
6. Proveriti PDF, Excel, izbor proizvoda kroz kategorije i štampu.

## Posledice promene pristupa

- Nova porudžbina je vezana za Firebase UID; otvaraju je njen kupac i vlasnik. Stare porudžbine bez UID-a otvara vlasnik. Ranije javni link do stranice porudžbine sada traži prijavu; PDF/Excel deljenje ostaje dostupno vlasniku.
- Korpa je odvojena po prijavljenom korisniku. Stara zajednička korpa iz prethodne verzije se ne prenosi automatski jer nije imala pouzdanu vezu sa nalogom.
- Cene porudžbine računa server iz aktuelnih proizvoda. Excel i mejl koriste te potvrđene cene.
- Deljeni/preuzeti PDF i Excel dokumenti, kao i ranije distribuirani linkovi do Sanity fajlova, nisu opozvani ovim kodom. Sanity fajlovi se razlikuju od pristupa dokumentima baze; privatnost dataseta sama ne čini ranije deljene fajlove privatnim.
- EmailJS slanje obaveštenja zadržava postojeću konfiguraciju; ova izmena ne potvrđuje da je dostava mejla podešena.

## Izvršene provere

- `npm run build` — uspešan produkcioni build.
- `node --experimental-vm-modules --test tests/*.test.mjs` — 34 testa: odobrenje, postojeći nalozi, odbijanje, lažni podaci, cene, poručivanje, admin pristup i postojeći PDF/Excel/izbor proizvoda.
- `node tests/firestore-rules.emulator.mjs` uz Firestore emulator sa pravilima iz repozitorijuma — 21 provera prava pristupa u izolovanom `demo-marbok-approval` projektu.
- Produkciona pravila, privatnost dataseta, opoziv tokena i prijava stvarnim nalozima nisu promenjeni niti potvrđeni ovim lokalnim proverama.

Dokumentacija: [Firebase pravila](https://firebase.google.com/docs/firestore/security/get-started), [Sanity privatnost podataka](https://www.sanity.io/docs/content-lake/keeping-your-data-safe), [Sanity datasets i planovi](https://www.sanity.io/docs/content-lake/datasets).
