# Migraatio: JSONB → normalisoitu (hallittu malli)

## Milloin nostetaan JSONB-kenttä sarakkeeksi/tauluksi?
Nosta, kun jokin avain:
- on usein suodatuksen/järjestyksen kohteena (WHERE/ORDER BY)
- on raportoinnin ytimessä (aggregointi, BI, KPI:t)
- vaatii tiukan validoinnin (päivämäärä, numerot, enumit)
- on kriittinen integraatioille (export/import)

## Vaiheistus (suositus)
1) **Add**
   - lisää uusi sarake tai taulu (esim. `projects.start_date date`)
2) **Backfill**
   - backfill existing data:
     - `update projects set start_date = (project_details->>'start_date')::date where start_date is null;`
3) **Dual-read (siirtymä)**
   - luku ensisijaisesti uudesta, fallback JSONB:stä jos null
4) **Dual-write (valinnainen)**
   - kirjoita uuteen + päivitä myös JSONB (jos backward compatibility vaatii)
   - tai kirjoita vain uuteen ja pidä JSONB “legacy read-only”
5) **Cutover**
   - poista fallback ja tee uudesta “source of truth”
6) **Cleanup**
   - poista vanha JSONB-avain (tai jätä historialliseksi)

## Esimerkki: project_details.start_date → projects.start_date
### 1) Add
```sql
alter table projects add column start_date date;
create index idx_projects_start_date on projects(start_date);
```

### 2) Backfill
```sql
update projects
set start_date = (project_details->>'start_date')::date
where start_date is null
  and project_details ? 'start_date';
```

### 3) Dual-read (pseudokoodi)
- `startDate = row.start_date ?? row.project_details.start_date`

## Checklist ennen tuotantoon vientiä
- [ ] Backfill ajettu ja verifioitu
- [ ] Uusi indeksi lisätty (jos tarpeen)
- [ ] Sovellus lukee uutta kenttää ensisijaisesti
- [ ] Sovellus kirjoittaa uuteen kenttään
- [ ] Mahdollinen dual-write poistettu myöhemmin
- [ ] JSONB-avain poistettu tai jätetty sovitusti
