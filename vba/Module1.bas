Attribute VB_Name = "Module1"
Option Explicit




' Palauttaa TAULUKON tarkassa järjestyksessä
Public Function GetInputArray() As Variant
    Dim ws As Worksheet: Set ws = ThisWorkbook.Worksheets("Ennuste")
    Dim lst As Collection: Set lst = New Collection
    Dim i As Long
    
    lst.Add ws.Range("B3")                  '1) littera
    lst.Add ws.Range("D12")                 '2) valmiusaste
    
    For i = 15 To 19: lst.Add ws.Cells(i, "D"): Next i      '3) D15-19
    
    For i = 15 To 19                                        '4) muistioalueet
        lst.Add ws.Range("E" & i & ":F" & i)
        lst.Add ws.Range("G" & i & ":H" & i)
        lst.Add ws.Range("I" & i & ":J" & i)
    Next i
    
    For i = 4 To 19:  lst.Add ws.Range("L" & i & ":R" & i):  Next i  '5) L4-19
    For i = 24 To 100: lst.Add ws.Range("L" & i & ":R" & i): Next i  '6) L24-100
    
    Dim v() As Range        ' ? tyypitetty taulukko
    ReDim v(1 To lst.Count)
    
    For i = 1 To lst.Count: Set v(i) = lst(i): Next i
    GetInputArray = v
End Function


Public Sub NextInput()
    Dim arr As Variant: arr = GetInputArray()
    Dim idx As Long, i As Long
    
    ' etsi aktiivinen solu / alue taulukosta
    For i = LBound(arr) To UBound(arr)
        If Not Intersect(ActiveCell, arr(i)) Is Nothing Then
            idx = i: Exit For
        End If
    Next i
    
    ' seuraava indeksi (kiertäen)
    If idx = 0 Then idx = 1 Else idx = idx Mod UBound(arr) + 1
    
    arr(idx).Select
End Sub

