Attribute VB_Name = "Module_Export"
Option Explicit

' P‰‰makro: aja t‰m‰
Public Sub Export_All_VBA_ToFolder()
    Dim exportPath As String
    exportPath = PickFolder("Valitse kansio, johon VBA exportataan (esim. repo\vba\)")

    If Len(exportPath) = 0 Then Exit Sub

    ' Varmista p‰‰ttyy "\" merkkiin
    If Right$(exportPath, 1) <> "\" Then exportPath = exportPath & "\"

    ExportVBAComponents exportPath

    MsgBox "VBA export valmis kansioon:" & vbCrLf & exportPath, vbInformation
End Sub

' Exporttaa kaikki VBComponents valittuun kansioon
Private Sub ExportVBAComponents(ByVal exportPath As String)
    Dim vbProj As Object          ' VBIDE.VBProject
    Dim vbComp As Object          ' VBIDE.VBComponent
    Dim ext As String
    Dim filePath As String

    On Error GoTo ErrHandler

    Set vbProj = ThisWorkbook.VBProject

    ' (Valinnainen) tee kansio jos puuttuu
    EnsureFolder exportPath

    For Each vbComp In vbProj.VBComponents

        ext = ComponentExtension(vbComp.Type)

        ' Ohita jos ei tueta
        If Len(ext) = 0 Then GoTo NextComp

        filePath = exportPath & SanitizeFileName(vbComp.Name) & ext

        ' Jos tiedosto on jo olemassa, poista se, jotta Export ei valita
        SafeKill filePath

        ' Export
        vbComp.Export filePath

NextComp:
    Next vbComp

    Exit Sub

ErrHandler:
    Dim msg As String
    msg = "Export ep‰onnistui." & vbCrLf & vbCrLf & _
          "Yleisin syy: 'Trust access to the VBA project object model' ei ole p‰‰ll‰." & vbCrLf & _
          "Toinen syy: tyˆkirja ei ole .xlsm tai VBA-projekti on suojattu salasanalla." & vbCrLf & vbCrLf & _
          "Virhe: " & Err.Number & " - " & Err.Description
    MsgBox msg, vbExclamation
End Sub

' Palauttaa tiedostop‰‰tteen komponenttityypin mukaan
Private Function ComponentExtension(ByVal compType As Long) As String
    ' VBIDE.vbext_ComponentType:
    ' 1 = Standard Module (bas)
    ' 2 = Class Module (cls)
    ' 3 = UserForm (frm)
    ' 100 = Document (worksheet/ThisWorkbook) (cls)
    Select Case compType
        Case 1: ComponentExtension = ".bas"
        Case 2: ComponentExtension = ".cls"
        Case 3: ComponentExtension = ".frm"
        Case 100: ComponentExtension = ".cls"
        Case Else: ComponentExtension = vbNullString
    End Select
End Function

' Valitse kansio dialogilla
Private Function PickFolder(ByVal title As String) As String
    Dim fd As Object ' FileDialog
    On Error GoTo Fail

    Set fd = Application.FileDialog(4) ' msoFileDialogFolderPicker = 4
    fd.title = title
    fd.AllowMultiSelect = False

    If fd.Show <> -1 Then
        PickFolder = vbNullString
    Else
        PickFolder = fd.SelectedItems(1)
    End If
    Exit Function

Fail:
    PickFolder = vbNullString
End Function

' Luo kansio jos puuttuu
Private Sub EnsureFolder(ByVal folderPath As String)
    On Error Resume Next
    If Len(Dir(folderPath, vbDirectory)) = 0 Then
        MkDir folderPath
    End If
    On Error GoTo 0
End Sub

' Poistaa tiedoston jos olemassa
Private Sub SafeKill(ByVal filePath As String)
    On Error Resume Next
    If Len(Dir(filePath, vbNormal)) > 0 Then
        Kill filePath
    End If
    On Error GoTo 0
End Sub

' Siivoa tiedostonimi (varmuuden vuoksi)
Private Function SanitizeFileName(ByVal s As String) As String
    Dim badChars As Variant, c As Variant
    badChars = Array("\", "/", ":", "*", "?", """", "<", ">", "|")
    SanitizeFileName = s
    For Each c In badChars
        SanitizeFileName = Replace$(SanitizeFileName, CStr(c), "_")
    Next c
End Function


