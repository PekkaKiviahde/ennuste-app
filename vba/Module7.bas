Attribute VB_Name = "Module7"
Option Explicit




' Vakioita ulkoasun hallintaan
Public Const COLOR_ACCENT As Long = 36
Public Const COLOR_STANDARD As Long = 2
'=== YLEISET VAKIOT ===
Public Const COLOR_EDITABLE_BG   As Long = &HC8FFFF     '255,255,200
Public Const COLOR_EDITABLE_BRDR As Long = &HB4B4       '180,180,0
Public Const COLOR_HEADER_BG As Long = 9192960    ' tummansininen
Public Const COLOR_HEADER_FG As Long = 16777215   ' valkoinen
'--- Näyttötila laskenta-alueelle (vaalea siniharmaa + harmaa fontti)
Public Const COLOR_VIEW_BG   As Long = 16773350   'RGB(230,240,255)
Public Const COLOR_VIEW_FONT As Long = 8421504    'RGB(128,128,128)
Public Const COLOR_FRAME As Long = 14019802   'RGB(141,180,226) -> sama sininen kuin otsikot


'--- PÄÄMAKROT ---

Public Sub LuoEnnusteValilehti()
    On Error GoTo ErrHandler
    Dim wsEnnuste As Worksheet, wsTavo As Worksheet
    Dim userResponse As VbMsgBoxResult
    Dim lastRow As Long
    
    
    Application.ScreenUpdating = False
    
    ' Tarkistetaan, löytyykö "Ennuste"-välilehti jo.
    Set wsEnnuste = GetWorksheet("Ennuste", False)
    If Not wsEnnuste Is Nothing Then
        userResponse = MsgBox("Ennuste-välilehti on jo olemassa. Poistetaanko se ja luodaan uudelleen?", vbYesNo + vbQuestion)
                
        If userResponse = vbYes Then
            Application.DisplayAlerts = False
            wsEnnuste.Delete
            Application.DisplayAlerts = True
        Else
          '  MsgBox "Makro peruutettu.", vbInformation
            ShowNotification "Makro peruutettu.", 3  ' 3 sekuntia näkyvissä
            GoTo ExitSub
        End If
    End If
    
    ' Luodaan uusi "Ennuste"-välilehti.
    Set wsEnnuste = ThisWorkbook.Worksheets.Add
    wsEnnuste.Name = "Ennuste"
    
    
   ' Kysytään projektin tiedot ja tallennetaan ne soluun A1.
Dim projNimi As String, projNumero As String
projNimi = InputBox("Anna projektin nimi:", "Projektin tiedot")
projNumero = InputBox("Anna projektin numero:", "Projektin tiedot")
wsEnnuste.Range("A1").Value = projNimi & " (" & projNumero & ")"

' Kysytään projektin henkilöt ja tallennetaan soluihin G4–G9.
Dim tyoPaallikko As String, vastaavaMestari As String, tyonjohtaja As String
Dim hankeP As String, suunnitteluP As String, laskentaP As String      ' UUTTA

tyoPaallikko = InputBox("Anna työpäällikön nimi:", "Projektin henkilötiedot")
vastaavaMestari = InputBox("Anna vastaavan mestarin nimi:", "Projektin henkilötiedot")
tyonjohtaja = InputBox("Anna työnjohtajan nimi:", "Projektin henkilötiedot")
hankeP = InputBox("Anna hankintapäällikön nimi:", "Projektin henkilötiedot")            ' UUTTA
suunnitteluP = InputBox("Anna suunnittelupäällikön nimi:", "Projektin henkilötiedot")   ' UUTTA
laskentaP = InputBox("Anna laskentapäällikön nimi:", "Projektin henkilötiedot")         ' UUTTA


wsEnnuste.Range("H3").Value = "Projekti-organisaatio"
wsEnnuste.Range("H4").Value = "Työpäällikkö:           " & tyoPaallikko
wsEnnuste.Range("H5").Value = "Vastaava mestari:      " & vastaavaMestari
wsEnnuste.Range("H6").Value = "Työnjohtaja:             " & tyonjohtaja
wsEnnuste.Range("H7").Value = "Hankintapäällikkö:      " & hankeP           ' UUTTA
wsEnnuste.Range("H8").Value = "Suunnittelupäällikkö:  " & suunnitteluP  ' UUTTA
wsEnnuste.Range("H9").Value = "Laskentapäällikkö:      " & laskentaP        ' UUTTA


        
    ' Haetaan Tavo_Ennuste-taulukko, josta dataa haetaan.
    Set wsTavo = GetWorksheet("Tavo_Ennuste", False)
    Dim hasTavo As Boolean: hasTavo = Not (wsTavo Is Nothing)
    
              
    With wsEnnuste
        wsEnnuste.Activate
        ActiveWindow.DisplayGridlines = False
       ActiveWindow.DisplayHeadings = False ' Poistaa otsikkorivit näkyvistä
       Application.DisplayFormulaBar = False ' Poistaa kaavarivit näkyvistä
        'Application.DisplayFullScreen = True ' Käytä tarvittaessa
        
        wsEnnuste.Range("A24").Select
        ActiveWindow.FreezePanes = True

                           
        ' --- YLÄOSAN ASETUKSET ---
        
        ' Solu A3 – Otsikko litteran valinnalle
        With .Range("A3")
            .Value = "Valitse littera (alasvetovalikosta):"
            .Font.Name = "Segoe UI"
            .Font.Size = 12
            .Font.Bold = True
            .Font.Color = RGB(0, 70, 140)
            .Interior.Color = RGB(230, 240, 255) ' vaaleansininen otsikkotausta
            .Borders.LineStyle = xlNone
        End With

        ' Solu B3 – Käyttäjän valinta litterasta
        With .Range("B3")
            .Font.Name = "Segoe UI"
            .Font.Size = 12
            .Font.Color = RGB(0, 70, 140)
           ' .Interior.Color = RGB(255, 255, 200) ' vaaleankeltainen käyttäjän kenttä
         '   .Borders.LineStyle = xlContinuous
          '  .Borders.Color = RGB(200, 200, 200)
          '  .Borders.Weight = xlThin
            .NumberFormat = "@"
        End With
 
        
        .Range("A3").Value = "Valitse littera (alasvetovalikosta):"
       
        .Range("B3").Value = ""  ' B3 on litteran valinnan solu.
     
      
     ' --- YLÄPALKIN MUOTOILU (RIVI 1, SARAKKEET A–K) ---
     
     
With .Rows(1)
    .Interior.Color = COLOR_HEADER_BG
    .Font.Name = "Segoe UI"
    .Font.Size = 18
    .Font.Bold = True
    .Font.Color = COLOR_HEADER_FG
    .RowHeight = 25
End With

'Projektin nimi soluihin A1:D1
With .Range("A1:D1")
    .Merge
    .HorizontalAlignment = xlLeft
    .VerticalAlignment = xlCenter
End With

'Päivämäärä + viikko   (J1:K1)
.Range("J1:K1").Merge
.Range("J1:K1").Value = Format(Date, "dd.mm.yyyy") & _
                        " (Viikko " & Format(Date, "ww") & ")"
.Range("J1:K1").HorizontalAlignment = xlLeft
.Range("J1:K1").VerticalAlignment = xlCenter
.Range("J1:K1").Font.Size = 13

'Versio               (O1:Q1)
.Range("O1:Q1").Merge
.Range("O1:Q1").Value = "Versio 1.9"
.Range("O1:Q1").HorizontalAlignment = xlLeft
.Range("O1:Q1").VerticalAlignment = xlCenter
.Range("O1:Q1").Font.Size = 13


        ' Muotoile koko rivi 1 taustaksi
      '  With .Range("A1:R1")
         '   .Interior.Color = RGB(141, 180, 226) ' Väri tausta
         '   .Font.Name = "Segoe UI"
         '   .Font.Size = 18
         '   .Font.Bold = True
         '   .RowHeight = 25
          '  .Font.Color = RGB(0, 70, 140)
      '  End With
        
        ' Yhdistä solut A1–D1 projektin nimeä varten
       ' With .Range("A1:D1")
          '  .Merge
          '  .HorizontalAlignment = xlLeft
         '   .VerticalAlignment = xlCenter
            '.Font.Color = RGB(0, 70, 140)
       ' End With
        
        ' Siirretään päivämäärä ja viikon numero J1:K1
     '   .Range("J1:K1").Merge
      '  .Range("J1:K1").Value = Format(Now, "dd.mm.yyyy") & " (Viikko " & Format(Now, "ww") & ")"
      '  .Range("J1:K1").HorizontalAlignment = xlLeft
      '  .Range("J1:K1").VerticalAlignment = xlCenter
     '   .Range("J1:K1").Font.Color = RGB(0, 70, 140)
     '   .Range("J1:K1").Font.Size = 13
        
          ' Versionumerointi
      '  .Range("O1:Q1").Merge
     '   .Range("O1:Q1").Value = "Versio 1.9"
      '  .Range("O1:Q1").HorizontalAlignment = xlLeft
      '  .Range("O1:Q1").VerticalAlignment = xlCenter
     '   .Range("O1:Q1").Font.Color = RGB(0, 70, 140)
      '  .Range("O1:Q1").Font.Size = 13

        
        ' Asetetaan alasvetovalikko soluun B3, mikäli Tavo_Ennuste löytyy.
        If hasTavo Then
            lastRow = wsTavo.Cells(wsTavo.Rows.Count, "A").End(xlUp).row
            If lastRow >= 2 Then
                With .Range("B3").Validation
                    .Delete
                    .Add Type:=xlValidateList, AlertStyle:=xlValidAlertStop, Operator:=xlBetween, _
                         Formula1:="='Tavo_Ennuste'!$A$2:$A$" & lastRow
                    .IgnoreBlank = True
                    .InCellDropdown = True
                    .ShowError = True
                End With
            Else
               'MsgBox "Tavo_Ennuste-taulukossa ei ole tarpeeksi arvoja litteroille.", vbExclamation
               ShowNotification "Tavo_Ennuste-taulukossa ei ole tarpeeksi arvoja litteroille.", 3  '3 sekuntia näkyvissä
            End If
        End If
        
        
        
        ' --- SARAKELEVEYDET JA AUTOFIT ---
        .Columns("A").AutoFit
        .Columns("B").ColumnWidth = 17
        .Columns("C").ColumnWidth = 17
        .Columns("D:K").ColumnWidth = 17
      .Columns("A").IndentLevel = 1   ' ?? siirtää tekstin ~3 mm

        
        ' --- ENNUSTEPANEELI (A5:B12) ---
     
        
        With .Range("A5")
          .Value = "ENNUSTEPANEELI"
           .Font.Name = "Segoe UI"
            .Font.Size = 13
           .Font.Bold = True
           .Interior.Color = RGB(230, 240, 255) ' vaaleansininen korosteväri
           .Font.Color = RGB(0, 70, 140)
        End With
        
         With .Range("B5")
           .Interior.Color = RGB(230, 240, 255) ' vaaleansininen korosteväri
           .Font.Color = RGB(0, 70, 140)
        End With
        
        ' Otsikot vasemmalla (A6:A12)
        With .Range("A6:A12")
            .Font.Name = "Segoe UI"
            .Font.Size = 12
            .Font.Bold = True
            .Font.Color = RGB(80, 80, 80)
            .Interior.ColorIndex = xlNone
            .Borders.LineStyle = xlNone
        End With
        
         ' Projektihenkilöstö (G4:G9)
        With .Range("G4:G9")
            .Font.Name = "Segoe UI"
            .Font.Size = 12
            .Font.Bold = True
            .Font.Color = RGB(80, 80, 80)
            .Interior.ColorIndex = xlNone
            .Borders.LineStyle = xlNone
        End With
        
        With .Range("H3:I3")
           .Font.Name = "Segoe UI"
           .Font.Size = 12
           .Font.Bold = True
           .Interior.Color = RGB(230, 240, 255) ' vaaleansininen korosteväri
           .Font.Color = RGB(0, 70, 140)
        End With
        
        

'  .Range("A6:B12").Borders.LineStyle = xlContinuous
 
        
        .Range("A6").Value = "Tavoitekustannus:"
        .Range("A7").Value = "Toteutunut:"
        .Range("A8").Value = "Edellinen ennuste:"
        .Range("A9").Value = "Ennuste pvä/klo:"
        .Range("A10").Value = "Tal. valmius:"
        .Range("A11").Value = "Tekn. valmius:"
        .Range("A12").Value = "KPI:"
        
        ' Arvot oikealla (B6:B12)
        With .Range("B6:B12")
            .Font.Name = "Segoe UI"
            .Font.Size = 11
            .Font.Color = RGB(80, 80, 80)
            .Interior.Color = RGB(235, 245, 255) ' vaalea taustaväri
            .Borders.LineStyle = xlContinuous
            .Borders.Color = RGB(200, 200, 200)
            .Borders.Weight = xlThin
            '.Font.Bold = True
        End With

     
       ' .Range("B6:B12").Interior.ColorIndex = COLOR_STANDARD
      
        .Range("A15:A19").Borders.LineStyle = xlContinuous
        .Range("B6:B8").NumberFormat = "#,##0.00 €"
        
        .Range("B12").NumberFormat = "0.00"
        .Range("B10:B11").NumberFormat = "0.00%"  ' Prosenttimuotoilu edelliselle valmiusasteelle
        
        ' --- UUSI VALMIUSASTE-ALUE ---
        ' Soluun D11 asetetaan otsikoksi "Litteran valmiusaste %"
        .Range("D11").Value = "Litteran valmiusaste"
      '  .Range("D11").Font.Bold = True
      
      ' Otsikko "Valmiusaste" solussa D11
        With .Range("D11")
            .Value = "Valmiusaste"
            .Font.Name = "Segoe UI"
            .Font.Size = 12
            .Font.Bold = True
            .Font.Color = RGB(80, 80, 80)
            .Interior.Color = RGB(230, 240, 255) ' vaaleansininen otsikkotausta
            .Borders.LineStyle = xlNone
        End With

        ' Käyttäjän syöttämä prosentti solussa D12
        With .Range("D12")
            .Value = ""
            .Font.Name = "Segoe UI"
            .Font.Color = RGB(80, 80, 80)
            .NumberFormat = "0.00%"
            '.Interior.Color = RGB(255, 255, 200) ' vaaleankeltainen käyttäjän kenttä
          '  .Borders.LineStyle = xlContinuous
           ' .Borders.Color = RGB(200, 200, 200)
            '.Borders.Weight = xlThin
            .Font.Size = 12
            .Font.Bold = True
           ' .Interior.Color = RGB(255, 255, 180)  ' kirkkaampi keltainen
           ' .Borders.Color = RGB(0, 70, 140)
          '  .Borders.Weight = xlMedium
        End With

        
        ' Soluun E1 asetetaan litteran selite; tätä päivitetään myöhemmin PaivitaLitteranTiedot-makrossa.
        .Range("E1").Value = ""
            
       ' Solu D12 toimii käyttäjän syöttöalueena uuden teknisen valmiusasteen tallentamista varten.
        .Range("D12").Value = ""
        .Range("D12").NumberFormat = "0.00%"
        .Range("D12").Interior.ColorIndex = COLOR_ACCENT
        
            
        ' --- KUSTANNUSLAJIT ALUE (Rivit 14-20) ---
        
        ' --- KUSTANNUSLAJIT-ALUEEN NYKYAIKAINEN MUOTOILU (A14:G20) ---

' Pääotsikko (A14)
With .Range("A14")
    .Value = "KUSTANNUSLAJIT"
    .Font.Name = "Segoe UI"
    .Font.Size = 13
    .Font.Bold = True
    .Font.Color = RGB(0, 70, 140)
    .Interior.Color = RGB(230, 240, 255) ' vaaleansininen tausta
End With

' Otsikkorivi (B14:I14)
With .Range("B14:I14")
    .Font.Name = "Segoe UI"
    .Font.Size = 12
    .Font.Bold = True
    .Interior.Color = RGB(230, 240, 255)
    .Font.Color = RGB(80, 80, 80)
    .Borders.LineStyle = xlNone
End With

' Kustannuslajit vasemmalla (A15:A19)
With .Range("A15:A19")
    .Font.Name = "Segoe UI"
    .Font.Size = 12
    .Font.Bold = True
    .Font.Color = RGB(80, 80, 80)
    .Interior.ColorIndex = xlNone
    .Borders.LineStyle = xlNone
End With

' Tavoitekustannus ja edellinen ennuste (B15:C19) - käyttäjä EI muokkaa
With .Range("B15:C19")
    .Font.Name = "Segoe UI"
    .Font.Size = 12
    .Font.Color = RGB(80, 80, 80)
    .Interior.Color = RGB(235, 245, 255) ' vaaleansininen tausta
    .Borders.LineStyle = xlContinuous
    .Borders.Color = RGB(200, 200, 200)
    .Borders.Weight = xlThin
    .NumberFormat = "#,##0.00 €"
End With

' Uusi ennuste (D15:D19) - KÄYTTÄJÄ MUOKKAA
With .Range("D15:D19")
    .Font.Name = "Segoe UI"
    .Font.Size = 12
    .Font.Color = RGB(80, 80, 80)
   ' .Interior.Color = RGB(255, 255, 200) ' vaaleankeltainen muokattava kenttä
  '  .Borders.LineStyle = xlContinuous
   ' .Borders.Color = RGB(200, 200, 200)
   ' .Borders.Weight = xlThin
    .NumberFormat = "#,##0.00 €"
End With

' Muistiokentät (E15:J19) - KÄYTTÄJÄ MUOKKAA
With .Range("E15:J19")
    .Font.Name = "Segoe UI"
    .Font.Size = 12
    .Font.Color = RGB(80, 80, 80)
   ' .Interior.Color = RGB(255, 255, 200)
   ' .Borders.LineStyle = xlContinuous
   ' .Borders.Color = RGB(200, 200, 200)
   ' .Borders.Weight = xlThin
End With

                ' --- LASKENTA-ALUE (L4:R19) ---
        ' Otsikko yhdistettynä L3:R3
        With .Range("L3:R3")
            .Merge
            .Value = "Laskenta-alue"
            .Font.Name = "Segoe UI"
            .Font.Size = 13
            .Font.Bold = True
            .Font.Color = RGB(0, 70, 140)
            .Interior.Color = RGB(230, 240, 255)
            .HorizontalAlignment = xlLeft
          '  .HorizontalAlignment = xlCenter
            .VerticalAlignment = xlCenter
          '  .Interior.Color = RGB(220, 255, 220)
            
            
        End With
        



        ' Muotoillaan koko alue L4:R19
        With .Range("L4:R19")
            .Font.Name = "Segoe UI"
            .Font.Size = 12
           ' .Interior.Color = RGB(255, 255, 200)
           ' .Borders.LineStyle = xlContinuous
           ' .Borders.Color = RGB(200, 200, 200)
           ' .Borders.Weight = xlThin
            .Locked = False
        End With

        ' Yhdistetään sarakkeet L ja M riveillä 4–19
        Dim r As Long
        For r = 4 To 19
            With .Range("L" & r & ":M" & r)
                .Merge
                .HorizontalAlignment = xlLeft
                .VerticalAlignment = xlCenter
            End With
        Next r
        
        With .Range("L4:R19").Borders(xlEdgeLeft)
    .LineStyle = xlContinuous
    .Color = RGB(0, 70, 140)
    .Weight = xlThin
End With
With .Range("L4:R19").Borders(xlEdgeTop)
    .LineStyle = xlContinuous
    .Color = RGB(0, 70, 140)
    .Weight = xlThin
End With
With .Range("L4:R19").Borders(xlEdgeRight)
    .LineStyle = xlContinuous
    .Color = RGB(0, 70, 140)
    .Weight = xlThin
End With
With .Range("L4:R19").Borders(xlEdgeBottom)
    .LineStyle = xlContinuous
    .Color = RGB(0, 70, 140)
    .Weight = xlThin
End With

.Range("L2").Value = "Tee tässä alueessa varmistuslaskelmia."
.Range("L2").Font.Italic = True
.Range("L2").Font.Size = 9
.Range("L2").Font.Color = RGB(0, 70, 140)


        
        
        ' Muotoillaan muistiokenttä datariveille (L24:R100)
Dim i As Long
For i = 24 To 100
    With wsEnnuste.Range("L" & i & ":R" & i)
        .Merge
        .Font.Name = "Segoe UI"
        .Font.Size = 12
       ' .Interior.Color = RGB(255, 255, 200) ' sama väri kuin muissa muistioissa
      '  .Borders.LineStyle = xlContinuous
       ' .Borders.Weight = xlThin
       ' .Borders.Color = RGB(180, 180, 180)
        .Locked = False
        .Font.Color = RGB(80, 80, 80)
    End With
Next i

        




' Summasolut (B20:D20)
With .Range("B20:D20")
    .Font.Name = "Segoe UI"
    .Font.Size = 12
    .Font.Bold = True
    .Font.Color = RGB(0, 70, 140)
    .Interior.Color = RGB(200, 220, 255) ' hieman tummempi korostus
    .Borders.LineStyle = xlContinuous
    .Borders.Color = RGB(180, 180, 180)
    .Borders.Weight = xlThin
    .NumberFormat = "#,##0.00 €"
End With

        
        
        .Range("A14").Value = "KUSTANNUSLAJIT"
   
        .Range("A15").Value = "Työn kustannus"
        .Range("A16").Value = "Aineen kustannus"
        .Range("A17").Value = "Alihankinnan kustannus"
        .Range("A18").Value = "Vuokrakaluston kustannus"
        .Range("A19").Value = "Muu kustannus"
    
        
        .Range("B14").Value = "Tavoitekustannus"
        .Range("C14").Value = "Edellinen ennuste"
        .Range("D14").Value = "Uusi ennuste"
    
       
        
        .Range("B15:C19").NumberFormat = "#,##0.00 €"
     
        
        ' --- SUMMARIVIT (Rivi 20) ---
        .Range("B20").Formula = "=SUM(B15:B19)"
        .Range("C20").Formula = "=SUM(C15:C19)"
        .Range("D20").Formula = "=SUM(D15:D19)"
        
   
        
        ' --- LOPPUOSA (Ohjeteksti, painikkeet, aktivointi) ---
        .Range("A23").EntireRow.ClearContents
        .Range("A23").Value = "Täytä tai tarkista uudet arvot, ja muista painaa TALLENNA lopuksi."
        .Range("A23").Font.Italic = True
        .Range("A23").Font.Size = 13
        
        
        ' Yhdistetyt muistio-otsikot (rivi 14)
With .Range("E14:F14")
    .Merge
    .Value = "Muistio"
    .Font.Bold = True
    .HorizontalAlignment = xlCenter
    .Interior.Color = RGB(230, 240, 255)
End With
With .Range("G14:H14")
    .Merge
    .Value = "Muistio Hankinta"
    .Font.Bold = True
    .HorizontalAlignment = xlCenter
    .Interior.Color = RGB(230, 240, 255)
End With
With .Range("I14:J14")
    .Merge
    .Value = "Muistio Laskenta"
    .Font.Bold = True
    .HorizontalAlignment = xlCenter
    .Interior.Color = RGB(230, 240, 255)
End With

' Yhdistetyt muistio-kentät (rivit 15–19)

For i = 15 To 19
    With .Range("E" & i & ":F" & i)
        .Merge
        .Interior.Color = RGB(255, 255, 200)
        .Borders.LineStyle = xlContinuous
        .Borders.Weight = xlThin
        .Borders.Color = RGB(180, 180, 180)
    End With
    With .Range("G" & i & ":H" & i)
        .Merge
        .Interior.Color = RGB(255, 255, 200)
        .Borders.LineStyle = xlContinuous
        .Borders.Weight = xlThin
        .Borders.Color = RGB(180, 180, 180)
    End With
    With .Range("I" & i & ":J" & i)
        .Merge
        .Interior.Color = RGB(255, 255, 200)
        .Borders.LineStyle = xlContinuous
        .Borders.Weight = xlThin
        .Borders.Color = RGB(180, 180, 180)
    End With
Next i
        
' --- RIVI 21: Copyright – oikealle ---
With wsEnnuste.Range("A21:R21")
    .Merge
    .Value = "© " & Year(Date) & " [PEKKA KIVIAHDE] – Kaikki oikeudet pidätetään."
    .HorizontalAlignment = xlRight          ' ? oikealle
    .VerticalAlignment = xlCenter
    .IndentLevel = 2                        ' pieni väli reunasta (valinnainen)
    .Font.Name = "Segoe UI"
    .Font.Size = 9
    .Font.Color = RGB(211, 211, 211)
    '.Interior.Color = RGB(141, 180, 226) ' taustan väri
    .RowHeight = 14
End With

With wsEnnuste
    ' Välisummat riviin 22, sarakkeet C:K
    .Range("F22:K22").FormulaR1C1 = "=SUBTOTAL(9, R24C:R100C)"
    
    ' Esim. muotoilu
    With .Range("A22:R22")
        .Font.Bold = True
        .Font.Name = "Segoe UI"
        .Font.Size = 12
        .VerticalAlignment = xlCenter
        .Font.Color = RGB(80, 80, 80)
        .HorizontalAlignment = xlCenter
        .NumberFormat = "#,##0.0 €"   ' kokonaislukuina ilman desimaaleja
        .Interior.Color = RGB(141, 180, 226) ' taustan väri
        .RowHeight = 14
    End With
End With



        
        
        ' --- RIVI 22: Jakopalkki ennen taulukkoa ---
    '    With wsEnnuste.Rows(22)
    '        .RowHeight = 8  ' matala korkeus
    '        .Interior.Color = RGB(141, 180, 226) ' taustan väri
    '    End With
        
        ' Luodaan painikkeet: Hae Litteran Tiedot, TALLENNA, EdellinenLittera ja SeuraavaLittera.
      '  CreateButton wsEnnuste, "PaivitaLitteranTiedot", "PÄIVITÄ", 80, 20, 3, 4
       ' CreateButton wsEnnuste, "TallennaMuistiot", "TALLENNA", 80, 20, 3, 5
        'CreateButton wsEnnuste, "EdellinenLittera", "<---", 80, 20, 5, 4
        'CreateButton wsEnnuste, "SeuraavaLittera", "--->", 80, 20, 5, 5
        'CreateButton wsEnnuste, "TyhjennaLaskentaAlue", "Tyhjennä", 70, 12, 3, 15
        'CreateButton wsEnnuste, "PalautaLaskentaAlue", "Palauta", 70, 12, 3, 17
        'CreateButton wsEnnuste, "MuokkaaProjektinTietoja", "Asetukset", 80, 20, 7, 4
        'CreateButton wsEnnuste, "PaivitaPaaryhmataso", "Pääryhmä", 80, 20, 7, 5
      
CreateButton wsEnnuste, "PaivitaLitteranTiedot", _
             "Hae tiedot", 120, 20, 3, 4, _
             "Hakee valitun litteran tiedot taulukoista"

CreateButton wsEnnuste, "TallennaMuistiot", _
             "Tallenna ennuste", 120, 20, 3, 6, _
             "Kirjaa uudet ennustearvot ja muistiot MuistioArkistoon"

CreateButton wsEnnuste, "EdellinenLittera", _
             "Edellinen", 120, 20, 5, 4, _
             "Siirtää edelliseen litteraan"

CreateButton wsEnnuste, "SeuraavaLittera", _
             "Seuraava", 120, 20, 5, 6, _
             "Siirtää seuraavaan litteraan"

CreateButton wsEnnuste, "TyhjennaLaskentaAlue", _
             "Tyhjennä", 80, 12, 3, 15, _
             "Tyhjentää laskenta-alueen (L4:R19)"

CreateButton wsEnnuste, "PalautaLaskentaAlue", _
             "Palauta", 80, 12, 3, 17, _
             "Palauttaa viimeksi tallennetun laskenta-alueen"

CreateButton wsEnnuste, "MuokkaaProjektinTietoja", _
             "Projektitiedot", 120, 20, 7, 4, _
             "Muokkaa projektin nimeä ja vastuuhenkilöitä"

CreateButton wsEnnuste, "PaivitaPaaryhmataso", _
             "Pääryhmäraportti", 120, 20, 7, 6, _
             "Luo/päivittää pääryhmä-tason yhteenvedon"




       
        .Activate
        .Range("B3").Select
                
    End With
    
        '--- Muokattavat solut yhtenäiseksi ---
    Call MuotoileMuokattavatKentat(wsEnnuste)
    
    ' Kutsu memoglyphs
    
       Call CreateMemoGlyphs          ' glyphit syntyvät automaattisesti

    
    '--- Visuaaliset kehykset ---
AddPanelFrame wsEnnuste, wsEnnuste.Range("A5:B12"), "frm_Ennustepaneeli"
AddPanelFrame wsEnnuste, wsEnnuste.Range("A14:J20"), "frm_Kustannuslajit"


    
 '   MsgBox "Ennuste-välilehti luotu/päivitetty. Nyt voit klikata 'Hae Litteran Tiedot' ja lopuksi 'TALLENNA'.", vbInformation
   ShowNotification "Ennuste-välilehti luotu/päivitetty. Nyt voit klikata 'Hae Litteran Tiedot' ja lopuksi 'TALLENNA'.", 3  ' 3 sekuntia näkyvissä
  
' Lukitse ensin kaikki solut Ennuste-välilehdellä
wsEnnuste.Cells.Locked = True

' Vapauta muokattavat solut (käyttäjän käytettävissä olevat solut)
wsEnnuste.Range("B3").Locked = False
wsEnnuste.Range("D12").Locked = False
wsEnnuste.Range("D15:D19").Locked = False
wsEnnuste.Range("E15:J19").Locked = False
wsEnnuste.Range("L4:R19").Locked = False
wsEnnuste.Range("L24:R100").Locked = False




' Lopuksi suojaa taulukko, mutta salli makrojen toiminta
wsEnnuste.Protect Password:="salasana", AllowFormattingCells:=False, _
                   AllowFormattingColumns:=False, _
                   AllowFormattingRows:=False, _
                   AllowInsertingColumns:=False, _
                   AllowInsertingRows:=False, _
                   AllowDeletingColumns:=False, _
                   AllowDeletingRows:=False, _
                   AllowSorting:=False, _
                   AllowFiltering:=True, _
                   AllowUsingPivotTables:=False, _
                   DrawingObjects:=False, _
                   Contents:=True, _
                   Scenarios:=True, _
                   UserInterfaceOnly:=True

   ' --- Automaattinen zoom: sovita alue A1:R23 näkymään ---
Dim rngFit As Range
Set rngFit = wsEnnuste.Range("A1:R23")           ' = levein otsikkorivi
rngFit.Select
ActiveWindow.Zoom = True                         ' Excel automaattisesti ”Sovita valinta”
Application.GoTo wsEnnuste.Range("A1"), True     ' takaisin järkevään kohtaan



  
ExitSub:
   Application.ScreenUpdating = True
    Exit Sub
    
    ActiveWindow.FreezePanes = True

ErrHandler:
   'MsgBox "Virhe LuoEnnusteValilehti: " & Err.Description, vbCritical
   ShowNotification "Virhe LuoEnnusteValilehti:", 3  ' 3 sekuntia näkyvissä
   Application.ScreenUpdating = True
    Application.DisplayAlerts = True
End Sub



'----------------------------------------------------
' Muokattavat kentät: keltainen tausta kaikille –
' reunus vain D15:D19 ja L4:R19
'----------------------------------------------------
Public Sub MuotoileMuokattavatKentat(ByVal ws As Worksheet)

    Dim rngList     As Variant
    Dim rngBorder   As Variant
    Dim i           As Long

    rngList = Array("B3", "D12", "D15:D19", "E15:J19", "L4:R19", "L24:R100")
    rngBorder = Array("D15:D19", "L4:R19", "B3", "D12", "E15:J19", "L24:R100")         ' ??reunus vain näille

    For i = LBound(rngList) To UBound(rngList)
        With ws.Range(rngList(i))
            ' keltainen tausta kaikille
            .Interior.Color = COLOR_EDITABLE_BG

            ' tarkista tarvitaanko kehys
           
            If IsInArray(CStr(rngList(i)), rngBorder) Then

                .Borders.LineStyle = xlContinuous
                .Borders.Color = COLOR_EDITABLE_BRDR
                .Borders.Weight = xlThin
            Else
                .Borders.LineStyle = xlLineStyleNone  ' ei reunaa
            End If
        End With
    Next i
End Sub

'--- pieni apufunktio ---
Private Function IsInArray(val As String, arr As Variant) As Boolean
    Dim itm As Variant
    For Each itm In arr
        If StrComp(itm, val, vbTextCompare) = 0 Then
            IsInArray = True
            Exit Function
        End If
    Next itm
    'Return-arvo on False, ellei löytynyt.
End Function





Sub PaivitaLitteranTiedot()
    Dim wsTavo As Worksheet, wsEnnuste As Worksheet
    Dim lastRow As Long, nextRow As Long
    Dim i As Long, riviLaskuri As Long
    Dim littera As String
    Dim bestDateMemo As Date, curDateMemo As Date
    Dim memoE As String, memoF As String, memoG As String
 

 
             
    ' Tässä on virheen korjaus - haetaan valittu littera solusta B3
    Set wsEnnuste = ThisWorkbook.Worksheets("Ennuste")
    littera = Trim(wsEnnuste.Range("B3").Value)
    
    If littera = "" Then
       ' MsgBox "Valitse ensin littera solusta B3!", vbExclamation
        ShowNotification "Valitse ensin littera solusta B3!", 3  ' 3 sekuntia näkyvissä
        Exit Sub
    End If
       
    ' Määritellään laskentataulukot
    Set wsTavo = ThisWorkbook.Worksheets("Tavo_Ennuste")
    
        
    ' Tyhjennetään vanha taulukkodata (rivit 23–100, sarakkeet A–K)
    wsEnnuste.Range("A23:K100").Clear
    
     ' Tyhjennetään solun D12 sisältö, jotta edellisen litteran tekninen valmiusaste ei jää näkyviin.
wsEnnuste.Range("D12").ClearContents

   ' Tyhjennetään alue, jotta uudet tiedot kirjoitetaan puhtaaseen tilaan.
 
        wsEnnuste.Range("B6:B12").ClearContents
        wsEnnuste.Range("B15:B19").ClearContents
        wsEnnuste.Range("C15:D19").ClearContents
        wsEnnuste.Range("E15:J19").ClearContents
        wsEnnuste.Range("A23:AC500").ClearContents
        wsEnnuste.Range("L4:R19").ClearContents
        wsEnnuste.Range("L4:R19").Interior.Color = COLOR_EDITABLE_BG   'keltainen syöttötila
        wsEnnuste.Range("L4:R19").Font.Color = RGB(80, 80, 80)         'tumma fontti




    ' *******************************
    ' Otsikkorivin asettaminen (rivi 23)
    ' *******************************
    With wsEnnuste
        ' Yhdistetään solut A23 ja B23 ja asetetaan niihin arvo "Selite"
        With .Range("A23:B23")
            .Merge
            .Value = "Selite            Littera  (" & littera & ")"
             .IndentLevel = 1
            .Font.Bold = True
            .Interior.Color = vbWhite
            .Orientation = 0
            .Font.Name = "Segoe UI"
            .Font.Size = 12
            .Font.Color = RGB(80, 80, 80)
            .Interior.ColorIndex = xlNone
            .Borders.LineStyle = xlNone
            .VerticalAlignment = xlCenter
        End With
            
     
        ' Määritellään muut otsikot soluihin C23:K23
        .Range("C23").Value = "Määrä"
        .Range("D23").Value = "Yksikkö"
        .Range("E23").Value = "€/yksikkö"
        .Range("F23").Value = "Tavo"
        .Range("G23").Value = "Työ"
        .Range("H23").Value = "Aine"
        .Range("I23").Value = "Alihank."
        .Range("J23").Value = "Vuokrakal."
        .Range("K23").Value = "Muu"
        
        ' Muotoillaan otsikkosolut (C23:K23)
        With .Range("C23:K23")
            .Font.Bold = True
            .Interior.Color = vbWhite
            
            .Interior.Color = vbWhite
            .Orientation = 0
            .Font.Name = "Segoe UI"
            .Font.Size = 12
            .Font.Color = RGB(80, 80, 80)
            .Interior.ColorIndex = xlNone
            .Borders.LineStyle = xlNone
            .HorizontalAlignment = xlCenter
            .VerticalAlignment = xlCenter

            
        End With
        
                ' Otsikko datarivin muistioille (L23:R23)
        With .Range("L23:R23")
            .Merge
            .Value = "Rivikohtaiset muistiot"
            .Font.Bold = True
            .Font.Name = "Segoe UI"
            .Font.Size = 12
            .Font.Color = RGB(80, 80, 80)
            .Interior.Color = RGB(230, 240, 255) ' Sama vaaleansininen kuin muissakin otsikoissa
            .HorizontalAlignment = xlLeft
            .Borders.LineStyle = xlNone
            .HorizontalAlignment = xlCenter
            .VerticalAlignment = xlCenter

        End With
        
          If Not .AutoFilterMode Then
        .Rows(23).AutoFilter
         End If
               

        
    End With
    
    
    
    

    ' Määritellään viimeinen rivi wsTavo-taulukossa sarakkeessa A
    lastRow = wsTavo.Cells(wsTavo.Rows.Count, "A").End(xlUp).row
    nextRow = 24  ' Ensimmäinen datarivi wsEnnuste-taulukossa alkaa riviltä 24
    riviLaskuri = 0

    ' Alustetaan yhteenvedon muuttujat (tarvittaessa)
    Dim sumJ As Double, sumM As Double, sumP As Double, sumS As Double, sumV As Double
    Dim sumK As Double, sumN As Double, sumQ As Double, sumT As Double, sumW As Double
    Dim talVal As Variant, teknVal As Variant, edellEnn As Variant, toteut As Variant
    sumK = 0: sumN = 0: sumQ = 0: sumT = 0: sumW = 0
    sumJ = 0: sumM = 0: sumP = 0: sumS = 0: sumV = 0
    talVal = 0: teknVal = 0: edellEnn = 0: toteut = 0

    ' *******************************
    ' Käydään läpi Tavo_Ennuste-taulukon datarivit (alk. riviltä 2)
    ' *******************************
    For i = 2 To lastRow
        ' Tarkistetaan, että Tavo_Ennuste-taulukon sarakkeen A arvo vastaa haluttua litteraa
        If LCase(wsTavo.Cells(i, "A").Value) = LCase(littera) Then
            ' Datarivin asettaminen wsEnnuste-taulukkoon:
            ' 1. Yhdistetään solut A ja B ja asetetaan niihin Tavo_Ennuste-taulukon sarakkeen B arvo
            With wsEnnuste.Range("A" & nextRow & ":B" & nextRow)
                .Merge
                .Value = wsTavo.Cells(i, "B").Value
                 .IndentLevel = 1
            End With
            
            ' 2. Kopioidaan muut tiedot oletetun sarakerakenteen mukaisesti:
            '    Oletuksena: wsTavo-sarakkeet C:K vastaavat otsikoita
            wsEnnuste.Cells(nextRow, "C").Value = wsTavo.Cells(i, "C").Value   ' Määrä
            wsEnnuste.Cells(nextRow, "D").Value = wsTavo.Cells(i, "D").Value   ' Yksikkö
            wsEnnuste.Cells(nextRow, "E").Value = wsTavo.Cells(i, "E").Value   ' €/yksikkö
            wsEnnuste.Cells(nextRow, "F").Value = wsTavo.Cells(i, "F").Value   ' Tavo
            wsEnnuste.Cells(nextRow, "G").Value = wsTavo.Cells(i, "J").Value   ' Työ €
            wsEnnuste.Cells(nextRow, "H").Value = wsTavo.Cells(i, "M").Value   ' Aine €
            wsEnnuste.Cells(nextRow, "I").Value = wsTavo.Cells(i, "P").Value   ' Alihankinta €
            wsEnnuste.Cells(nextRow, "J").Value = wsTavo.Cells(i, "S").Value   ' Vuokrakalusto €
            wsEnnuste.Cells(nextRow, "K").Value = wsTavo.Cells(i, "V").Value   ' Muu €
            
            nextRow = nextRow + 1
            riviLaskuri = riviLaskuri + 1
            
          ' --- Hae tiedot aina Jyda-ajo -välilehdeltä ---
Dim wsJyda2 As Worksheet
Set wsJyda2 = GetWorksheet("Jyda-ajo", False)

If Not wsJyda2 Is Nothing Then
    Dim foundRow As Range
    Set foundRow = wsJyda2.Columns("A") _
        .Find(What:=littera, LookIn:=xlValues, LookAt:=xlWhole, MatchCase:=False)
    
    If Not foundRow Is Nothing Then
        ' Tavoitekustannus (sarake C) ? B6
        wsEnnuste.Range("B6").Value = wsJyda2.Cells(foundRow.row, "C").Value
        ' Toteutunut kustannus (sarake E) ? B7
        wsEnnuste.Range("B7").Value = wsJyda2.Cells(foundRow.row, "E").Value
        ' Kust.valm.aste-% (sarake K) ? B10
        wsEnnuste.Range("B10").Value = wsJyda2.Cells(foundRow.row, "K").Value
        ' Toteutuksen arvo (samasta E) ? toteut
        toteut = wsJyda2.Cells(foundRow.row, "E").Value
    Else
        ' Jos litteraa ei löydy
        wsEnnuste.Range("B6:B7,B10").ClearContents
        toteut = 0
    End If
Else
    ' Jos Jyda-ajo -välilehteä ei ole
    wsEnnuste.Range("B6:B7,B10").ClearContents
    toteut = 0
End If

                           
           
                ' Esimerkinomaisesti summataan joitakin arvoja – nämä voi halutessaan poistaa,
                ' mikäli et tarvitse yhteenvedon laskentaa tässä makrossa.
                'työ
                If IsNumeric(wsTavo.Cells(i, "J").Value) Then sumJ = sumJ + CDbl(wsTavo.Cells(i, "J").Value)
                'Aine
                If IsNumeric(wsTavo.Cells(i, "M").Value) Then sumM = sumM + CDbl(wsTavo.Cells(i, "M").Value)
                'alihankinta
                If IsNumeric(wsTavo.Cells(i, "P").Value) Then sumP = sumP + CDbl(wsTavo.Cells(i, "P").Value)
                'vuokrakalusto
                If IsNumeric(wsTavo.Cells(i, "S").Value) Then sumS = sumS + CDbl(wsTavo.Cells(i, "S").Value)
                'muu
                If IsNumeric(wsTavo.Cells(i, "V").Value) Then sumV = sumV + CDbl(wsTavo.Cells(i, "V").Value)
            End If
       
    Next i
    
       ' Asetetaan lasketut arvot ennustepaneelin summasoluihin.
    'työ
    wsEnnuste.Range("B15").Value = sumJ
    'aine
    wsEnnuste.Range("B16").Value = sumM
    'alihankinta
    wsEnnuste.Range("B17").Value = sumP
    'vuokrakalusto
    wsEnnuste.Range("B18").Value = sumS
    'muu
    wsEnnuste.Range("B19").Value = sumV
    
    ' Haetaan edellisen ennusteen tiedot MuistioArkisto-välilehdeltä ja asetetaan ne alueelle C15:C19.
Dim wsArk As Worksheet
Set wsArk = GetWorksheet("MuistioArkisto", False)
If Not wsArk Is Nothing Then
    Dim lastRowArk As Long, iRow As Long
    Dim cat As String, bestDate As Date, tempDate As Date, prevVal As Variant
    lastRowArk = wsArk.Cells(wsArk.Rows.Count, "A").End(xlUp).row
    ' Käydään läpi kustannuslaji-, eli rivien A15:A19, nimien perusteella.
    For i = 15 To 19
        cat = Trim(wsEnnuste.Cells(i, "A").Value) ' Haetaan kustannuslajin nimi ennustevälilehdeltä.
        bestDate = 0
        prevVal = ""
        For iRow = 2 To lastRowArk
            ' Jos arkistossa (MuistioArkisto) rivin littera (sarak. B) on sama ja kustannuslaji (sarak. C) on sama...
            If StrComp(Trim(wsArk.Cells(iRow, "B").Value), littera, vbTextCompare) = 0 And _
               StrComp(Trim(wsArk.Cells(iRow, "C").Value), cat, vbTextCompare) = 0 Then
                ' Tarkistetaan, että sarakkeessa A on kelvollinen päivämäärä.
                If IsDate(wsArk.Cells(iRow, "A").Value) Then
                    tempDate = wsArk.Cells(iRow, "A").Value
                    ' Jos löydetty päivämäärä on uudempi kuin aiemmin tallennettu, päivitetään paras arvo.
                    If tempDate >= bestDate Then
                        bestDate = tempDate
                        prevVal = wsArk.Cells(iRow, "D").Value  ' UusiEnnuste tallennettu sarakkeeseen D.
                    End If
                End If
            End If
        Next iRow
        ' Asetetaan haettu ennustearvo alueen soluun C15–C19 vastaavalle riville.
        wsEnnuste.Cells(i, "C").Value = prevVal
    Next i
Else
    'MsgBox "MuistioArkisto-välilehteä ei löytynyt. Edellisen ennustearvon arvoja ei voitu hakea.", vbExclamation
    ShowNotification "MuistioArkisto-välilehteä ei löytynyt. Edellisen ennustearvon arvoja ei voitu hakea.", 3  ' 3 sekuntia näkyvissä
End If

' Lasketaan KPI käyttäen teknVal, edellEnn ja toteut arvoja.
    If IsNumeric(teknVal) And IsNumeric(edellEnn) And IsNumeric(toteut) Then
        If CDbl(edellEnn) <> 0 Then
            wsEnnuste.Range("B12").Value = (CDbl(teknVal) / CDbl(edellEnn)) * CDbl(toteut)
            wsEnnuste.Range("B12").NumberFormat = "0.00"
        Else
            wsEnnuste.Range("B12").Value = "Jako nollalla"
        End If
    Else
         wsEnnuste.Range("B12").Value = "Puuttuvia arvoja"
    End If
    
    
    ' Haetaan arkistotaulukko "MuistioArkisto"
Set wsArk = GetWorksheet("MuistioArkisto", False)
If wsArk Is Nothing Then
    'MsgBox "MuistioArkisto-välilehteä ei löytynyt. Muistiotietoja ei voitu hakea.", vbExclamation
    ShowNotification "MuistioArkisto-välilehteä ei löytynyt. Muistiotietoja ei voitu hakea.", 3  ' 3 sekuntia näkyvissä
Else
    lastRowArk = wsArk.Cells(wsArk.Rows.Count, "A").End(xlUp).row
    
    ' Käydään läpi kustannuslajiin liittyvät rivit "Ennuste"-välilehdellä (oletus: rivit 15–19)
    For i = 15 To 19
        ' Haetaan kustannuslajin nimi solusta A (oletus: rivillä 15 esim. "Työn kustannus", jne.)
        cat = Trim(wsEnnuste.Cells(i, "A").Value)
        bestDateMemo = 0
        memoE = ""
        memoF = ""
        memoG = ""
        
        ' Käydään läpi arkistotaulukon rivit (alkaen riviltä 2, jossa oletuksena on otsikot)
        For iRow = 2 To lastRowArk
            ' Jos arkistossa on sama littera (sarake B) ja sama kustannuslaji (sarake C)
            If StrComp(Trim(wsArk.Cells(iRow, "B").Value), littera, vbTextCompare) = 0 And _
               StrComp(Trim(wsArk.Cells(iRow, "C").Value), cat, vbTextCompare) = 0 Then
                ' Varmistetaan, että sarakkeessa A on kelvollinen päivämäärä
                If IsDate(wsArk.Cells(iRow, "A").Value) Then
                    curDateMemo = CDate(wsArk.Cells(iRow, "A").Value)
                    ' Jos tämä päivämäärä on uudempi (tai yhtä suuri) kuin tähän mennessä tallennettu,
                    ' käytetään tätä riviä
                    If curDateMemo >= bestDateMemo Then
                        bestDateMemo = curDateMemo
                        memoE = wsArk.Cells(iRow, "E").Value
                        memoF = wsArk.Cells(iRow, "F").Value
                        memoG = wsArk.Cells(iRow, "G").Value
                    End If
                End If
            End If
        Next iRow
        
        ' Asetetaan haetut muistiot takaisin soluihin E, G ja I vastaavalle riville.
        wsEnnuste.Range("E" & i & ":F" & i).Value = memoE
        wsEnnuste.Range("G" & i & ":H" & i).Value = memoF
        wsEnnuste.Range("I" & i & ":J" & i).Value = memoG

        
        ' Jos arkistosta palautettu tieto ei ole tyhjä, asetetaan fontin väriksi harmaa.
        If Len(memoE & memoF & memoG) > 0 Then
            wsEnnuste.Range("E" & i & ":F" & i).Font.Color = RGB(128, 128, 128)
            wsEnnuste.Range("G" & i & ":H" & i).Font.Color = RGB(128, 128, 128)
            wsEnnuste.Range("I" & i & ":J" & i).Font.Color = RGB(128, 128, 128)

        End If
    Next i
End If


 ' Haetaan soluun B8 kokonaissumma edellisen ennusteen arvoista.
    Dim latestDate As Date, totalB8 As Double
    latestDate = 0: totalB8 = 0
    For iRow = 2 To wsArk.Cells(wsArk.Rows.Count, "A").End(xlUp).row
        If StrComp(Trim(wsArk.Cells(iRow, "B").Value), littera, vbTextCompare) = 0 Then
            If IsDate(wsArk.Cells(iRow, "A").Value) Then
                If wsArk.Cells(iRow, "A").Value > latestDate Then latestDate = wsArk.Cells(iRow, "A").Value
            End If
        End If
    Next iRow
    
    If latestDate > 0 Then
        For iRow = 2 To wsArk.Cells(wsArk.Rows.Count, "A").End(xlUp).row
            If StrComp(Trim(wsArk.Cells(iRow, "B").Value), littera, vbTextCompare) = 0 Then
                If IsDate(wsArk.Cells(iRow, "A").Value) And wsArk.Cells(iRow, "A").Value = latestDate Then
                    If IsNumeric(wsArk.Cells(iRow, "D").Value) Then totalB8 = totalB8 + CDbl(wsArk.Cells(iRow, "D").Value)
                End If
            End If
        Next iRow
        wsEnnuste.Range("B8").Value = totalB8
        wsEnnuste.Range("B8").NumberFormat = "#,##0.00 €"
    End If
    
        If Trim(wsEnnuste.Range("B8").Value) <> "" Then
           wsEnnuste.Range("B9").Value = Format(latestDate, "dd.mm.yyyy | hh:mm")

        Else
           wsEnnuste.Range("B9").Value = "Ei ole ennustettu"
    End If


 ' Lasketaan KPI: =B8*B11/B7.
    wsEnnuste.Range("B12").Formula = "=B8*B11/B7"
    wsEnnuste.Range("B20").Formula = "=SUM(B15:B19)"
    
    ' Haetaan tekninen valmius aste MuistioArkistosta soluun B11.
    Dim bestDateB11 As Date, tempDateB11 As Date
    Dim techVal As Variant: bestDateB11 = 0: techVal = ""
    If Not wsArk Is Nothing Then
        For iRow = 2 To wsArk.Cells(wsArk.Rows.Count, "A").End(xlUp).row
           If StrComp(Trim(wsArk.Cells(iRow, "B").Value), littera, vbTextCompare) = 0 And _
   Left(Trim(wsArk.Cells(iRow, "C").Value), 1) <> "[" Then  ' ? estää laskenta/data-muistiot
    If IsDate(wsArk.Cells(iRow, "A").Value) Then
        tempDateB11 = CDate(wsArk.Cells(iRow, "A").Value)
        If tempDateB11 >= bestDateB11 Then
            bestDateB11 = tempDateB11
            techVal = wsArk.Cells(iRow, "H").Value
        End If
    End If
End If

        Next iRow
        wsEnnuste.Range("B11").Value = techVal
        wsEnnuste.Range("B11").NumberFormat = "0.00%"
    Else
       ' MsgBox "MuistioArkisto-välilehteä ei löytynyt. Teknistä valmiusastetta ei voitu hakea.", vbExclamation
        ShowNotification "MuistioArkisto-välilehteä ei löytynyt. Teknistä valmiusastetta ei voitu hakea.", 3  ' 3 sekuntia näkyvissä
    End If
    
' Tyhjennetään solu E12, jotta edellisen litteran tekninen valmiusaste ei jää näkyviin.
    wsEnnuste.Range("E12").ClearContents
    
  Dim wsJyda As Worksheet
Dim litteranSelite As String: litteranSelite = ""

Set wsJyda = GetWorksheet("Jyda-ajo", False)

If Not wsJyda Is Nothing Then
    For i = 2 To wsJyda.Cells(wsJyda.Rows.Count, "A").End(xlUp).row
        If StrComp(Trim(wsJyda.Cells(i, "A").Value), Trim(littera), vbTextCompare) = 0 Then
            litteranSelite = wsJyda.Cells(i, "B").Value
            Exit For
        End If
    Next i

    If litteranSelite <> "" Then
    wsEnnuste.Range("E1").Value = littera & " – " & litteranSelite
Else
    wsEnnuste.Range("E1").Value = littera & " – (Ei selitettä)"
End If

Else
  '  MsgBox "Taulukkoa 'Jyda-ajo' ei löytynyt.", vbExclamation
     ShowNotification "Taulukkoa 'Jyda-ajo' ei löytynyt.", 3  ' 3 sekuntia näkyvissä
End If


    

       ' *******************************
    ' Muotoillaan datarivit vuorotellen taustavärin osalta (rivit 24–100)
    ' *******************************
    For i = 24 To 100
        If (i Mod 2) = 0 Then
            wsEnnuste.Range("A" & i & ":K" & i).Interior.Color = RGB(235, 245, 255)
        Else
            wsEnnuste.Range("A" & i & ":K" & i).Interior.Color = vbWhite
        End If
    Next i

    ' Uudet muotoilut:
    ' Sarake C (rivit 24–100) asetetaan yhden desimaalin tarkkuudella.

    wsEnnuste.Range("C24:C100").NumberFormat = "#,##0.0 €"
  

    
    ' Sarakkeet E–K (rivit 24–100) asetetaan valuuttaformaatiksi, jossa on yksi desimaali ja €-merkki. sekä keskitys tekstille
    
          wsEnnuste.Range("E24:K100").NumberFormat = "#,##0.0 €"
          wsEnnuste.Range("E24:K100").HorizontalAlignment = xlCenter
          wsEnnuste.Range("E24:K100").VerticalAlignment = xlCenter
    
       With wsEnnuste.Range("A24:K100")
        .Font.Name = "Segoe UI"
        .Font.Size = 12
        .Font.Color = RGB(80, 80, 80)
        
    End With
    
        ' --- PALAUTA LASKENTA-ALUE ARKISTOSTA ---
    Dim laskentaRivi As Long, laskentaTargetRivi As Long, c As Long

    laskentaTargetRivi = 4 ' Alkaen riviltä L4

    If Not wsArk Is Nothing Then
        For iRow = 2 To wsArk.Cells(wsArk.Rows.Count, "A").End(xlUp).row
            If StrComp(Trim(wsArk.Cells(iRow, "B").Value), littera, vbTextCompare) = 0 And _
               Trim(wsArk.Cells(iRow, "C").Value) = "[LASKENTA]" Then

                ' Kopioidaan sarakkeet K–Q arkistosta takaisin sarakkeisiin L–R
                For c = 0 To 6 ' sarakkeet L–R
                    wsEnnuste.Cells(laskentaTargetRivi, "L").Offset(0, c).Value = wsArk.Cells(iRow, "K").Offset(0, c).Value
                    wsEnnuste.Cells(laskentaTargetRivi, "L").Offset(0, c).Font.Color = RGB(128, 128, 128) ' Harmaa fontti
                Next c
                
                '–– näytetään rivin taustana näyttötilan väri ––
            With wsEnnuste.Range("L" & laskentaTargetRivi & ":R" & laskentaTargetRivi)
                .Interior.Color = COLOR_VIEW_BG     'vaalea siniharmaa
                .Font.Color = COLOR_VIEW_FONT       'harmaa fontti
            End With


                laskentaTargetRivi = laskentaTargetRivi + 1
                If laskentaTargetRivi > 19 Then Exit For ' Älä ylitä aluetta L4:R19
            End If
        Next iRow
    End If
    
        ' --- Palautetaan data-alueen muistiot ---
    Dim dataMuistioRivi As Long
    Dim palautusRivi As Long
    Dim dataMuistioCol As Long: dataMuistioCol = 17 ' Sarake Q

    If Not wsArk Is Nothing Then
    
    ' Etsi sarakeotsikko "DataMuistio"
            dataMuistioCol = 0
            For c = 1 To wsArk.Columns.Count
               If Trim(wsArk.Cells(1, c).Value) = "DataMuistio" Then
                  dataMuistioCol = c
                      Exit For
              End If
            Next c

If dataMuistioCol = 0 Then
    'MsgBox "Sarake 'DataMuistio' ei löytynyt MuistioArkistosta!", vbExclamation
    ShowNotification "DataMuistio' ei löytynyt MuistioArkistosta!", 3  ' 3 sekuntia näkyvissä
    Exit Sub
End If

        For iRow = 2 To wsArk.Cells(wsArk.Rows.Count, "A").End(xlUp).row
    If StrComp(Trim(wsArk.Cells(iRow, "B").Value), littera, vbTextCompare) = 0 And _
       Trim(wsArk.Cells(iRow, "C").Value) = "[DATA-MUISTIO]" Then

        palautusRivi = wsArk.Cells(iRow, "R").Value
        wsEnnuste.Range("L" & palautusRivi).Value = wsArk.Cells(iRow, dataMuistioCol).Value
        wsEnnuste.Range("L" & palautusRivi).Font.Color = RGB(128, 128, 128)
    End If
Next iRow
    End If


    

    ' Ilmoitetaan, montako riviä päivitettiin
  '  MsgBox "Haettiin tavoitearviosta " & riviLaskuri & " riviä litteralle " & littera & "."
  ' ShowNotification "Haettiin tavoitearviosta  " & riviLaskuri & " riviä litteralle " & littera & ".", 3  ' 3 sekuntia näkyvissä



End Sub



'----------------------------------------------
Public Sub TallennaMuistiot()
    On Error GoTo ErrHandler
    Dim wsEnnuste As Worksheet, wsArkisto As Worksheet
    Dim littera As String
    Dim i As Long, nextRow As Long
    Dim tietojaTallennettu As Boolean
    Dim dataMuistioCol As Long
    
    
    
    Application.ScreenUpdating = False
    
    Set wsEnnuste = GetWorksheet("Ennuste", False)
    If wsEnnuste Is Nothing Then
       ' MsgBox "Ennuste-välilehteä ei löydy.", vbExclamation
        ShowNotification "Ennuste-välilehteä ei löydy.", 3  ' 3 sekuntia näkyvissä
        GoTo ExitSub
    End If
    
    Set wsArkisto = GetWorksheet("MuistioArkisto", True)
    
    ' Alustetaan arkistotaulukko, mikäli se on tyhjä.
    If Trim(wsArkisto.Range("A1").Value) = "" Then
        With wsArkisto.Range("A1:J1")
            .Value = Array("Pvm", "Littera", "Kustannuslaji", "UusiEnnuste", "MuistioD", "MuistioE", "MuistioF", "Tekninen valmiusaste", "Taloudellinen valmiusaste", "KPI")
            .Font.Bold = True
            .Interior.ColorIndex = COLOR_ACCENT
            .Borders(xlEdgeBottom).LineStyle = xlContinuous
        End With
        wsArkisto.Columns("A").NumberFormat = "dd.mm.yyyy hh:mm:ss"
        wsArkisto.Columns("D").NumberFormat = "#,##0.00 €"
        wsArkisto.Columns("A:J").AutoFit
        wsArkisto.Columns("H").NumberFormat = "0.00%"
        wsArkisto.Columns("I").NumberFormat = "0.00%"
        wsArkisto.Columns("J").NumberFormat = "0.00"
     
     With wsArkisto
            .Cells(1, "K").Value = "Laskenta"
            .Cells(1, "L").Value = "Laskenta"
            .Cells(1, "M").Value = "Laskenta"
            .Cells(1, "N").Value = "Laskenta"
            .Cells(1, "O").Value = "Laskenta"
            .Cells(1, "P").Value = "Laskenta"
            .Cells(1, "Q").Value = "DataMuistio"
            .Range("K1:Q1").Font.Bold = True
            .Range("K1:Q1").Interior.ColorIndex = COLOR_ACCENT
            .Range("K1:Q1").Borders(xlEdgeBottom).LineStyle = xlContinuous
        End With
    End If
    
    
    
    littera = Trim(wsEnnuste.Range("B3").Value)
    If littera = "" Then
       ' MsgBox "Valitse littera (B3) ensin! Ei voi tallentaa tietoja ilman litteraa.", vbExclamation
        ShowNotification "Valitse littera (B3) ensin! Ei voi tallentaa tietoja ilman litteraa.", 3  ' 3 sekuntia näkyvissä
        GoTo ExitSub
    End If
    
    ' Tarkistetaan, että pakolliset kentät täytetty.
    Dim iCheck As Long, tyhjiaKenttia As Boolean: tyhjiaKenttia = False
    For iCheck = 15 To 19
        If Trim(wsEnnuste.Cells(iCheck, "D").Value) = "" Then
            tyhjiaKenttia = True
            Exit For
        End If
    Next iCheck
    If Trim(wsEnnuste.Range("D12").Value) = "" Then tyhjiaKenttia = True
    
    If tyhjiaKenttia Then
       MsgBox "Kaikki ennustearvot ja tekninen valmiusaste (D12) on täytettävä ennen tallennusta!", vbExclamation
       ' ShowNotification "Kaikki ennustearvot ja tekninen valmiusaste (D12) on täytettävä ennen tallennusta!", 3  ' 3 sekuntia näkyvissä
        GoTo ExitSub
    End If
    
    Dim onkoEnnustetta As Boolean: onkoEnnustetta = False
    For i = 15 To 19
        If wsEnnuste.Cells(i, "D").Value <> "" And IsNumeric(wsEnnuste.Cells(i, "D").Value) Then
            onkoEnnustetta = True
            Exit For
        End If
    Next i
    
    tietojaTallennettu = False
    For i = 15 To 19
        Dim costName As String, memD As String, memE As String, memF As String
        Dim uusiEnnusteValue As Variant
        
        costName = wsEnnuste.Cells(i, "A").Value
        uusiEnnusteValue = wsEnnuste.Cells(i, "D").Value
        memD = Trim(wsEnnuste.Cells(i, "E").Value)
        memE = Trim(wsEnnuste.Cells(i, "G").Value)
        memF = Trim(wsEnnuste.Cells(i, "I").Value)
        
        If uusiEnnusteValue <> "" Or Len(memD & memE & memF) > 0 Then
            nextRow = wsArkisto.Cells(wsArkisto.Rows.Count, "A").End(xlUp).row + 1
            wsArkisto.Cells(nextRow, "A").Value = Now
            'wsArkisto.Cells(nextRow, "B").Value = littera
            wsArkisto.Cells(nextRow, "B").Value = "'" & littera '
            wsArkisto.Cells(nextRow, "C").Value = costName
            wsArkisto.Cells(nextRow, "D").Value = uusiEnnusteValue
            wsArkisto.Cells(nextRow, "E").Value = memD
            wsArkisto.Cells(nextRow, "F").Value = memE
            wsArkisto.Cells(nextRow, "G").Value = memF
            wsArkisto.Cells(nextRow, "H").Value = wsEnnuste.Range("D12").Value
            wsArkisto.Cells(nextRow, "I").Value = wsEnnuste.Range("B10").Value
            wsArkisto.Cells(nextRow, "J").Value = wsEnnuste.Range("B12").Value
            tietojaTallennettu = True
        End If
    Next i
    
        ' --- TALLENNA LASKENTA-ALUE (L4:R19) ---
    Dim r As Long
    For r = 4 To 19
        Dim laskentaTyhja As Boolean
laskentaTyhja = Application.WorksheetFunction.CountA(wsEnnuste.Range("L" & r & ":R" & r)) = 0

If Not laskentaTyhja Then

            nextRow = wsArkisto.Cells(wsArkisto.Rows.Count, "A").End(xlUp).row + 1
            wsArkisto.Cells(nextRow, "A").Value = Now
            'wsArkisto.Cells(nextRow, "B").Value = littera
            wsArkisto.Cells(nextRow, "B").Value = "'" & littera
            wsArkisto.Cells(nextRow, "C").Value = "[LASKENTA]" ' merkiksi että tämä rivi on laskenta-alueelta
            
            ' Tallennetaan L4:R4 ? sarakkeisiin K–Q arkistossa (10. sarake ja eteenpäin)
            Dim c As Long
            For c = 0 To 6 ' sarakkeet L–R
                wsArkisto.Cells(nextRow, "K").Offset(0, c).Value = wsEnnuste.Cells(r, "L").Offset(0, c).Value
            Next c
        End If
    Next r
    
        ' --- Tallennetaan data-alueen rivimuistiot (L24:R100) ---
        'Dim dataMuistioCol As Long
        dataMuistioCol = 17 ' Sarake Q


    If wsArkisto.Cells(1, dataMuistioCol).Value = "" Then
        wsArkisto.Cells(1, dataMuistioCol).Value = "DataMuistio"
        wsArkisto.Cells(1, dataMuistioCol).Font.Bold = True
    End If

    For i = 24 To 100
        If Trim(wsEnnuste.Range("L" & i).Value) <> "" Then
            nextRow = wsArkisto.Cells(wsArkisto.Rows.Count, "A").End(xlUp).row + 1
            wsArkisto.Cells(nextRow, "A").Value = Now
           ' wsArkisto.Cells(nextRow, "B").Value = littera
            wsArkisto.Cells(nextRow, "B").Value = "'" & littera
            wsArkisto.Cells(nextRow, "C").Value = "[DATA-MUISTIO]"
            wsArkisto.Cells(nextRow, "R").Value = i ' tallennetaan rivinumero
            wsArkisto.Cells(nextRow, dataMuistioCol).Value = wsEnnuste.Range("L" & i).Value
        End If
    Next i

       
    ' Lisätään automaattinen suodatus arkistotaulukkoon.
    If Not wsArkisto.AutoFilterMode Then
        If wsArkisto.Cells(wsArkisto.Rows.Count, "A").End(xlUp).row >= 1 Then
            wsArkisto.Range("A1:U1").AutoFilter
        End If
    End If
    
    If tietojaTallennettu Then
    
         Application.ScreenUpdating = False
         Call PaivitaPaaryhmataso
         Application.ScreenUpdating = True
    
        Dim msg As String
        msg = "Rivit 15-19 tallennettu tilannekuvana 'MuistioArkisto'-välilehteen!"
        If Not onkoEnnustetta Then msg = msg & vbCrLf & "(Huom: Uusia numeerisia ennustearvoja ei löytynyt D-sarakkeesta.)"
        MsgBox msg, vbInformation
    Else
      '  MsgBox "Tietoja ei tallennettu.", vbExclamation
        ShowNotification "Tietoja ei tallennettu.", 3  ' 3 sekuntia näkyvissä
    End If

ExitSub:
    Application.ScreenUpdating = True
    Exit Sub

ErrHandler:
   ' MsgBox "Virhe TallennaMuistiot: " & Err.Description, vbCritical
        ShowNotification "Virhe TallennaMuistiot: ", 3  ' 3 sekuntia näkyvissä"
    Application.ScreenUpdating = True
    
    
End Sub
'----------------------------------------------
Public Sub EdellinenLittera()

    Call SiirraLittera(-1)
   
End Sub

Public Sub SeuraavaLittera()

    Call SiirraLittera(1)
  
End Sub

Private Sub SiirraLittera(ByVal suunnanMuutos As Integer)
    On Error GoTo ErrHandler
    Dim ws As Worksheet, wsTavo As Worksheet
    Dim currentLittera As String
    Dim litteraList As Collection
    Dim i As Long, currentIndex As Long, uusiIndex As Long
   
    
    Set ws = GetWorksheet("Ennuste", False)
    Set wsTavo = GetWorksheet("Tavo_Ennuste", False)
    If ws Is Nothing Or wsTavo Is Nothing Then Exit Sub
    
    currentLittera = Trim(ws.Range("B3").Value)
    If currentLittera = "" Then Exit Sub
    
    Set litteraList = New Collection
    On Error Resume Next
    For i = 2 To wsTavo.Cells(wsTavo.Rows.Count, "A").End(xlUp).row
        Dim lit As String
        lit = Trim(wsTavo.Cells(i, "A").Value)
        If lit <> "" Then litteraList.Add lit, lit
    Next i
    On Error GoTo 0
    
    currentIndex = 0
    For i = 1 To litteraList.Count
        If StrComp(litteraList(i), currentLittera, vbTextCompare) = 0 Then
            currentIndex = i
            Exit For
        End If
    Next i
    
    If currentIndex = 0 Then Exit Sub
    uusiIndex = currentIndex + suunnanMuutos
    If uusiIndex < 1 Or uusiIndex > litteraList.Count Then Exit Sub
    
    ws.Range("B3").Value = litteraList(uusiIndex)
    Call PaivitaLitteranTiedot
    
ExitSub:
    Exit Sub

ErrHandler:
   ' MsgBox "Virhe SiirraLittera: " & Err.Description, vbCritical
    ShowNotification "Virhe SiirraLittera: ", 3  ' 3 sekuntia näkyvissä"
    Resume ExitSub
   
End Sub

'--- APUFUNKTIOT ---
Private Function GetWorksheet(ByVal SheetName As String, Optional CreateIfMissing As Boolean = False) As Worksheet
    On Error Resume Next
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets(SheetName)
    On Error GoTo 0

    If ws Is Nothing And CreateIfMissing Then
        Set ws = ThisWorkbook.Worksheets.Add
        On Error Resume Next
        ws.Name = SheetName
        If Err.Number <> 0 Then
          '  MsgBox "Välilehden nimeäminen epäonnistui: " & SheetName, vbExclamation
            ShowNotification "Välilehden nimeäminen epäonnistui: ", 3 ' 3 sekuntia näkyvissä"
            Err.Clear
        End If
        On Error GoTo 0
    End If

    Set GetWorksheet = ws
End Function

'------------------------------------------------------------
' Luo muotoiltu painike + halutessa tooltip
'------------------------------------------------------------
Private Sub CreateButton(ws As Worksheet, macroName As String, _
                         buttonText As String, btnWidth As Long, _
                         btnHeight As Long, topRow As Long, _
                         leftCol As Long, Optional screenTip As String = "")


    Dim btn As Shape, btnName As String
    Dim topPos As Double, leftPos As Double

    btnName = "btn_" & macroName          'uniikki nimi

    On Error Resume Next
    ws.Shapes(btnName).Delete             'poista vanha
    On Error GoTo 0

    With ws.Cells(topRow, leftCol)
        topPos = .Top + (.Height - btnHeight) / 2
        leftPos = .Left
    End With

    Set btn = ws.Shapes.AddShape(msoShapeRoundedRectangle, _
                                 leftPos, topPos, btnWidth, btnHeight)

    With btn
        .Name = btnName
        .OnAction = macroName             '? makro toimii taas
        .Locked = False                   'suojatussa arkissa klikattava
        .TextFrame2.TextRange.Text = buttonText
        With .TextFrame2.TextRange.Font
            .Name = "Segoe UI": .Size = 12: .Bold = msoTrue
            .Fill.ForeColor.RGB = RGB(0, 70, 140)
        End With
        .Fill.ForeColor.RGB = RGB(141, 180, 226)
        .Line.ForeColor.RGB = RGB(180, 180, 180)
        .TextFrame2.VerticalAnchor = msoAnchorMiddle
        .TextFrame2.TextRange.ParagraphFormat.Alignment = msoAlignCenter
    End With



    
End Sub








Public Sub TyhjennaLaskentaAlue()
    Dim ws As Worksheet
    Set ws = GetWorksheet("Ennuste", False)
    If ws Is Nothing Then Exit Sub

    ws.Range("L4:R19").ClearContents
    ws.Range("L4:R19").Interior.Color = COLOR_EDITABLE_BG
    ws.Range("L4:R19").Font.Color = RGB(80, 80, 80)

   ' MsgBox "Laskenta-alue tyhjennetty.", vbInformation
       ShowNotification "Laskenta-alue tyhjennetty.  ", 3  ' 3 sekuntia näkyvissä"
End Sub

Public Sub PalautaLaskentaAlue()
    Dim wsEnnuste As Worksheet, wsArk As Worksheet
    Dim littera As String, iRow As Long, r As Long, c As Long
    Dim laskentaTargetRivi As Long
    Set wsEnnuste = GetWorksheet("Ennuste", False)
    Set wsArk = GetWorksheet("MuistioArkisto", False)

    If wsEnnuste Is Nothing Or wsArk Is Nothing Then Exit Sub

    littera = Trim(wsEnnuste.Range("B3").Value)
    If littera = "" Then
       ' MsgBox "Valitse ensin littera solusta B3.", vbExclamation
         ShowNotification "Valitse ensin littera solusta B3.  ", 3  ' 3 sekuntia näkyvissä"
        Exit Sub
    End If

    ' Tyhjennetään alue ensin
    wsEnnuste.Range("L4:R19").ClearContents
    wsEnnuste.Range("L4:R19").Font.Color = RGB(80, 80, 80)
    wsEnnuste.Range("L4:R19").Interior.Color = COLOR_EDITABLE_BG   '? UUSI



    ' Palautetaan tiedot arkistosta
    laskentaTargetRivi = 4
    For iRow = 2 To wsArk.Cells(wsArk.Rows.Count, "A").End(xlUp).row
        If StrComp(Trim(wsArk.Cells(iRow, "B").Value), littera, vbTextCompare) = 0 And _
           Trim(wsArk.Cells(iRow, "C").Value) = "[LASKENTA]" Then

            For c = 0 To 6
                wsEnnuste.Cells(laskentaTargetRivi, "L").Offset(0, c).Value = wsArk.Cells(iRow, "K").Offset(0, c).Value
                wsEnnuste.Cells(laskentaTargetRivi, "L").Offset(0, c).Font.Color = RGB(128, 128, 128)
            Next c
            
            ' aseta näyttötilan värit tälle palautetulle riville
            With wsEnnuste.Range("L" & laskentaTargetRivi & ":R" & laskentaTargetRivi)
                .Interior.Color = COLOR_VIEW_BG
                .Font.Color = COLOR_VIEW_FONT
            End With


            laskentaTargetRivi = laskentaTargetRivi + 1
            If laskentaTargetRivi > 19 Then Exit For
        End If
    Next iRow

  '  MsgBox "Laskenta-alue palautettu.", vbInformation
     ShowNotification "Laskenta-alue palautettu.", 3   ' 3 sekuntia näkyvissä"
End Sub



Public Sub MuokkaaProjektinTietoja()

    '––– Valitse Ennuste-välilehti –––
    Dim wsEnnuste As Worksheet
    Set wsEnnuste = GetWorksheet("Ennuste", False)
    If wsEnnuste Is Nothing Then
        'MsgBox "Ennuste-välilehteä ei löytynyt.", vbExclamation
        ShowNotification "Ennuste-välilehteä ei löytynyt.", 3  ' 3 sekuntia näkyvissä
        
        Exit Sub
    End If

    '––– Nykyinen projektin nimi & numero (A1) –––
    Dim vanhaA1 As String: vanhaA1 = wsEnnuste.Range("A1").Value
    Dim vanhaNimi As String, vanhaNumero As String
    If InStr(vanhaA1, "(") > 0 Then
        vanhaNimi = Trim(Left(vanhaA1, InStr(vanhaA1, "(") - 1))
        vanhaNumero = Replace(Replace(Mid(vanhaA1, InStr(vanhaA1, "(") + 1), ")", ""), " ", "")
    Else
        vanhaNimi = vanhaA1
        vanhaNumero = ""
    End If

    '––– Poimi vanhat henkilötiedot G4–G9 –––
    Dim vanhaTP As String, vanhaVM As String, vanhaTJ As String
    Dim vanhaHP As String, vanhaSP As String, vanhaLP As String      ' Uutuudet

    vanhaTP = Replace(wsEnnuste.Range("G4").Value, "Työpäällikkö: ", "")
    vanhaVM = Replace(wsEnnuste.Range("G5").Value, "Vastaava mestari: ", "")
    vanhaTJ = Replace(wsEnnuste.Range("G6").Value, "Työnjohtaja: ", "")
    vanhaHP = Replace(wsEnnuste.Range("G7").Value, "Hankintapäällikkö: ", "")
    vanhaSP = Replace(wsEnnuste.Range("G8").Value, "Suunnittelupäällikkö: ", "")
    vanhaLP = Replace(wsEnnuste.Range("G9").Value, "Laskentapäällikkö: ", "")

    '––– Kyselyt –––
    Dim projNimi As String, projNumero As String
    Dim tyoPaallikko As String, vastaavaMestari As String, tyonjohtaja As String
    Dim hankeP As String, suunnitteluP As String, laskentaP As String

    projNimi = InputBox("Anna projektin nimi:", "Projektin tiedot", vanhaNimi)
    If projNimi = "" Then Exit Sub

    projNumero = InputBox("Anna projektin numero:", "Projektin tiedot", vanhaNumero)
    If projNumero = "" Then Exit Sub

    tyoPaallikko = InputBox("Anna työpäällikön nimi:", "Projektin henkilötiedot", vanhaTP)
    vastaavaMestari = InputBox("Anna vastaavan mestarin nimi:", "Projektin henkilötiedot", vanhaVM)
    tyonjohtaja = InputBox("Anna työnjohtajan nimi:", "Projektin henkilötiedot", vanhaTJ)

    hankeP = InputBox("Anna hankintapäällikön nimi:", "Projektin henkilötiedot", vanhaHP)
    suunnitteluP = InputBox("Anna suunnittelupäällikön nimi:", "Projektin henkilötiedot", vanhaSP)
    laskentaP = InputBox("Anna laskentapäällikön nimi:", "Projektin henkilötiedot", vanhaLP)

    '––– Tallennus soluihin –––
    wsEnnuste.Range("A1").Value = projNimi & " (" & projNumero & ")"

    wsEnnuste.Range("H3").Value = "Projekti-organisaatio"
    wsEnnuste.Range("H4").Value = "Työpäällikkö:         " & tyoPaallikko
    wsEnnuste.Range("H5").Value = "Vastaava mestari:     " & vastaavaMestari
    wsEnnuste.Range("H6").Value = "Työnjohtaja:          " & tyonjohtaja
    wsEnnuste.Range("H7").Value = "Hankintapäällikkö:    " & hankeP
    wsEnnuste.Range("H8").Value = "Suunnittelupäällikkö: " & suunnitteluP
    wsEnnuste.Range("H9").Value = "Laskentapäällikkö:    " & laskentaP

  '  MsgBox "Projektin tiedot päivitetty.", vbInformation
        ShowNotification "Projektin tiedot päivitetty.", 3  ' 3 sekuntia näkyvissä
End Sub


Public Sub PaivitaPaaryhmataso()
    On Error GoTo Virheenkäsittely
    
    Application.ScreenUpdating = False
    
    ' 1. Alustetaan työarkit
    Dim ws As Worksheet
    Dim wsJyda As Worksheet
    Dim wsArk As Worksheet
    
    Set ws = GetWorksheet("Pääryhmätaso", True)
    Set wsJyda = GetWorksheet("Jyda-ajo", False)
    Set wsArk = GetWorksheet("MuistioArkisto", False)
    
    ' Tarkistetaan, että tarvittavat taulukot löytyvät
    If wsJyda Is Nothing Then
      '  MsgBox "Jyda-ajo-välilehteä ei löydy!", vbExclamation
         ShowNotification "Jyda-ajo-välilehteä ei löydy!", 3  ' 3 sekuntia näkyvissä
        Exit Sub
    End If
    
    If wsArk Is Nothing Then
      '  MsgBox "MuistioArkisto-välilehteä ei löydy!", vbExclamation
         ShowNotification "MuistioArkisto-välilehteä ei löydy!", 3  ' 3 sekuntia näkyvissä
        Exit Sub
    End If
    
    
    ' Tallenna käyttäjän syöttämät tiedot ennen tyhjennystä
    Dim jyvityksetArvot As Variant
    Dim omanKaytonALVArvot As Variant
    
    ' Tallenna jyvitykset-alueen arvot (A14:D17)
    jyvityksetArvot = ws.Range("A14:D17").Value
    
    ' Tallenna oman käytön ALV -alueen arvot (H23:I24)
    omanKaytonALVArvot = ws.Range("H23:I24").Value
    
    
    ' 2. Tyhjennetään vanhat tiedot (säilytetään otsikot)
    ws.Range("A2:L19").ClearContents
    
    ' 3. Lasketaan ryhmäkohtaiset summat
    Dim ryhma As Integer
    Dim sumTavoite As Double
    Dim sumEnnuste As Double
    Dim sumToteutunut As Double
    Dim sumTekValm As Double
    Dim sumTalValm As Double
    Dim sumPuhtaatMuistioArkistotiedot As Double  ' Uusi muuttuja puhtaille MuistioArkisto-tiedoille
    
    ' Ryhmät 0-9
    For ryhma = 0 To 9
        ' a) Tavoitekustannus (Jyda-ajo sarake C)
        sumTavoite = LaskeRyhmanSumma(wsJyda, ryhma, "C")
        
        ' b) Toteutunut kustannus (Jyda-ajo sarake E)
        sumToteutunut = LaskeRyhmanSumma(wsJyda, ryhma, "E")
        
        ' c) Ennuste (MuistioArkisto sarake D + Jyda-ajo täydennys)
        sumEnnuste = LaskeRyhmanEnnusteSumma(wsArk, ryhma)
        
        ' d) Puhtaat MuistioArkiston tiedot (vain MuistioArkisto ilman Jyda-täydennystä)
        sumPuhtaatMuistioArkistotiedot = LaskeRyhmanPuhtaatMuistioArkistotiedot(wsArk, ryhma)
        
        ' e) Tekninen valmius (MuistioArkisto sarake H)
      '  sumTekValm = LaskeRyhmanTekValmius(wsArk, ryhma, sumEnnuste)
        sumTekValm = LaskeRyhmanTekValmius(wsArk, ryhma, sumPuhtaatMuistioArkistotiedot)

        ' f) Taloudellinen valmius (Jyda-ajo sarake K)
        sumTalValm = LaskeRyhmanTalValmius(wsJyda, ryhma, sumEnnuste)
        
        ' Kirjoitetaan tulokset taulukkoon
        With ws
            ' Ryhmän numero
            .Cells(ryhma + 2, 1).Value = ryhma & " - pääryhmä"
            
            ' Perustiedot
            .Cells(ryhma + 2, 2).Value = sumTavoite
            .Cells(ryhma + 2, 3).Value = sumEnnuste
            .Cells(ryhma + 2, 4).Value = sumToteutunut
            
            ' Lasketut arvot
            .Cells(ryhma + 2, 5).Value = sumTavoite - sumEnnuste ' Tav-Enn €
            If sumTavoite <> 0 Then
                .Cells(ryhma + 2, 6).Value = (sumTavoite - sumEnnuste) / sumTavoite ' Tav-Enn %
            Else
                .Cells(ryhma + 2, 6).Value = 0
            End If
            
            ' Valmiit ennustukset - NYT VAIN MUISTIOARKISTOSTA!
            .Cells(ryhma + 2, 7).Value = sumPuhtaatMuistioArkistotiedot ' Valmiit ennustukset (vain MuistioArkisto)
            
            If sumEnnuste <> 0 Then
                .Cells(ryhma + 2, 8).Value = sumToteutunut / sumEnnuste ' Valm. Enn %
            Else
                .Cells(ryhma + 2, 8).Value = 0
            End If
            
            .Cells(ryhma + 2, 9).Value = sumTalValm ' Tal. valmius
            .Cells(ryhma + 2, 10).Value = sumTekValm ' Tekn. valmius
            
            Dim ansaittu As Double
            ansaittu = sumEnnuste * sumTalValm
            .Cells(ryhma + 2, 11).Value = ansaittu ' Ansaittu €
            
            If sumToteutunut <> 0 Then
                .Cells(ryhma + 2, 12).Value = ansaittu / sumToteutunut ' KPI
            Else
                .Cells(ryhma + 2, 12).Value = 0
            End If
        End With
    Next ryhma
    
    ' 4. Lasketaan yhteensä
    With ws
        ' Yhteensä-rivi (rivi 12)
        .Range("B12").Formula = "=SUM(B2:B11)"
        .Range("C12").Formula = "=SUM(C2:C11)"
        .Range("D12").Formula = "=SUM(D2:D11)"
        .Range("E12").Formula = "=SUM(E2:E11)"
        .Range("F12").ClearContents ' %-osuudet eivät summaudu
        .Range("G12").Formula = "=SUM(G2:G11)"
        .Range("H12").ClearContents ' %-osuudet eivät summaudu
        .Range("I12").ClearContents ' %-osuudet eivät summaudu
        .Range("J12").ClearContents ' %-osuudet eivät summaudu
        .Range("K12").Formula = "=SUM(K2:K11)"
        .Range("L12").ClearContents ' KPI ei summaudu
        
        
        ' 4. Lasketaan yhteensä
With ws
    ' Yhteensä-rivi (rivi 12)
    .Range("B12").Formula = "=SUM(B2:B11)"
    .Range("C12").Formula = "=SUM(C2:C11)"
    .Range("D12").Formula = "=SUM(D2:D11)"
    .Range("E12").Formula = "=SUM(E2:E11)"
    .Range("F12").Formula = "=IF(B12<>0,E12/B12,0)" ' Tav-Enn/Tavoite
    .Range("G12").Formula = "=SUM(G2:G11)"
    .Range("H12").Formula = "=IF(C12<>0,G12/C12,0)" ' Valmiit ennustukset/Ennuste
    .Range("I12").Formula = "=IF(C12<>0,D12/C12,0)" ' Toteutunut/Ennuste (Tal. valmius)
    .Range("J12").Formula = "=IF(C12<>0,K12/C12,0)" ' Ansaittu/Ennuste (Tekn. valmius)
    .Range("K12").Formula = "=SUM(K2:K11)"
    .Range("L12").Formula = "=IF(D12<>0,K12/D12,0)" ' Ansaittu/Toteutunut = KPI
    
   End With
        
        
        
        
        ' Oman käytön ALV-alue
        .Range("A18").Value = "Oman käytön ALV"
        .Range("H23").NumberFormat = "#,##0 €"
      '  .Range("H24").NumberFormat = "0.00%"
        '.Range("H25").Formula = "=H23*H24"
       ' .Range("H26").Formula = "=H23+H25"
        
        ' Päivämäärä
        .Range("J13").Value = "Päivitetty: " & Format(Now, "dd.mm.yyyy hh:mm")
        .Range("J13").Font.Italic = True
    End With
    
     ' 4. Lasketaan yhteensä
    With ws
        ' Yhteensä-rivi (rivi 19)
        .Range("B19").Formula = "=SUM(B14:B18)+B12"
        .Range("C19").Formula = "=SUM(C14:C18)+C12"
        .Range("D19").Formula = "=SUM(D14:D18)+D12"
        
    End With
    
    
    ' 5. Muotoilu
    Call MuotoilePaaryhmataso(ws)
    
    ' 6. Palauta käyttäjän syöttämät tiedot
    ' Palauta jyvitykset-alueen arvot
    ws.Range("A14:D17").Value = jyvityksetArvot
    
    ' Palauta oman käytön ALV -alueen arvot
    ws.Range("H23:I24").Value = omanKaytonALVArvot
    
    ' Päivitä laskukaavat H25 ja H26
    ws.Range("H25").Formula = "=H23*H24"
    ws.Range("H26").Formula = "=H23+H25"
    
    ' Lisätään päivitänappi
    
    CreateButton ws, "PaivitaPaaryhmataso", "PaivitaPaaryhmataso", 150, 20, 14, 10
    
    Application.ScreenUpdating = True
  '  MsgBox "Pääryhmätaso päivitetty onnistuneesti!", vbInformation
    ShowNotification "Pääryhmätaso päivitetty onnistuneesti!", 3  ' 3 sekuntia näkyvissä
    Exit Sub
    
Virheenkäsittely:
    Application.ScreenUpdating = True
  '  MsgBox "Virhe PäivitäPääryhmäTaso_Yksinkertaistettu: " & Err.Description, vbCritical
      ShowNotification "Virhe PäivitäPääryhmäTaso: ", 3  ' 3 sekuntia näkyvissä
End Sub

' Apufunktio: Laskee ryhmän tavoitekustannuksen
Private Function LaskeRyhmanSumma(ws As Worksheet, ryhma As Integer, sarake As String) As Double
    Dim i As Long
    Dim summa As Double
    Dim viimeinenRivi As Long
    
    summa = 0
    viimeinenRivi = ws.Cells(ws.Rows.Count, "A").End(xlUp).row
    
    For i = 2 To viimeinenRivi
        Dim littera As String
        littera = Trim(ws.Cells(i, "A").Value)
        
        ' Tarkistetaan että littera alkaa ryhmänumerolla
        If Len(littera) > 0 And IsNumeric(Left(littera, 1)) Then
            If CInt(Left(littera, 1)) = ryhma Then
                If IsNumeric(ws.Cells(i, sarake).Value) Then
                    summa = summa + CDbl(ws.Cells(i, sarake).Value)
                End If
            End If
        End If
    Next i
    
    LaskeRyhmanSumma = summa
End Function


Private Function LaskeRyhmanEnnusteSumma(wsArkisto As Worksheet, ryhma As Integer) As Double
    On Error GoTo ErrorHandler
    Dim debugTuloste As String
    'Dim dict As New Dictionary     'tai As Scripting.Dictionary
    debugTuloste = "Debug-tuloste ryhmälle " & ryhma & ":" & vbCrLf
    
    ' Haetaan Jyda-ajo -välilehti
    Dim wsJyda As Worksheet
    Set wsJyda = wsArkisto.Parent.Worksheets("Jyda-ajo")
    debugTuloste = debugTuloste & "Jyda-ajo taulukko löydetty" & vbCrLf
    
    Dim summa As Double
    summa = 0
    
    ' Tarkistetaan, onko MuistioArkistossa dataa
    Dim viimeinenRivi As Long
    viimeinenRivi = wsArkisto.Cells(wsArkisto.Rows.Count, "A").End(xlUp).row
    debugTuloste = debugTuloste & "MuistioArkiston viimeinen rivi: " & viimeinenRivi & vbCrLf
    
    ' Määritellään viimeinenRiviJyda tässä vaiheessa
    Dim viimeinenRiviJyda As Long
    viimeinenRiviJyda = wsJyda.Cells(wsJyda.Rows.Count, "A").End(xlUp).row
    debugTuloste = debugTuloste & "Jyda-ajo viimeinen rivi: " & viimeinenRiviJyda & vbCrLf
    
    ' Alustetaan hakemistot
    Dim dict As Object
    Dim kasitellytLitterat As Object
    Set dict = CreateObject("Scripting.Dictionary")
    Set kasitellytLitterat = CreateObject("Scripting.Dictionary")
    debugTuloste = debugTuloste & "Dictionaryt alustettu" & vbCrLf
    
    ' Jos MuistioArkistossa on dataa (yli 1 rivi)
    If viimeinenRivi > 1 Then
        Dim i As Long, j As Long
        
        ' --- Vaihe 1: Hae ennustetiedot MuistioArkistosta ---
        debugTuloste = debugTuloste & "Aloitetaan MuistioArkiston käsittely..." & vbCrLf
        For i = 2 To viimeinenRivi
            Dim littera As String
            Dim pvm As Date
            Dim kustannuslaji As String
            
            ' Tarkistetaan onko solu tyhjä ennen jatkamista
            If Not IsEmpty(wsArkisto.Cells(i, "B")) Then
                littera = Trim(CStr(wsArkisto.Cells(i, "B").Value))
                If Left(littera, 1) = "'" Then littera = Mid(littera, 2)
                
                ' Varmista että kustannuslaji-solu on täytetty
                If Not IsEmpty(wsArkisto.Cells(i, "C")) Then
                    kustannuslaji = Trim(CStr(wsArkisto.Cells(i, "C").Value))
                    
                    ' Ohita rivit joissa kustannuslaji alkaa []-merkeillä
                    If Not (Left(kustannuslaji, 1) = "[") Then
                        If Not IsEmpty(wsArkisto.Cells(i, "A")) Then
                            If IsDate(wsArkisto.Cells(i, "A").Value) Then
                                pvm = CDate(wsArkisto.Cells(i, "A").Value)
                                
                                If Len(littera) > 0 And IsNumeric(Left(littera, 1)) Then
                                    If CInt(Left(littera, 1)) = ryhma Then
                                        ' Lisää littera käsiteltyihin
                                        If Not kasitellytLitterat.Exists(littera) Then
                                            kasitellytLitterat.Add littera, True
                                            debugTuloste = debugTuloste & "Lisätty käsiteltyihin littera: " & littera & vbCrLf
                                        End If
                                        
                                        ' Käsittele hakemistot kustannuslajin perusteella
                                        Dim avainYhdistelma As String
                                        avainYhdistelma = littera & "|" & kustannuslaji
                                        
                                        If dict.Exists(avainYhdistelma) Then
                                            If pvm > dict(avainYhdistelma)("pvm") Then
                                                dict(avainYhdistelma)("pvm") = pvm
                                                dict(avainYhdistelma)("rivi") = i
                                                debugTuloste = debugTuloste & "Päivitetty littera: " & littera & ", kustannuslaji: " & kustannuslaji & " riviin " & i & vbCrLf
                                            End If
                                        Else
                                            Dim litteraTiedot As Object
                                            Set litteraTiedot = CreateObject("Scripting.Dictionary")
                                            litteraTiedot.Add "pvm", pvm
                                            litteraTiedot.Add "rivi", i
                                            dict.Add avainYhdistelma, litteraTiedot
                                            debugTuloste = debugTuloste & "Lisätty uusi littera: " & littera & ", kustannuslaji: " & kustannuslaji & " riviin " & i & vbCrLf
                                        End If
                                    End If
                                End If
                            End If
                        End If
                    End If
                End If
            End If
        Next i
        
        ' Laske summa MuistioArkiston riveistä
        debugTuloste = debugTuloste & "Lasketaan MuistioArkiston summat..." & vbCrLf
        Dim avainVar As Variant
        For Each avainVar In dict.Keys
            On Error Resume Next
            Dim rivi As Long
            rivi = CLng(dict(avainVar)("rivi"))
            
            ' Erota littera ja kustannuslaji avaimesta
            Dim avainOsat() As String
            avainOsat = Split(avainVar, "|")
            Dim nykyinenLittera As String
            nykyinenLittera = avainOsat(0)
            
            If Not IsEmpty(wsArkisto.Cells(rivi, "D")) Then
                Dim solunArvo As Variant
                solunArvo = wsArkisto.Cells(rivi, "D").Value
                debugTuloste = debugTuloste & "Käsitellään littera " & nykyinenLittera & " rivi " & rivi & ": " & solunArvo & vbCrLf
                
                ' Korjattu arvo-tarkistus
                If Not IsError(solunArvo) Then
                    If IsNumeric(solunArvo) Then
                        summa = summa + CDbl(solunArvo)
                        debugTuloste = debugTuloste & "Summaan lisätty littera " & nykyinenLittera & ": " & CDbl(solunArvo) & " (uusi summa: " & summa & ")" & vbCrLf
                    ElseIf TypeName(solunArvo) = "String" And Len(solunArvo) > 0 Then
                        ' Käsitellään mahdolliset tekstityypit
                        Dim arvo As String
                        arvo = CStr(solunArvo)
                        arvo = Replace(arvo, " €", "")
                        
                        ' Käytä alueasetuksia kunnioittavaa muunnosta
                        arvo = Replace(arvo, ",", Application.International(xlDecimalSeparator))
                        If Application.International(xlDecimalSeparator) <> "." Then
                            arvo = Replace(arvo, ".", Application.International(xlDecimalSeparator))
                        End If
                        
                        If IsNumeric(arvo) Then
                            summa = summa + CDbl(arvo)
                            debugTuloste = debugTuloste & "Summaan lisätty littera " & nykyinenLittera & ": " & CDbl(arvo) & " (uusi summa: " & summa & ")" & vbCrLf
                        Else
                            debugTuloste = debugTuloste & "Ei-numeerinen arvo litteralla " & nykyinenLittera & ": " & arvo & vbCrLf
                        End If
                    End If
                Else
                    debugTuloste = debugTuloste & "Virheellinen arvo rivillä " & rivi & " litteralla " & nykyinenLittera & vbCrLf
                End If
            End If
            On Error GoTo ErrorHandler
        Next avainVar
    End If
    
    ' --- Vaihe 2: Lisää Jyda-ajo-taulukon summat KÄSITTELEMÄTTÖMIIN litteroihin ---
    debugTuloste = debugTuloste & "Käsitellään Jyda-ajo taulukko..." & vbCrLf
    
    ' Jos MuistioArkistossa ei ollut dataa, käytetään koko Jyda-ajoa
    If viimeinenRivi <= 1 Then
        debugTuloste = debugTuloste & "Käytetään koko Jyda-ajoa" & vbCrLf
        
        ' Laske ryhmän summa Jyda-taulukosta suoraan tässä
        For j = 2 To viimeinenRiviJyda
            If Not IsEmpty(wsJyda.Cells(j, "A")) Then
                Dim jydaLitteraTesti As String
                jydaLitteraTesti = Trim(CStr(wsJyda.Cells(j, "A").Value))
                If Left(jydaLitteraTesti, 1) = "'" Then jydaLitteraTesti = Mid(jydaLitteraTesti, 2)
                
                If Len(jydaLitteraTesti) > 0 And IsNumeric(Left(jydaLitteraTesti, 1)) Then
                    If CInt(Left(jydaLitteraTesti, 1)) = ryhma Then
                        If Not IsEmpty(wsJyda.Cells(j, "C")) Then
                            Dim jydaSumma As Variant
                            jydaSumma = wsJyda.Cells(j, "C").Value
                            
                            If IsNumeric(jydaSumma) Then
                                summa = summa + CDbl(jydaSumma)
                                debugTuloste = debugTuloste & "Jyda summa lisätty littera " & jydaLitteraTesti & ": " & CDbl(jydaSumma) & " (uusi summa: " & summa & ")" & vbCrLf
                            ElseIf TypeName(jydaSumma) = "String" And Len(jydaSumma) > 0 Then
                                Dim jydaArvoTesti As String
                                jydaArvoTesti = CStr(jydaSumma)
                                jydaArvoTesti = Replace(jydaArvoTesti, " €", "")
                                jydaArvoTesti = Replace(jydaArvoTesti, ",", Application.International(xlDecimalSeparator))
                                
                                If Application.International(xlDecimalSeparator) <> "." Then
                                    jydaArvoTesti = Replace(jydaArvoTesti, ".", Application.International(xlDecimalSeparator))
                                End If
                                
                                If IsNumeric(jydaArvoTesti) Then
                                    summa = summa + CDbl(jydaArvoTesti)
                                    debugTuloste = debugTuloste & "Jyda summa lisätty littera " & jydaLitteraTesti & ": " & CDbl(jydaArvoTesti) & " (uusi summa: " & summa & ")" & vbCrLf
                                End If
                            End If
                        End If
                    End If
                End If
            End If
        Next j
    Else
        ' Muussa tapauksessa lisätään vain käsittelemättömät litterat
        debugTuloste = debugTuloste & "Lisätään vain käsittelemättömät litterat Jyda-ajosta" & vbCrLf
        For j = 2 To viimeinenRiviJyda
            If Not IsEmpty(wsJyda.Cells(j, "A")) Then
                Dim jydaLittera As String
                jydaLittera = Trim(CStr(wsJyda.Cells(j, "A").Value))
                If Left(jydaLittera, 1) = "'" Then jydaLittera = Mid(jydaLittera, 2)
                
                If Len(jydaLittera) > 0 And IsNumeric(Left(jydaLittera, 1)) Then
                    If CInt(Left(jydaLittera, 1)) = ryhma Then
                        ' Tarkista onko littera jo käsitelty MuistioArkistossa
                        If Not kasitellytLitterat.Exists(jydaLittera) Then
                            ' Hae arvo C-sarakkeesta
                            If Not IsEmpty(wsJyda.Cells(j, "C")) Then
                                Dim jydaSolunArvo As Variant
                                jydaSolunArvo = wsJyda.Cells(j, "C").Value
                                debugTuloste = debugTuloste & "Käsitellään Jyda rivi " & j & ", littera " & jydaLittera & ": " & jydaSolunArvo & vbCrLf
                                
                                If Not IsError(jydaSolunArvo) Then
                                    If IsNumeric(jydaSolunArvo) Then
                                        summa = summa + CDbl(jydaSolunArvo)
                                        debugTuloste = debugTuloste & "Summaan lisätty littera " & jydaLittera & ": " & CDbl(jydaSolunArvo) & " (uusi summa: " & summa & ")" & vbCrLf
                                    ElseIf TypeName(jydaSolunArvo) = "String" And Len(jydaSolunArvo) > 0 Then
                                        Dim jydaArvo As String
                                        jydaArvo = CStr(jydaSolunArvo)
                                        jydaArvo = Replace(jydaArvo, " €", "")
                                        jydaArvo = Replace(jydaArvo, ",", Application.International(xlDecimalSeparator))
                                        
                                        If Application.International(xlDecimalSeparator) <> "." Then
                                            jydaArvo = Replace(jydaArvo, ".", Application.International(xlDecimalSeparator))
                                        End If
                                        
                                        If IsNumeric(jydaArvo) Then
                                            summa = summa + CDbl(jydaArvo)
                                            debugTuloste = debugTuloste & "Summaan lisätty littera " & jydaLittera & ": " & CDbl(jydaArvo) & " (uusi summa: " & summa & ")" & vbCrLf
                                        Else
                                            debugTuloste = debugTuloste & "Ei-numeerinen arvo litteralla " & jydaLittera & ": " & jydaArvo & vbCrLf
                                        End If
                                    End If
                                Else
                                    debugTuloste = debugTuloste & "Virheellinen arvo Jyda rivillä " & j & " litteralla " & jydaLittera & vbCrLf
                                End If
                            End If
                        Else
                            debugTuloste = debugTuloste & "Littera " & jydaLittera & " on jo käsitelty MuistioArkistossa" & vbCrLf
                        End If
                    End If
                End If
            End If
        Next j
    End If
    
    ' Siivoa käytetyt objektit
    Set dict = Nothing
    Set kasitellytLitterat = Nothing
    
    debugTuloste = debugTuloste & "Loppusumma: " & summa & vbCrLf
    Debug.Print debugTuloste
    LaskeRyhmanEnnusteSumma = summa
    Exit Function
    
ErrorHandler:
    debugTuloste = debugTuloste & "VIRHE: " & Err.Description & " (" & Err.Number & ")" & vbCrLf
    Debug.Print debugTuloste
    ' Varmista, että objektit vapautetaan virhetilanteessakin
    Set dict = Nothing
    Set kasitellytLitterat = Nothing
    LaskeRyhmanEnnusteSumma = 0
End Function



' Apufunktio: Laskee ryhmän teknisen valmiusasteen
Private Function LaskeRyhmanTekValmius(ws As Worksheet, ryhma As Integer, sumEnnuste As Double) As Double
    Dim i As Long
    Dim summa As Double
    Dim viimeinenRivi As Long
   ' Dim dict As New Dictionary     'tai As Scripting.Dictionary
    Dim viimeisinPvm As Date
    Dim dict As Object
    
    Set dict = CreateObject("Scripting.Dictionary")
    viimeinenRivi = ws.Cells(ws.Rows.Count, "A").End(xlUp).row
    
    ' Etsitään kullekin litteralle viimeisin päivämäärä
    For i = 2 To viimeinenRivi
        Dim littera As String
        Dim pvm As Date
        
        littera = Trim(ws.Cells(i, "B").Value)
        If IsDate(ws.Cells(i, "A").Value) Then
            pvm = CDate(ws.Cells(i, "A").Value)
            
            If Len(littera) > 0 And IsNumeric(Left(littera, 1)) Then
                If CInt(Left(littera, 1)) = ryhma Then
                    If dict.Exists(littera) Then
                        If pvm > dict(littera)("pvm") Then
                            dict(littera)("pvm") = pvm
                            dict(littera)("rivi") = i
                        End If
                    Else
                        dict.Add littera, New Dictionary
                        dict(littera)("pvm") = pvm
                        dict(littera)("rivi") = i
                    End If
                End If
            End If
        End If
    Next i
    
    ' Lasketaan painotettu keskiarvo
    summa = 0
    Dim painotettuSumma As Double
    Dim avain As Variant
    
    For Each avain In dict.Keys
        Dim rivi As Long
        rivi = dict(avain)("rivi")
        
        If IsNumeric(ws.Cells(rivi, "D").Value) And IsNumeric(ws.Cells(rivi, "H").Value) Then
            Dim ennuste As Double
            Dim tekValm As Double
            
            ennuste = CDbl(ws.Cells(rivi, "D").Value)
            tekValm = CDbl(ws.Cells(rivi, "H").Value)
            
            painotettuSumma = painotettuSumma + (ennuste * tekValm)
        End If
    Next avain
    
    Debug.Print "Ryhma=" & ryhma & _
            "; dict.Count=" & dict.Count & _
            "; painotettuSumma=" & painotettuSumma & _
            "; sumEnnuste=" & sumEnnuste

    
    If sumEnnuste <> 0 Then
        LaskeRyhmanTekValmius = painotettuSumma / sumEnnuste
    Else
        LaskeRyhmanTekValmius = 0
    End If
    
    Debug.Print "Littera " & avain & ": ennuste=" & ennuste & ", valmius=" & tekValm
Call DebugJ3(ws)
    
End Function



' Apufunktio: Laskee ryhmän taloudellisen valmiusasteen
Private Function LaskeRyhmanTalValmius(ws As Worksheet, ryhma As Integer, sumEnnuste As Double) As Double
    Dim i As Long
    Dim summa As Double
    Dim viimeinenRivi As Long
    Dim painotettuSumma As Double
    
    viimeinenRivi = ws.Cells(ws.Rows.Count, "A").End(xlUp).row
    painotettuSumma = 0
    
    For i = 2 To viimeinenRivi
        Dim littera As String
        littera = Trim(ws.Cells(i, "A").Value)
        
        ' Tarkistetaan että littera alkaa ryhmänumerolla
        If Len(littera) > 0 And IsNumeric(Left(littera, 1)) Then
            If CInt(Left(littera, 1)) = ryhma Then
                If IsNumeric(ws.Cells(i, "K").Value) And IsNumeric(ws.Cells(i, "C").Value) Then
                    painotettuSumma = painotettuSumma + (CDbl(ws.Cells(i, "C").Value) * CDbl(ws.Cells(i, "K").Value))
                End If
            End If
        End If
    Next i
    
    If sumEnnuste <> 0 Then
        LaskeRyhmanTalValmius = painotettuSumma / sumEnnuste
    Else
        LaskeRyhmanTalValmius = 0
    End If
End Function

Private Sub MuotoilePaaryhmataso(ws As Worksheet)
    ' Otsikkorivit
    With ws.Range("A1:L1")
        .Font.Bold = True
        .Font.Name = "Segoe UI"
        .Font.Size = 12
        .Interior.Color = RGB(141, 180, 226)
        .Font.Color = RGB(80, 80, 80)
        .HorizontalAlignment = xlCenter
        .RowHeight = 20
        .Value = Array("Pääryhmät", "Tavoite", "Ennuste", "Toteutunut", "Tav.-Enn.", _
                       "Tav-Enn (%)", "Valmiit Ennustukset", "Valmiit Ennustukset (%)", _
                       "Valmiusaste (Tal.)", "Valmiusaste (Tekn.)", "Ansaittu €", "KPI")
    End With

    ' Data-alue
    With ws.Range("A2:L12")
        .Font.Name = "Segoe UI"
        .Font.Size = 9
        .Borders(xlInsideHorizontal).LineStyle = xlContinuous
        .Borders(xlInsideHorizontal).Color = RGB(220, 220, 220)
    End With

    ' Vuorotteleva taustaväri riveille 2–11
    Dim r As Long
    For r = 2 To 11
        If r Mod 2 = 0 Then
            ws.Range("A" & r & ":L" & r).Interior.Color = RGB(242, 242, 242)
        Else
            ws.Range("A" & r & ":L" & r).Interior.ColorIndex = xlNone
        End If
    Next r

    ' Yhteensä-rivi (rivi 12)
    With ws.Range("A12:L12")
        .Font.Bold = True
        .Font.Color = RGB(80, 80, 80)
        .Interior.Color = RGB(230, 240, 255)
    End With
    ws.Range("A12").Value = "YHTEENSÄ"
    ws.Range("K12").NumberFormat = "#,##0 €"
    ws.Range("H12:J12").NumberFormat = "0.00%"
    ws.Range("L12").NumberFormat = "0.00"
    
    ' Yhteensä-rivi (rivi 19)
    With ws.Range("A19:D19")
        .Font.Bold = True
        .Font.Color = RGB(80, 80, 80)
        .Interior.Color = RGB(230, 240, 255)
    End With
    ws.Range("A19").Value = "YHTEENSÄ"
    ws.Range("B19:D19").NumberFormat = "#,##0 €"
   

    ' Kokonaisrivit (rivit 18–19)
    With ws.Range("A18:D18")
        .Font.Bold = True: .Font.Name = "Segoe UI": .Font.Size = 9
        .Font.Color = RGB(80, 80, 80)
        .NumberFormat = "#,##0 €"
    End With
    With ws.Range("A19:L19")
        .Font.Bold = True: .Font.Name = "Segoe UI": .Font.Size = 9
        .Font.Color = RGB(80, 80, 80)
        .Interior.Color = RGB(230, 240, 255)
        .NumberFormat = "#,##0 €"
    End With

    ' Sarake A (pääryhmät) bold
    With ws.Range("A2:A12")
        .Font.Bold = True
        .Font.Name = "Segoe UI"
        .Font.Color = RGB(80, 80, 80)
    End With

    ' Reunaviivat alueille
    With ws.Range("A14:D18").Borders
        .LineStyle = xlContinuous: .Color = RGB(220, 220, 220): .Weight = xlThin
    End With
    With ws.Range("H23:I26").Borders
        .LineStyle = xlContinuous: .Color = RGB(220, 220, 220): .Weight = xlThin
    End With
    
    'Jyvitys ja omankäytön alvin alue A14:D18
    
     With ws.Range("B14:D18")
        
        .Locked = False: .Font.Name = "Segoe UI": .Font.Color = RGB(80, 80, 80)
        .NumberFormat = "#,##0 €"
    End With
    
    With ws.Range("A14:A17")
        .Interior.Color = RGB(255, 255, 200)
        .Locked = False:
        .Font.Name = "Segoe UI":
        .Font.Color = RGB(80, 80, 80)
    End With
    
       With ws.Range("B14:D17")
        .Interior.Color = RGB(255, 255, 200)
        .Locked = False:
        .Font.Name = "Segoe UI":
        .Font.Color = RGB(80, 80, 80)
    End With
    
   With ws.Range("A13:D13")
   .Merge:
        .Value = "JYVITYKSET"
        .Font.Name = "Segoe UI": .Font.Size = 12: .Font.Bold = True
        .Font.Color = RGB(0, 70, 140)
        .RowHeight = 20
       ' .Interior.Color = RGB(230, 240, 255)
    End With
     
    

    ' Omankäytön ALV tausta ja otsikot (F22:I26)

  
    With ws.Range("F22:I22")
        .Merge: .Value = "OMAN KÄYTÖN ALV"
        .Font.Name = "Segoe UI": .Font.Size = 12: .Font.Bold = True
        .Font.Color = RGB(0, 70, 140)
        .Interior.Color = RGB(230, 240, 255)
    End With
    
       With ws.Range("F23:I26")
        .Font.Name = "Segoe UI": .Font.Size = 9
        .Font.Color = RGB(80, 80, 80)
        .Interior.Color = RGB(230, 240, 255)
    End With

    ' Oman käytön kentät (F23:I26)
    Dim areas As Variant
    areas = Array( _
        Array("F23:G23", "Oman käytön kustannukset:"), _
        Array("F24:G24", "Oman käytön prosentti:"), _
        Array("F25:G25", "Oman käytön ALV €:"), _
        Array("F26:G26", "Kustannukset + ALV:") _
    )
    Dim a As Variant
    For Each a In areas
        With ws.Range(a(0))
            .Merge: .Value = a(1)
            .Font.Bold = True: .Font.Color = RGB(80, 80, 80)
            .Interior.ColorIndex = xlNone
            .Borders.LineStyle = xlNone
        End With
    Next a

    ' Käyttäjän syöttökentät ja laskukaavat
    With ws.Range("H23:I23")
        .Merge: .Interior.Color = RGB(255, 255, 200)
        .Locked = False: .Font.Name = "Segoe UI": .Font.Color = RGB(80, 80, 80)
        .NumberFormat = "#,##0 €"
    End With
    With ws.Range("H24:I24")
        .Merge: .Interior.Color = RGB(255, 255, 200)
        .Locked = False: .Font.Name = "Segoe UI": .Font.Color = RGB(80, 80, 80)
        .NumberFormat = "0.00%"
    End With
    With ws.Range("H25:I25")
        .Merge: .Formula = "=H23*H24"
        .Interior.Color = RGB(230, 240, 255)
        .Locked = True: .NumberFormat = "#,##0 €"
    End With
    With ws.Range("H26:I26")
        .Merge: .Formula = "=H23+H25"
        .Interior.Color = RGB(230, 240, 255)
        .Locked = True: .NumberFormat = "#,##0 €"
    End With

    ' Yleiset numeroformaatit (rajoitettu sarakkeisiin B–E, G ja K)
    ws.Range("B:E,G:G,K:K").NumberFormat = "#,##0 €"
    ws.Columns("F:F").NumberFormat = "0.00%"
    ws.Columns("H:H").NumberFormat = "0.00%"
    ws.Columns("I:J").NumberFormat = "0.00%"
    ws.Columns("L:L").NumberFormat = "0.00"

    ' Sarakkeiden leveydet
    ws.Columns("A").ColumnWidth = 20
    ws.Columns("B").ColumnWidth = 15
    ws.Columns("G").ColumnWidth = 16
    ws.Columns.AutoFit

    ' Piilota ruudukko
    ws.Parent.Windows(1).DisplayGridlines = False
    
   ' Piilota sarake- ja rivinumerot (otsikot)
  ws.Parent.Windows(1).DisplayHeadings = False
  
   ' Piilota kaavarivi
    Application.DisplayFormulaBar = False
  
    
End Sub





Function NzFunc(varValue As Variant, Optional varValueIfNull As Variant = 0) As Variant
    If IsError(varValue) Then
        NzFunc = varValueIfNull
        Exit Function
    End If
    
    If IsNull(varValue) Or IsEmpty(varValue) Or varValue = "" Then
        NzFunc = varValueIfNull
    Else
        NzFunc = varValue
    End If
End Function


' Funktio: Laskee ryhmän summan vain MuistioArkiston tiedoista
Private Function LaskeRyhmanPuhtaatMuistioArkistotiedot(wsArkisto As Worksheet, ryhma As Integer) As Double
    On Error GoTo ErrorHandler
    Dim debugTuloste As String
    debugTuloste = "Debug-tuloste ryhmälle " & ryhma & " (vain MuistioArkisto):" & vbCrLf
   ' Dim dict As New Dictionary     'tai As Scripting.Dictionary
    

    
    Dim summa As Double
    summa = 0
    
    ' Tarkistetaan, onko MuistioArkistossa dataa
    Dim viimeinenRivi As Long
    viimeinenRivi = wsArkisto.Cells(wsArkisto.Rows.Count, "A").End(xlUp).row
    debugTuloste = debugTuloste & "MuistioArkiston viimeinen rivi: " & viimeinenRivi & vbCrLf
    
    ' Alustetaan hakemistot
    Dim dict As Object
    Set dict = CreateObject("Scripting.Dictionary")
    debugTuloste = debugTuloste & "Dictionary alustettu" & vbCrLf
    

    ' Jos MuistioArkistossa on dataa (yli 1 rivi)
    If viimeinenRivi > 1 Then
        Dim i As Long
        
        ' Hae ennustetiedot MuistioArkistosta
        debugTuloste = debugTuloste & "Aloitetaan MuistioArkiston käsittely..." & vbCrLf
        For i = 2 To viimeinenRivi
            Dim littera As String
            Dim pvm As Date
            Dim kustannuslaji As String
            
            ' Tarkistetaan onko solu tyhjä ennen jatkamista
            If Not IsEmpty(wsArkisto.Cells(i, "B")) Then
                littera = Trim(CStr(wsArkisto.Cells(i, "B").Value))
                If Left(littera, 1) = "'" Then littera = Mid(littera, 2)
                
                ' Varmista että kustannuslaji-solu on täytetty
                If Not IsEmpty(wsArkisto.Cells(i, "C")) Then
                    kustannuslaji = Trim(CStr(wsArkisto.Cells(i, "C").Value))
                    
                    ' Ohita rivit joissa kustannuslaji alkaa []-merkeillä
                    If Not (Left(kustannuslaji, 1) = "[") Then
                        If Not IsEmpty(wsArkisto.Cells(i, "A")) Then
                            If IsDate(wsArkisto.Cells(i, "A").Value) Then
                                pvm = CDate(wsArkisto.Cells(i, "A").Value)
                                
                                If Len(littera) > 0 And IsNumeric(Left(littera, 1)) Then
                                    If CInt(Left(littera, 1)) = ryhma Then
                                        ' Käsittele hakemistot kustannuslajin perusteella
                                        Dim avainYhdistelma As String
                                        avainYhdistelma = littera & "|" & kustannuslaji
                                        
                                        If dict.Exists(avainYhdistelma) Then
                                            If pvm > dict(avainYhdistelma)("pvm") Then
                                                dict(avainYhdistelma)("pvm") = pvm
                                                dict(avainYhdistelma)("rivi") = i
                                                debugTuloste = debugTuloste & "Päivitetty littera: " & littera & ", kustannuslaji: " & kustannuslaji & " riviin " & i & vbCrLf
                                            End If
                                        Else
                                            Dim litteraTiedot As Object
                                            Set litteraTiedot = CreateObject("Scripting.Dictionary")
                                            litteraTiedot.Add "pvm", pvm
                                            litteraTiedot.Add "rivi", i
                                            dict.Add avainYhdistelma, litteraTiedot
                                            debugTuloste = debugTuloste & "Lisätty uusi littera: " & littera & ", kustannuslaji: " & kustannuslaji & " riviin " & i & vbCrLf
                                        End If
                                    End If
                                End If
                            End If
                        End If
                    End If
                End If
            End If
        Next i
        
        ' Laske summa MuistioArkiston riveistä
        debugTuloste = debugTuloste & "Lasketaan VAIN MuistioArkiston summat..." & vbCrLf
        Dim avainVar As Variant
        For Each avainVar In dict.Keys
            On Error Resume Next
            Dim rivi As Long
            rivi = CLng(dict(avainVar)("rivi"))
            
            ' Erota littera ja kustannuslaji avaimesta
            Dim avainOsat() As String
            avainOsat = Split(avainVar, "|")
            Dim nykyinenLittera As String
            nykyinenLittera = avainOsat(0)
            
            If Not IsEmpty(wsArkisto.Cells(rivi, "D")) Then
                Dim solunArvo As Variant
                solunArvo = wsArkisto.Cells(rivi, "D").Value
                debugTuloste = debugTuloste & "Käsitellään littera " & nykyinenLittera & " rivi " & rivi & ": " & solunArvo & vbCrLf
                
                ' Korjattu arvo-tarkistus
                If Not IsError(solunArvo) Then
                    If IsNumeric(solunArvo) Then
                        summa = summa + CDbl(solunArvo)
                        debugTuloste = debugTuloste & "Summaan lisätty littera " & nykyinenLittera & ": " & CDbl(solunArvo) & " (uusi summa: " & summa & ")" & vbCrLf
                    ElseIf TypeName(solunArvo) = "String" And Len(solunArvo) > 0 Then
                        ' Käsitellään mahdolliset tekstityypit
                        Dim arvo As String
                        arvo = CStr(solunArvo)
                        arvo = Replace(arvo, " €", "")
                        
                        ' Käytä alueasetuksia kunnioittavaa muunnosta
                        arvo = Replace(arvo, ",", Application.International(xlDecimalSeparator))
                        If Application.International(xlDecimalSeparator) <> "." Then
                            arvo = Replace(arvo, ".", Application.International(xlDecimalSeparator))
                        End If
                        
                        If IsNumeric(arvo) Then
                            summa = summa + CDbl(arvo)
                            debugTuloste = debugTuloste & "Summaan lisätty littera " & nykyinenLittera & ": " & CDbl(arvo) & " (uusi summa: " & summa & ")" & vbCrLf
                        Else
                            debugTuloste = debugTuloste & "Ei-numeerinen arvo litteralla " & nykyinenLittera & ": " & arvo & vbCrLf
                        End If
                    End If
                Else
                    debugTuloste = debugTuloste & "Virheellinen arvo rivillä " & rivi & " litteralla " & nykyinenLittera & vbCrLf
                End If
            End If
            On Error GoTo ErrorHandler
        Next avainVar
    End If
    
    ' Siivoa käytetyt objektit
    Set dict = Nothing
    
    debugTuloste = debugTuloste & "Loppusumma (vain MuistioArkisto): " & summa & vbCrLf
    Debug.Print debugTuloste
    LaskeRyhmanPuhtaatMuistioArkistotiedot = summa
    Exit Function
    
ErrorHandler:
    debugTuloste = debugTuloste & "VIRHE: " & Err.Description & " (" & Err.Number & ")" & vbCrLf
    Debug.Print debugTuloste
    ' Varmista, että objektit vapautetaan virhetilanteessakin
    Set dict = Nothing
    LaskeRyhmanPuhtaatMuistioArkistotiedot = 0
End Function


Sub DebugJ3(ws As Worksheet)
    Dim soluarvo As Variant
    soluarvo = ws.Cells(3, "J").Value
    
    Debug.Print "=== DEBUG SOLU J3 ==="
    Debug.Print "Raw value: [" & soluarvo & "]"
    Debug.Print "TypeName: " & TypeName(soluarvo)
    Debug.Print "IsEmpty: " & IsEmpty(soluarvo)
    Debug.Print "IsNumeric: " & IsNumeric(soluarvo)
    If IsNumeric(soluarvo) Then
        Debug.Print "CDbl: " & CDbl(soluarvo)
    End If
    Debug.Print "======================="
End Sub







Public Sub ShowNotification(msg As String, Optional durationSeconds As Long = 2)
    With NotificationForm
        ' Viesti ja fontti
        .lblMessage.Caption = msg
        .lblMessage.Font.Name = "Segoe UI"
        .lblMessage.Font.Size = 12
        .lblMessage.Font.Bold = True
        
        ' Fontin väri
        .lblMessage.ForeColor = RGB(0, 70, 140)    ' fontin väri
        
        ' Labelin taustaväri ja täysläpinäkyvyys pois
        .lblMessage.BackStyle = fmBackStyleOpaque
        .lblMessage.BackColor = RGB(230, 240, 255)   ' taustan väri
        
        ' Kehys ja efekti
        .lblMessage.BorderStyle = fmBorderStyleSingle
        .lblMessage.SpecialEffect = fmSpecialEffectRaised
        
        ' Lomakkeen kehys (jos haluat saman tyylin koko Formille)
        .BorderStyle = fmBorderStyleSingle
        .BackColor = RGB(230, 240, 255)               ' vaaleansininen tausta Formille
        
        ' Sijoitus
        .StartUpPosition = 0
        .Left = Application.Left + (Application.Width - .Width) / 2
        .Top = Application.Top + 30
        
         ' Näytetään modaalisesti, mutta ei estä muita makroja
        .Show vbModeless
    End With
    
    ' Aikatauluta sulkeminen
    Application.OnTime Now + TimeSerial(0, 0, durationSeconds), "HideNotificationForm"
End Sub

' Sulkee ilmoitus-lomakkeen
Public Sub HideNotificationForm()
    On Error Resume Next
    Unload NotificationForm
End Sub

'------------------------------------------------------------
' Luo tai päivittää suorakulma-kehyksen annetun alueen ympärille
'------------------------------------------------------------
Public Sub AddPanelFrame(ws As Worksheet, rng As Range, frameName As String)
    Dim shp As Shape

    ' Poista vanha kehys, jos on
    On Error Resume Next
    ws.Shapes(frameName).Delete
    On Error GoTo 0

    ' Laske alueen rajat
    Dim l As Double, t As Double, w As Double, h As Double
    l = rng.Left:   t = rng.Top
    w = rng.Width:  h = rng.Height

    ' Luo uusi kehys
    Set shp = ws.Shapes.AddShape(msoShapeRectangle, l, t, w, h)
    With shp
        .Name = frameName                        'käytä parametrina tullutta nimeä
        .Fill.Visible = msoFalse                 'täyttö pois
        .Line.ForeColor.RGB = COLOR_FRAME        'kehysväri
        .Line.Weight = 1                         'ohut viiva
        .Placement = xlMove                      'siirtyy solun mukana
        .Locked = True                           'ei valittavissa
        .ZOrder msoSendToBack                  'paneelin alle muut objektit
    End With
End Sub



