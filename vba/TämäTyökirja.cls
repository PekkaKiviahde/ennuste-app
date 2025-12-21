VERSION 1.0 CLASS
BEGIN
  MultiUse = -1  'True
END
Attribute VB_Name = "TämäTyökirja"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = True
Option Explicit


Private Sub Workbook_SheetChange(ByVal sh As Object, ByVal Target As Range)
   If sh.Name = "Ennuste" Then
    If Not Intersect(Target, sh.Range("E15:J19")) Is Nothing Or _
       Not Intersect(Target, sh.Range("L4:R19")) Is Nothing Or _
       Not Intersect(Target, sh.Range("L24:L100")) Is Nothing Then

        With Target.Font
            .Color = RGB(0, 0, 0) ' Käyttäjän syöttämä teksti muuttuu mustaksi
        End With
    End If
End If
End Sub


Private Sub Workbook_Open()
    On Error GoTo VirheKasittely
    Application.ScreenUpdating = False

    ' --- Ei tarvita näitä, ellei ole määritelty ---
    ' Call InitEditableOrder
    ' Call HookEnterKey

    ' Suojaus yms.
    Dim ws As Worksheet
    On Error Resume Next
    Set ws = ThisWorkbook.Worksheets("Ennuste")
    On Error GoTo 0
    If ws Is Nothing Then
        Call LuoEnnusteValilehti
    Else
        ws.Protect Password:="salasana", UserInterfaceOnly:=True, _
                   AllowFiltering:=True, DrawingObjects:=True, _
                   Contents:=True, Scenarios:=True
    End If

SafeExit:
    Application.ScreenUpdating = True

    ' Sidotaan Enter?NextInput
    Application.OnKey "{ENTER}", "NextInput"
    Exit Sub

VirheKasittely:
    MsgBox "Virhe työkirjan avauksessa: " & Err.Description, vbExclamation
    Resume SafeExit
End Sub

Private Sub Workbook_BeforeClose(Cancel As Boolean)
    ' Palauta Enter-näppäin normaaliksi
    Application.OnKey "{ENTER}"
End Sub







