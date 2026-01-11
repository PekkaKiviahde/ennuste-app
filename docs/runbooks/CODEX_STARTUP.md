# Codex-kaynnistys (Next-UI)

Tama runbook on tarkoitettu Codexille: lue aina ennen dev-ympariston kaynnistamista.

## Miksi
- Express-UI on poistettu: kayta aina Next-UI:ta.
- Vahennetaan virhetiloja (vaarat kontit, vaara portit).

## Kaynnistys (suositus)
1) Varmista, etta vain DB + pgAdmin + Next-UI kaynnistetaan:

```bash
docker compose -f docker-compose.yml -f docker-compose.next.yml up -d --remove-orphans db pgadmin web_next
```

2) Avaa UI:
- `http://localhost:3000`

## Pysaytys
```bash
docker compose -f docker-compose.yml -f docker-compose.next.yml down
```

## Ongelmatilanteet
- Virhe: "Express-UI poistettu. Kayta Next-UI:ta."
  - Kaynnista vain `web_next` (komento ylla).
- Orpokontit:
  - Aja sama kaynnistyskomento `--remove-orphans` -lipulla.
