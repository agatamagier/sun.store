# sun.store — listing produktów (zadanie rekrutacyjne)

Strona listingu produktów fotowoltaicznych (panele, baterie, akcesoria) z filtrowaniem,
wyszukiwaniem i sortowaniem po stronie serwera, ze stanem filtrów w URL i SSR.

- **Live:** _https://sun-store-project.vercel.app/
- **Repo:** _https://github.com/agatamagier/sun.store

---

## Uruchomienie

```bash
pnpm install
pnpm dev            # http://localhost:3000

pnpm build          # build produkcyjny (Nitro)
pnpm preview        # podgląd builda

pnpm typecheck      # vue-tsc, TypeScript w trybie strict
pnpm test           # testy jednostkowe (Vitest)
pnpm test:e2e       # testy e2e (Playwright) — wymaga przeglądarki (patrz niżej)
```

Wymagania: Node 22, pnpm.

## Stack

Nuxt 4 · Vue 3 (Composition API) · TypeScript **strict** · Nitro · Nuxt UI v4 (Tailwind v4) ·
`csv-parse` · `@vueuse/core` · Vitest · Playwright.

## Architektura w skrócie

```
server/
  data/products.csv          # źródło danych (dołączane jako Nitro server asset)
  api/products.get.ts         # endpoint: filtrowanie/search/sort + opcje filtrów po stronie serwera
  utils/
    spec.ts                   # ekstrakcja kWh/W (czyste funkcje, testowane)
    filter.ts                 # queryProducts: filtry + sort + opcje filtrów (czyste, testowane)
    products.ts               # wczytanie + parsowanie CSV + cache w pamięci
shared/
  types/product.ts            # wspólne typy domenowe
  utils/filters.ts            # normalizeFilters (walidacja+defaulty) / serializeFilters — app i serwer
app/
  pages/index.vue             # listing: SSR useFetch sterowany query z URL + dynamiczne SEO
  components/                 # ProductFilters, ProductToolbar, ProductCard
  composables/useProductFilters.ts  # synchronizacja filtrów z URL (router.push → back działa)
  utils/format.ts             # formatowanie ceny / kWh / W / etykiet kategorii
test/                         # testy jednostkowe (spec, filter, filters, products)
tests/e2e/filters.spec.ts     # scenariusze e2e
```

Całość to **13 plików źródłowych, ~1,1 tys. linii** — świadomie małe, jednozadaniowe moduły
(konwencja file-based Nuxt), a nie jeden duży plik. Logika domenowa siedzi w `spec.ts` i
`filter.ts`; reszta to cienki UI i typy.

---

## 1. Kluczowe decyzje i dlaczego

- Cała logika filtrów po stronie serwera w `/api/products`. Strona (`index.vue`) robi
  `useFetch` z `query` równym `route.query`, więc żądanie SSR dla linku z filtrami od razu
  renderuje właściwe wyniki. Endpoint zwraca też opcje filtrów (`filterOptions` : dostępni producenci z licznikami,
  zakres cen, zakres kWh/W), którymi zasilany jest UI filtrów.
- Stan filtrów w URL jako jedyne źródło prawdy. `useProductFilters` czyta filtry z
  `route.query` i zapisuje je przez `router.push` (nowy wpis w historii → przycisk „wstecz”)
  Dzięki temu link jest współdzielny, a SSR i klient widzą ten sam stan. 
  `useFetch` ma `watch: [() => route.query]`, więc odświeża dane także przy „wstecz/dalej”.
- Jedna definicja znaczenia URL w `shared/utils/filters.ts` (`normalizeFilters` /
  `serializeFilters`), używana i przez serwer, i przez klienta — nie ma ryzyka, że obie strony
  różnie zinterpretują ten sam link. `normalizeFilters` jest też walidacją
- CSV czytany i parsowany raz, cache w pamięci modułu. Plik dołączony
  jako Nitro server asset (`nitro.serverAssets`), więc jest dostępny również w środowisku
  serverless (Vercel), a nie tylko przy odczycie z dysku lokalnego.
- `csv-parse` zamiast ręcznego `split(',')` — opisy zawierają przecinki i są cytowane więc split by nie zadziałał.


## 2. Jak pozyskałam kWh/W i przypadki brzegowe

W CSV nie ma osobnej kolumny — wartości wyciągam z `name` i `description`, zależnie od kategorii:

| Kategoria | Metryka | Przykład |
|---|---|---|
| `battery` | pojemność **kWh** | „A 10kWh LiFePO4 battery” |
| `solar panel` | moc **W** | „an impressive 450W output” |
| `connector` | **brak** (A / V / AWG) | „inline 15A fuse, 1500V” → `null` |

Strategia (`server/utils/spec.ts`):

- Szukam kWh i W a opisie (ma jawną jednostkę), fallback z liczby w nazwie gdy opis nie ma jednostki.
- Wiele liczb w opisie → wybieram tę zgodną z liczbą w nazwie. Np. „The 7.5kWh … stack up to
  four units for a total of 30kWh” daje poprawnie 7.5, a „This 10.5kWh … three 3.5kWh
  modules” daje 10.5.
- Regexy z granicami: `W\b` nie łapie „W” wewnątrz „k**W**h” ani „A**W**G”; „kWh”
  case-insensitive. Dzięki temu konektory („12 AWG”, „1500V”) nie dają fałszywych trafień mocy.
- Wartości dziesiętne (2.5, 13.5) obsłużone.
- Connector → `capacityKwh=null`, `powerW=null`, `specValue=null`; w UI filtr i sortowanie po
  wydajności są wtedy nieaktywne(kWh i W są nieporównywalne, więc nie mieszam ich w jednym
  sortowaniu — metryka zależy od wybranej kategorii).
- Dane niepoprawne: wiersz bez nazwy lub z nieznaną kategorią jest pomijany; brak liczby →
  bezpieczne `null`.

Pokryte testami w `test/spec.test.ts` (w tym przypadki „30kWh” i „AWG/1500V”).

## 3. Indeksowanie kombinacji filtrów w wyszukiwarkach

Indeksowalne są tylko: pełny katalog (`/`) oraz widoki per-kategoria
(`?category=…`) — mają `robots: index,follow`. Kombinacje (producent, cena, kWh/W,
wyszukiwanie, paginacja) dostają `noindex,follow`, żeby nie marnować budżetu indeksowania i nie
tworzyć duplikatów, zachowując przy tym przejście robota do produktów. Docelowo dodałbym
`canonical` do wersji per-kategoria, `sitemap.xml` z białą listą wartościowych kombinacji
(np. popularni producenci).

## 4. Czego celowo nie zrobiłam i co dalej

- Dwustronny slider dla ceny/wydajności — użyłam pól min/max (prostsze, dobre pod testy).
- Brak strony produktu, logowania, panelu — to nastepne kroki.
- Mając wiecej czasu zrobilabym: `sitemap` + `canonical`, nagłówki cache na `/api/products`,
  wirtualizacja/paginacja kursora przy znacznie większych zbiorach, i18n (dane są po angielsku,
  UI po angielsku), zmniejszenie server-bundle ikon, oraz debounce-owany URL dla pól liczbowych.

## 5. Lighthouse

Strona listingu (`/?category=battery`), build produkcyjny (`pnpm build && pnpm preview`),
Lighthouse 12, Chrome headless.

| Kategoria | Desktop | Mobile |
|---|---:|---:|
| **Performance** | **95** | **62** |
| Accessibility | 96 | 96 |
| Best Practices | 100 | 100 |
| SEO | 100 | 100 |

- **Desktop** (reprezentatywne dla narzędzia pracy B2B): FCP 1.1 s · LCP 1.2 s · TBT 10 ms · CLS 0.
- **Mobile**: FCP 5.7 s · LCP 6.2 s · TBT 110 ms · CLS 0.

Niższy wynik mobile wynika z czasu pierwszego renderu (render-blocking CSS Nuxt UI przy
symulacji slow-4G + 4× throttling CPU); interaktywność (TBT) i stabilność układu (CLS) są bardzo
dobre. Raporty HTML w repo: [`lighthouse-desktop.report.html`](./lighthouse-desktop.report.html)
oraz [`lighthouse-report.report.html`](./lighthouse-report.report.html).

> Uwaga: pomiar lokalny był robiony za firmowym proxy, które blokuje pobieranie
> web-fontów/ikon z internetu — dlatego zdecydowałem się na systemowy stack fontów i lokalną
> kolekcję ikon (`@iconify-json/lucide`), co jest też lepsze wydajnościowo. Na docelowym hostingu
> (Vercel) wynik, zwłaszcza mobile, powinien być wyższy.

## 6. Jak korzystałam z AI

Rozwiązanie powstało w parze z **Claude Code** (agent w terminalu) — zgodnie z zachętą w zadaniu.
AI użyłam do: poczatkowej struktury projektu, logiki ekstrakcji kWh/W i filtrowania, komponentów UI, testów
jednostkowych i e2e oraz do diagnozy problemów. Miejsca, gdzie wynik AI wymagał mojej korekty:

- `<SelectItem>` z pustą wartością — pierwsza wersja miała opcję „All categories” z
  `value=''`, czego biblioteka zabrania; pusty string jest zarezerwowany do czyszczenia
  selecta. Efekt: błąd renderowania, strona była nieinteraktywna. Poprawka:
 mapowanie na `null`.
-Zdublowane instancje Vue po zmianie wersji TypeScript  objawiało się „missing template or render function”. Naprawione reinstalacją
- `vue-tsc` niezgodny z TypeScript 7 (natywny port) — cofnięcie do linii TS 5.x.
- Testy e2e — Playwrightowy `fill()` nie wyzwala listenera UInput, a wszystkie checkboxy
  dziedziczyły jedną nazwę dostępną z `UFormField`. Poprawiłam to u źródła (lepsza dostępność:
  `<fieldset>`/`<legend>` zamiast jednej etykiety grupowej), dodałam marker
  hydracji i przepisałam scenariusze testu na poporawne komponenty.
- Lighthouse 13 niezgodny z Node 22 — użycie wersji 12.
- Odświeżanie danych przy „wstecz” — dodanie `watch: [() => route.query]` do `useFetch`.

Wnioski: AI przyspiesza szkielet i logikę, ale integracja z konkretną wersją biblioteki
komponentów (reka-ui/Nuxt UI), specyfika środowiska (proxy, wersje narzędzi) i realne zachowanie
w przeglądarce wymagały weryfikacji i poprawek z mojej strony.

## 7. Ile czasu zajęło

Ok. **4–4,5 h** łącznie z README. Istotna część poszła na problemy środowiskowe (firmowe proxy
blokujące pobieranie szablonów/fontów/przeglądarek, deduplikacja zależności, quirki Playwrighta
z inputem Nuxt UI), a nie na samą logikę zadania — tę udało się zamknąć szybko dzięki wydzieleniu
czystych, testowalnych funkcji.

---

## Wdrożenie (Vercel)

Projekt jest gotowy pod Vercel (Nitro wykrywa preset automatycznie):

1. Zaimportuj repo w Vercel.
2. Framework preset: **Nuxt** (wykrywany automatycznie), build: `pnpm build`.
3. Deploy — CSV jedzie w buildzie jako server asset, więc nie trzeba nic konfigurować.

Lokalnie e2e korzystają z systemowej przeglądarki, gdy pobranie przeglądarki Playwright jest
zablokowane: `E2E_CHANNEL=chrome pnpm test:e2e` (lub `msedge`). W normalnym środowisku wystarczy
`pnpm exec playwright install chromium` i `pnpm test:e2e`.
