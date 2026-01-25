export const fiFI = {
  budgetImport: {
    staging: {
      title: "Välivarastotuonti (tavoitearvio)",
      button: {
        chooseFile: "Valitse tiedosto",
        createStaging: "Luo välivarasto ja siirrä budjettiin",
        createStagingFromRepo: "Luo välivarasto tietovaraston CSV:stä ja siirrä",
        fetchBatches: "Hae tuontierät",
        fetchRows: "Näytä erän rivit",
        previewTransfer: "Esikatsele budjettisiirto",
        approveBatch: "Hyväksy tuontierä",
        rejectBatch: "Hylkää tuontierä",
        downloadCsv: "Lataa CSV",
        transferToBudget: "Siirrä budjettiin",
        selectBatch: "Valitse tuontierä"
      },
      tooltip: {
        chooseFile: "Valitse tuotava CSV-tiedosto.",
        createStaging: "Tuo CSV, esikatsele ja siirrä automaattisesti jos virheitä ei ole.",
        createStagingFromRepo: "Tuo repossa oleva CSV ja siirrä automaattisesti jos virheitä ei ole.",
        fetchBatches: "Näytä aiemmat tuontierät.",
        fetchRows: "Näytä valitun tuontierän rivit.",
        previewTransfer: "Katso vaikutus budjettiin ennen siirtoa.",
        approveBatch: "Hyväksy erä siirtoa varten.",
        rejectBatch: "Peru erä. Budjettia ei muuteta.",
        downloadCsv: "Lataa erän rivit CSV:nä.",
        transferToBudget: "Siirrä hyväksytty erä budjettiin."
      },
      label: {
        importedBy: "Tuonut",
        csvFile: "CSV-tiedosto",
        batchId: "Tuontierä-ID",
        repoCsvPath: "Tietovaraston CSV-polku",
        rowMode: "Näytä rivit",
        severity: "Vakavuus",
        exportMode: "CSV-moodi"
      },
      info: {
        intro:
          "Budjettitiedot voidaan tuoda välivarastoon CSV-tiedostosta. Tuonti vaatii vähintään litterakoodin sekä kustannussarakkeet (esim. Työ, Aine, Alihankinta, Vmiehet, Muu tai Summa). Jos ERROR-virheitä ei ole, erä hyväksytään ja siirretään automaattisesti budjettiin."
      },
      checkbox: {
        forceTransfer: "Pakota siirto",
        allowDuplicates: "Salli päällekkäiset rivit"
      },
      tooltipCheckbox: {
        forceTransfer: "Ohittaa osan tarkistuksista. Käytä varoen.",
        allowDuplicates: "Sallii duplikaatit. Voi tuplata kustannukset."
      },
      option: {
        rowMode: {
          issues: "Ongelmia",
          clean: "Virheettömät",
          all: "Kaikki"
        },
        severity: {
          all: "Kaikki",
          error: "Virhe",
          warn: "Varoitus",
          info: "Info"
        },
        exportMode: {
          clean: "Puhdas",
          all: "Kaikki"
        }
      }
    }
  }
} as const;
