-- uninstall-bridge-macos.scpt
-- Desinstala el bridge de Packet Tracer en macOS

property maxTimeout : 10

on closeCodeEditor()
    tell application "System Events"
        tell process "Packet Tracer"
            set frontmost to true
            delay 0.5
            keystroke "w" using command down
            delay 0.5
        end tell
    end tell
end closeCodeEditor

try
    tell application "System Events"
        set ptExists to exists (application process "Packet Tracer")
    end tell
    
    if not ptExists then
        display dialog "Packet Tracer no esta corriendo." buttons {"OK"} default button 1 with icon note
        return
    end if
    
    tell application "Packet Tracer" to activate
    delay 1
    closeCodeEditor()
    delay 1
    
    display dialog "Puente desinstalado de PT! La ventana del Code Editor ha sido cerrada." buttons {"OK"} default button 1 with icon note
    
on error errMsg number errNum
    display dialog "Error: " & errMsg & ". Codigo: " & errNum buttons {"OK"} default button 1 with icon caution
end try
