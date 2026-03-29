-- install-bridge-macos.scpt
-- Instala el bridge de Packet Tracer en macOS

property bridgePort : "54321"
property bootstrapURL : "http://127.0.0.1:" & bridgePort & "/bridge-client.js"
property maxTimeout : 10

on waitForWindow(windowName, timeoutSeconds)
    set startTime to current date
    set checkCount to 0
    repeat
        set checkCount to checkCount + 1
        
        tell application "System Events"
            tell process "PacketTracer"
                set ptWindows to every window
                repeat with w in ptWindows
                    if window name of w contains windowName then
                        return true
                    end if
                end repeat
            end tell
        end tell
        
        set currentTime to current date
        if (currentTime - startTime) > timeoutSeconds then
            return false
        end if
        
        if checkCount mod 4 = 0 then
            delay 0.5
        else
            delay 0.25
        end if
    end repeat
    return false
end waitForWindow

on waitForPTReady(timeoutSeconds)
    set startTime to current date
    set checkCount to 0
    repeat
        set checkCount to checkCount + 1
        
        tell application "System Events"
            tell process "PacketTracer"
                set ptWindows to every window
                if (count of ptWindows) > 0 then
                    return true
                end if
            end tell
        end tell
        
        set currentTime to current date
        if (currentTime - startTime) > timeoutSeconds then
            return false
        end if
        
        if checkCount mod 4 = 0 then
            delay 0.5
        else
            delay 0.25
        end if
    end repeat
    return false
end waitForPTReady

on fetchBootstrapScript()
    try
        set curlOutput to do shell script "curl -s -m 10 " & quoted form of bootstrapURL
        if curlOutput is "" then return false
        return curlOutput
    on error errMsg number errNum
        return false
    end try
end fetchBootstrapScript

try
    tell application "System Events"
        set ptExists to exists (application process "PacketTracer")
    end tell
    
    if not ptExists then
        display dialog "Packet Tracer no está ejecutándose. Ábrelo manualmente y ejecuta este script de nuevo." buttons {"OK"} default button 1 with icon caution
        return
    end if
    
    if not waitForPTReady(maxTimeout) then
        display dialog "No se detecto ventana de PT." buttons {"OK"} default button 1 with icon caution
        return
    end if
    
    tell application "PacketTracer" to activate
    delay 1
    
    tell application "System Events"
        tell process "PacketTracer"
            set frontmost to true
            delay 0.5
            tell menu bar 1
                click menu bar item "Extensions"
                delay 0.5
                click menu item "Builder Code Editor" of menu 1 of menu bar item "Extensions"
            end tell
        end tell
    end tell
    
    if not waitForWindow("Code Editor", maxTimeout) then
        display dialog "No se pudo abrir Code Editor. Verifica que el menu Extensions > Builder Code Editor exista." buttons {"OK"} default button 1 with icon caution
        return
    end if
    
    delay 1
    set bootstrapScript to fetchBootstrapScript()
    
    if bootstrapScript is false then
        display dialog "No se pudo obtener bootstrap. Asegurate que el bridge server este corriendo en puerto " & bridgePort buttons {"OK"} default button 1 with icon caution
        return
    end if
    
    set the clipboard to bootstrapScript
    
    tell application "System Events"
        tell process "PacketTracer"
            keystroke "a" using command down
            delay 0.2
            keystroke "v" using command down
            delay 0.5
            keystroke return using command down
        end tell
    end tell
    
    delay 2
    display dialog "Puente instalado en PT! El script se ejecutara." buttons {"OK"} default button 1 with icon note
    
on error errMsg number errNum
    if errNum = -128 then
        display dialog "Operacion cancelada por el usuario." buttons {"OK"} default button 1 with icon caution
        return
    end if
    
    if errMsg contains "not allowed" or errMsg contains "permission" then
        display dialog "Permisos de accesibilidad requeridos." & return & return & "Ve a: System Preferences > Security & Privacy > Privacy > Accessibility" & return & "Y agrega Terminal a la lista." buttons {"OK"} default button 1 with icon caution
    else
        display dialog "Error: " & errMsg & ". Codigo: " & errNum buttons {"OK"} default button 1 with icon caution
    end if
end try
