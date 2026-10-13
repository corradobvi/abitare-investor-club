# AbitaRE Investor Club

App separata dal CRM che legge i clienti investitori dal CRM (in sola lettura) e
raccoglie il loro profilo d'investimento. In futuro diventera' una sezione del CRM:
stesso stack, stesse convenzioni, tabelle con prefisso `Club`.

## Configurazione

Copia `.env.example` in `.env` e compila (il file `.env` non va MAI su GitHub):

- `CLUB_DATABASE_URL` — database dell'Investor Club (URL pubblico).
- `CRM_LETTURA_DATABASE_URL` — database del CRM con l'utente `investor_club_lettura`
  (solo SELECT su Cliente, ClienteRuolo, ClienteTag, Tag, User).
- `AUTH_SECRET` — chiave casuale per le sessioni di login (es. `npx auth secret`).

## Avvio in locale

```
cd C:\Users\apasserini\Sviluppo\abitare-investor-club
npm run dev
```

Poi apri:

- http://localhost:3000/login — accesso con le credenziali del CRM.
- http://localhost:3000/ — elenco investitori (Admin, Marketing Manager e
  Consulente Senior vedono tutti; il Consulente solo i clienti di cui e' referente).
- http://localhost:3000/investitori/<id> — scheda con profilo e invito al Club.
- http://localhost:3000/c/<token> — link personale del cliente (per ora segnaposto).
- http://localhost:3000/verifica — solo numeri; in produzione risponde 404.

Per fermare l'app: Ctrl+C nella finestra.

## Comandi utili

- `npx prisma migrate deploy` — applica le migrazioni al database del Club.
- `npm run db:impostazioni` — scrive le impostazioni iniziali (rieseguibile, non crea doppioni).
