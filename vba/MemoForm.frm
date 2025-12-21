VERSION 5.00
Begin {C62A69F0-16DC-11CE-9E98-00AA00574A4F} MemoForm 
   Caption         =   "”Muistion muokkaus”"
   ClientHeight    =   5436
   ClientLeft      =   108
   ClientTop       =   456
   ClientWidth     =   7788
   OleObjectBlob   =   "MemoForm.frx":0000
   StartUpPosition =   1  'CenterOwner
End
Attribute VB_Name = "MemoForm"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
'=== MemoForm code ===
Option Explicit

Public targetCell As Range      'solu josta avattiin

Private Sub UserForm_Initialize()
    Me.StartUpPosition = 1      'keskelle ruutua
End Sub

Private Sub btnOK_Click()
    If Not targetCell Is Nothing Then
        targetCell.Value = Me.txtMemo.Text
    End If
    Unload Me
End Sub

Private Sub btnCancel_Click()
    Unload Me
End Sub

