' FreeGSTBill Silent Launcher
' Starts the FreeGSTBill server without showing a console window
' and opens the app in the default browser.

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Get the directory where this script is located
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

' Check if Node.js is available
nodeCheck = WshShell.Run("cmd /c where node >nul 2>nul", 0, True)
If nodeCheck <> 0 Then
    MsgBox "Node.js is not installed." & vbCrLf & vbCrLf & _
           "Please run 'Install FreeGSTBill.bat' first, or install Node.js from https://nodejs.org", _
           vbExclamation, "FreeGSTBill"
    WScript.Quit 1
End If

' Check if node_modules exists
If Not fso.FolderExists(scriptDir & "\node_modules") Then
    MsgBox "Dependencies not installed." & vbCrLf & vbCrLf & _
           "Please run 'Install FreeGSTBill.bat' first.", _
           vbExclamation, "FreeGSTBill"
    WScript.Quit 1
End If

' Check if dist exists, build if not
If Not fso.FileExists(scriptDir & "\dist\index.html") Then
    MsgBox "Building the app for first time, please wait...", vbInformation, "FreeGSTBill"
    WshShell.Run "cmd /c cd /d """ & scriptDir & """ && npm run build", 1, True
End If

' Check if server is already running on port 3001
On Error Resume Next
Set http = CreateObject("MSXML2.XMLHTTP")
http.Open "GET", "http://localhost:3001/api/profile", False
http.Send
serverRunning = (http.Status = 200)
Set http = Nothing
On Error GoTo 0

If serverRunning Then
    ' Server already running, just open browser
    WshShell.Run "http://localhost:3001", 1, False
    WScript.Quit 0
End If

' Start the server silently
WshShell.Run "cmd /c cd /d """ & scriptDir & """ && node server.js", 0, False

' Wait for server to be ready (check every second, up to 15 seconds)
maxWait = 15
waited = 0
Do While waited < maxWait
    WScript.Sleep 1000
    waited = waited + 1
    On Error Resume Next
    Set http = CreateObject("MSXML2.XMLHTTP")
    http.Open "GET", "http://localhost:3001/api/profile", False
    http.Send
    If http.Status = 200 Then
        Set http = Nothing
        On Error GoTo 0
        Exit Do
    End If
    Set http = Nothing
    On Error GoTo 0
Loop

' Open browser
WshShell.Run "http://localhost:3001", 1, False
