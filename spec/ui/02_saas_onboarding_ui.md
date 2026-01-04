# SaaS-myyjan onboarding UI (luonnos)

## 1) SaaS-myyjan konsoli
Tarkoitus: luoda konserni/yhtio ja kutsu yrityksen paakayttajalle.

Kentat:
- Konserni (valinnainen): nimi
- Yhtio: nimi, slug
- Paakayttajan sahkoposti
- Luo demoprojekti (oletus paalla)

Toiminnot:
- "Luo konserni" (valinnainen)
- "Luo yhtio + kutsu"
- "Kopioi kutsulinkki"

Palautteet:
- Onnistui: konserni_id, organization_id, invite_link
- Virhe: slug varattu / sahkoposti virheellinen

## 2) Kutsun hyvaksymissivu
Tarkoitus: yrityksen paakayttaja ottaa tilin kayttoon.

Kentat:
- Nimi
- PIN
- Hyvaksy kutsu

Toiminnot:
- "Hyvaksy kutsu" -> luo kayttaja ja roolit
- "Pyydä uusi kutsu" (jos vanhentunut)

Palautteet:
- Onnistui: ohjaus kirjautumiseen
- Virhe: token vanhentunut / jo kaytetty

## 3) Pääkayttajan ensiaskeleet
Tarkoitus: ohjata projektien luontiin ja roolitukseen.

Toiminnot:
- "Luo projekti"
- "Lisaa roolit"
- "Avaa tavoitearvio"

---

## Mitä muuttui
- Lisatty SaaS-myyjan onboarding-UI:n luonnos.

## Miksi
- Tarvitaan selkea UI-polku konserni/yhtio/kutsu -virralle.

## Miten testataan (manuaali)
- Tarkista, että kentat kattavat konserni/yhtio/kutsu -virran.
