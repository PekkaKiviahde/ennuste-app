# Ennuste – Tuotannonhallinta SaaS

Tämä repository sisältää Ennuste / tuotannonhallinta‑SaaS:n
lähdekoodin ja dokumentaation (MVP → v2).

Tavoite:
- irrottaa Excel‑pohjainen ennustelogiiikka hallituksi SaaS‑sovellukseksi
- säilyttää audit‑kelpoisuus (append‑only, päätösloki, baseline‑lukitus)
- mahdollistaa vaiheittainen laajennus (RBAC, tenant‑eristys, RLS)

---

## 📚 Dokumentaatio (Start here)

👉 **Kaikki varsinainen dokumentaatio löytyy täältä:**

➡️ **docs/README.md**

Se sisältää:
- arkkitehtuurin lukujärjestyksen
- IAM / Keycloak‑linjaukset
- tietokannan säännöt
- importit, hotfixit ja runbookit
- päätöslokin ja workflow‑kartat

---

## Kehitys (lyhyesti)

```bash
docker compose up
```

UI + API: http://localhost:3000

---

**Huom:**  
Repoon ei luoda enää uusia `README*.md`‑tiedostoja juureen.  
Kaikki dokumentaatio kuuluu `docs/`‑hakemistoon.
