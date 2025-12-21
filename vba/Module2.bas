Attribute VB_Name = "Module2"
Option Explicit




Sub CreateMemoGlyphs()
    Dim ws As Worksheet
    Dim r  As Long
    Dim shp As Shape
    Dim baseName As String
    Dim muistioColumns As Variant
    Dim c As Variant
    Dim targetCell As Range

    Set ws = ThisWorkbook.Worksheets("Ennuste")

    baseName = "memoGlyph_"
    muistioColumns = Array(6, 8, 10)

    ' Poista vanhat...
    On Error Resume Next
    For Each shp In ws.Shapes
        If Left(shp.Name, Len(baseName)) = baseName Then shp.Delete
    Next shp
    On Error GoTo 0

    ' Luo uudet...
    For r = 15 To 19
        For Each c In muistioColumns
            Set targetCell = ws.Cells(r, c)
            Set shp = ws.Shapes.AddTextbox( _
                msoTextOrientationHorizontal, _
                targetCell.Left + targetCell.Width - 35, _
                targetCell.Top + targetCell.Height - 15, _
                10, 10)
            With shp
                .Name = baseName & r & "_" & c
                .TextFrame.Characters.Text = "Muistio"
                .TextFrame.Characters.Font.Name = "Segoe UI"
                .TextFrame.Characters.Font.Size = 8
                .Line.Visible = msoFalse
              '  .Font.Bold = True
                .Fill.Visible = msoFalse
                .TextFrame.AutoSize = True
                .Locked = True
                .Placement = xlMoveAndSize
                .OnAction = "'" & ThisWorkbook.Name & "'!MemoGlyphClick"
             '   .ZOrder = msoBringToFront
                shp.ZOrder msoBringToFront
              

            End With
        Next c
    Next r
End Sub

Sub MemoGlyphClick()
    Dim shpName As String
    Dim ws      As Worksheet
    Dim shp     As Shape
    Dim rng     As Range

    On Error Resume Next
    shpName = Application.Caller
    On Error GoTo 0
    If shpName = "" Then Exit Sub

    Set ws = ThisWorkbook.Worksheets("Ennuste")
    Set shp = ws.Shapes(shpName)
    Set rng = shp.TopLeftCell.MergeArea

    With MemoForm
        .txtMemo.Text = CStr(rng.Cells(1, 1).Value)
        Set .targetCell = rng.Cells(1, 1)
        .Show
    End With
End Sub


