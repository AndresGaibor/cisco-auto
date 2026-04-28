# IOS_EXEC_FAILED dump

Fecha: Tue Apr 28 10:35:51 -05 2026
PT_DEV_DIR: /Users/andresgaibor/pt-dev

## Últimos results relevantes
```

----- /Users/andresgaibor/pt-dev/results/cmd_000000017338.json -----
{"protocolVersion":2,"id":"cmd_000000017338","seq":17338,"type":"terminal.plan.run","startedAt":1777390414138,"completedAt":1777390414496,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-f6494aa0","job":{"id":"cmd-f6494aa0","kind":"ios-session","version":1,"device":"SW-SRV-DIST","plan":[{"type":"ensure-mode","kind":"ensure-mode","value":"privileged-exec","expectMode":"privileged-exec","allowPager":true,"allowConfirm":false,"optional":false,"timeoutMs":12000,"options":{"timeoutMs":12000},"metadata":{"reason":"auto-enable-for-privileged-ios-command"}},{"type":"command","kind":"command","value":"show running-config","command":"show running-config","allowPager":true,"allowConfirm":false,"optional":false,"timeoutMs":12000,"options":{"timeoutMs":12000},"metadata":{}}],"options":{"stopOnError":true,"commandTimeoutMs":12000,"stallTimeoutMs":15000},"payload":{"source":"terminal.plan.run","metadata":{"deviceKind":"ios","source":"pt-control.terminal-plan-builder","lineCount":1},"policies":{"autoBreakWizard":true,"autoAdvancePager":true,"maxPagerAdvances":80,"maxConfirmations":0,"abortOnPromptMismatch":false,"abortOnModeMismatch":true}}}}}```

## Logs cmd-sm / exec / term
```
```

## Últimos eventos queue
```
{"seq":17180,"ts":1777388039010,"type":"command-enqueued","id":"cmd_000000017180","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388049797}
{"seq":17181,"ts":1777388039376,"type":"command-enqueued","id":"cmd_000000017181","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388049797}
{"seq":17182,"ts":1777388039782,"type":"command-enqueued","id":"cmd_000000017182","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388049798}
{"seq":17183,"ts":1777388040190,"type":"command-enqueued","id":"cmd_000000017183","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388049798}
{"seq":17184,"ts":1777388040601,"type":"command-enqueued","id":"cmd_000000017184","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388049797}
{"seq":17185,"ts":1777388040970,"type":"command-enqueued","id":"cmd_000000017185","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388049797}
{"seq":17186,"ts":1777388041379,"type":"command-enqueued","id":"cmd_000000017186","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388049797}
{"seq":17187,"ts":1777388041781,"type":"command-enqueued","id":"cmd_000000017187","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388049797}
{"seq":17188,"ts":1777388042191,"type":"command-enqueued","id":"cmd_000000017188","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388049797}
{"seq":17189,"ts":1777388042602,"type":"command-enqueued","id":"cmd_000000017189","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388049797}
{"seq":17190,"ts":1777388043010,"type":"command-enqueued","id":"cmd_000000017190","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388049797}
{"seq":17191,"ts":1777388043380,"type":"command-enqueued","id":"cmd_000000017191","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388049797}
{"seq":17192,"ts":1777388043787,"type":"command-enqueued","id":"cmd_000000017192","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388049797}
{"seq":17193,"ts":1777388044182,"type":"command-enqueued","id":"cmd_000000017193","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388049797}
{"seq":17194,"ts":1777388044586,"type":"command-enqueued","id":"cmd_000000017194","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388049797}
{"seq":17195,"ts":1777388044996,"type":"command-enqueued","id":"cmd_000000017195","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388049797}
{"seq":17196,"ts":1777388045410,"type":"command-enqueued","id":"cmd_000000017196","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388049797}
{"seq":17197,"ts":1777388045779,"type":"command-enqueued","id":"cmd_000000017197","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388049797}
{"seq":17198,"ts":1777388046182,"type":"command-enqueued","id":"cmd_000000017198","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388049797}
{"seq":17199,"ts":1777388046594,"type":"command-enqueued","id":"cmd_000000017199","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388049797}
{"seq":17200,"ts":1777388047006,"type":"command-enqueued","id":"cmd_000000017200","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388049797}
{"seq":17201,"ts":1777388047421,"type":"command-enqueued","id":"cmd_000000017201","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388049797}
{"seq":17202,"ts":1777388047886,"type":"command-enqueued","id":"cmd_000000017202","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388049797}
{"seq":17203,"ts":1777388048297,"type":"command-enqueued","id":"cmd_000000017203","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388049797}
{"seq":17204,"ts":1777388048709,"type":"command-enqueued","id":"cmd_000000017204","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388049797}
{"seq":17205,"ts":1777388049081,"type":"command-enqueued","id":"cmd_000000017205","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388050076}
{"seq":17206,"ts":1777388049492,"type":"command-enqueued","id":"cmd_000000017206","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388050489}
{"seq":17207,"ts":1777388050469,"type":"command-enqueued","id":"cmd_000000017207","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777388110467}
{"seq":17208,"ts":1777388062010,"type":"command-enqueued","id":"cmd_000000017208","commandType":"terminal.plan.run","payloadSizeBytes":562,"expiresAt":1777388067007}
{"seq":17209,"ts":1777388062258,"type":"command-enqueued","id":"cmd_000000017209","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388079256}
{"seq":17210,"ts":1777388080086,"type":"command-enqueued","id":"cmd_000000017210","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777388140084}
{"seq":17211,"ts":1777388091348,"type":"command-enqueued","id":"cmd_000000017211","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777388096343}
{"seq":17212,"ts":1777388091514,"type":"command-enqueued","id":"cmd_000000017212","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388108511}
{"seq":17213,"ts":1777388109855,"type":"command-enqueued","id":"cmd_000000017213","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777388169851}
{"seq":17214,"ts":1777388120650,"type":"command-enqueued","id":"cmd_000000017214","commandType":"terminal.plan.run","payloadSizeBytes":865,"expiresAt":1777388125645}
{"seq":17215,"ts":1777388120972,"type":"command-enqueued","id":"cmd_000000017215","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388137939}
{"seq":17216,"ts":1777388121464,"type":"command-enqueued","id":"cmd_000000017216","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388137939}
{"seq":17217,"ts":1777388121933,"type":"command-enqueued","id":"cmd_000000017217","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388137939}
{"seq":17218,"ts":1777388122401,"type":"command-enqueued","id":"cmd_000000017218","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388137939}
{"seq":17219,"ts":1777388122808,"type":"command-enqueued","id":"cmd_000000017219","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388137939}
{"seq":17220,"ts":1777388123180,"type":"command-enqueued","id":"cmd_000000017220","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388137939}
{"seq":17221,"ts":1777388123591,"type":"command-enqueued","id":"cmd_000000017221","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388137939}
{"seq":17222,"ts":1777388124034,"type":"command-enqueued","id":"cmd_000000017222","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388137939}
{"seq":17223,"ts":1777388124615,"type":"command-enqueued","id":"cmd_000000017223","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388137939}
{"seq":17224,"ts":1777388125132,"type":"command-enqueued","id":"cmd_000000017224","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388137939}
{"seq":17225,"ts":1777388125601,"type":"command-enqueued","id":"cmd_000000017225","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388137939}
{"seq":17226,"ts":1777388126015,"type":"command-enqueued","id":"cmd_000000017226","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388137939}
{"seq":17227,"ts":1777388126531,"type":"command-enqueued","id":"cmd_000000017227","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388137939}
{"seq":17228,"ts":1777388127001,"type":"command-enqueued","id":"cmd_000000017228","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388137939}
{"seq":17229,"ts":1777388127413,"type":"command-enqueued","id":"cmd_000000017229","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388137940}
{"seq":17230,"ts":1777388127928,"type":"command-enqueued","id":"cmd_000000017230","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388137939}
{"seq":17231,"ts":1777388128399,"type":"command-enqueued","id":"cmd_000000017231","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388137939}
{"seq":17232,"ts":1777388128808,"type":"command-enqueued","id":"cmd_000000017232","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388137939}
{"seq":17233,"ts":1777388129177,"type":"command-enqueued","id":"cmd_000000017233","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388137939}
{"seq":17234,"ts":1777388129602,"type":"command-enqueued","id":"cmd_000000017234","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388137939}
{"seq":17235,"ts":1777388130046,"type":"command-enqueued","id":"cmd_000000017235","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388137939}
{"seq":17236,"ts":1777388130547,"type":"command-enqueued","id":"cmd_000000017236","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388137940}
{"seq":17237,"ts":1777388131097,"type":"command-enqueued","id":"cmd_000000017237","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388137939}
{"seq":17238,"ts":1777388131506,"type":"command-enqueued","id":"cmd_000000017238","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388137939}
{"seq":17239,"ts":1777388131913,"type":"command-enqueued","id":"cmd_000000017239","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388137939}
{"seq":17240,"ts":1777388132431,"type":"command-enqueued","id":"cmd_000000017240","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388137939}
{"seq":17241,"ts":1777388132883,"type":"command-enqueued","id":"cmd_000000017241","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388137939}
{"seq":17242,"ts":1777388133291,"type":"command-enqueued","id":"cmd_000000017242","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388137940}
{"seq":17243,"ts":1777388133696,"type":"command-enqueued","id":"cmd_000000017243","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388137939}
{"seq":17244,"ts":1777388134106,"type":"command-enqueued","id":"cmd_000000017244","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388137939}
{"seq":17245,"ts":1777388134476,"type":"command-enqueued","id":"cmd_000000017245","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388137940}
{"seq":17246,"ts":1777388134887,"type":"command-enqueued","id":"cmd_000000017246","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388137939}
{"seq":17247,"ts":1777388135296,"type":"command-enqueued","id":"cmd_000000017247","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388137939}
{"seq":17248,"ts":1777388135707,"type":"command-enqueued","id":"cmd_000000017248","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388137939}
{"seq":17249,"ts":1777388136114,"type":"command-enqueued","id":"cmd_000000017249","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388137939}
{"seq":17250,"ts":1777388136628,"type":"command-enqueued","id":"cmd_000000017250","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388137940}
{"seq":17251,"ts":1777388137095,"type":"command-enqueued","id":"cmd_000000017251","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388138094}
{"seq":17252,"ts":1777388137479,"type":"command-enqueued","id":"cmd_000000017252","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388138477}
{"seq":17253,"ts":1777388137896,"type":"command-enqueued","id":"cmd_000000017253","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388138894}
{"seq":17254,"ts":1777388138816,"type":"command-enqueued","id":"cmd_000000017254","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777388198813}
{"seq":17255,"ts":1777388149954,"type":"command-enqueued","id":"cmd_000000017255","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777388154952}
{"seq":17256,"ts":1777388150263,"type":"command-enqueued","id":"cmd_000000017256","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388167261}
{"seq":17257,"ts":1777388150818,"type":"command-enqueued","id":"cmd_000000017257","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388167261}
{"seq":17258,"ts":1777388151187,"type":"command-enqueued","id":"cmd_000000017258","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388167261}
{"seq":17259,"ts":1777388151623,"type":"command-enqueued","id":"cmd_000000017259","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388167262}
{"seq":17260,"ts":1777388151996,"type":"command-enqueued","id":"cmd_000000017260","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388167261}
{"seq":17261,"ts":1777388152407,"type":"command-enqueued","id":"cmd_000000017261","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388167261}
{"seq":17262,"ts":1777388152817,"type":"command-enqueued","id":"cmd_000000017262","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388167261}
{"seq":17263,"ts":1777388153230,"type":"command-enqueued","id":"cmd_000000017263","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388167261}
{"seq":17264,"ts":1777388153604,"type":"command-enqueued","id":"cmd_000000017264","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388167261}
{"seq":17265,"ts":1777388153980,"type":"command-enqueued","id":"cmd_000000017265","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388167261}
{"seq":17266,"ts":1777388154449,"type":"command-enqueued","id":"cmd_000000017266","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388167261}
{"seq":17267,"ts":1777388154912,"type":"command-enqueued","id":"cmd_000000017267","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388167261}
{"seq":17268,"ts":1777388155280,"type":"command-enqueued","id":"cmd_000000017268","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388167261}
{"seq":17269,"ts":1777388155702,"type":"command-enqueued","id":"cmd_000000017269","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388167261}
{"seq":17270,"ts":1777388156090,"type":"command-enqueued","id":"cmd_000000017270","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388167261}
{"seq":17271,"ts":1777388156481,"type":"command-enqueued","id":"cmd_000000017271","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388167261}
{"seq":17272,"ts":1777388156883,"type":"command-enqueued","id":"cmd_000000017272","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388167261}
{"seq":17273,"ts":1777388157338,"type":"command-enqueued","id":"cmd_000000017273","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388167261}
{"seq":17274,"ts":1777388157799,"type":"command-enqueued","id":"cmd_000000017274","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388167261}
{"seq":17275,"ts":1777388158216,"type":"command-enqueued","id":"cmd_000000017275","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388167261}
{"seq":17276,"ts":1777388158626,"type":"command-enqueued","id":"cmd_000000017276","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388167261}
{"seq":17277,"ts":1777388159093,"type":"command-enqueued","id":"cmd_000000017277","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388167261}
{"seq":17278,"ts":1777388159479,"type":"command-enqueued","id":"cmd_000000017278","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388167262}
{"seq":17279,"ts":1777388159890,"type":"command-enqueued","id":"cmd_000000017279","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388167261}
{"seq":17280,"ts":1777388160308,"type":"command-enqueued","id":"cmd_000000017280","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388167261}
{"seq":17281,"ts":1777388160720,"type":"command-enqueued","id":"cmd_000000017281","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388167261}
{"seq":17282,"ts":1777388161237,"type":"command-enqueued","id":"cmd_000000017282","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388167261}
{"seq":17283,"ts":1777388161710,"type":"command-enqueued","id":"cmd_000000017283","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388167261}
{"seq":17284,"ts":1777388162178,"type":"command-enqueued","id":"cmd_000000017284","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388167261}
{"seq":17285,"ts":1777388162587,"type":"command-enqueued","id":"cmd_000000017285","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388167261}
{"seq":17286,"ts":1777388162994,"type":"command-enqueued","id":"cmd_000000017286","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388167261}
{"seq":17287,"ts":1777388163402,"type":"command-enqueued","id":"cmd_000000017287","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388167261}
{"seq":17288,"ts":1777388163811,"type":"command-enqueued","id":"cmd_000000017288","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388167261}
{"seq":17289,"ts":1777388164330,"type":"command-enqueued","id":"cmd_000000017289","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388167261}
{"seq":17290,"ts":1777388164797,"type":"command-enqueued","id":"cmd_000000017290","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388167261}
{"seq":17291,"ts":1777388165182,"type":"command-enqueued","id":"cmd_000000017291","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388167261}
{"seq":17292,"ts":1777388165591,"type":"command-enqueued","id":"cmd_000000017292","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388167261}
{"seq":17293,"ts":1777388165978,"type":"command-enqueued","id":"cmd_000000017293","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388167261}
{"seq":17294,"ts":1777388166389,"type":"command-enqueued","id":"cmd_000000017294","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388167387}
{"seq":17295,"ts":1777388166799,"type":"command-enqueued","id":"cmd_000000017295","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388167798}
{"seq":17296,"ts":1777388167207,"type":"command-enqueued","id":"cmd_000000017296","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388168205}
{"seq":17297,"ts":1777388384546,"type":"command-enqueued","id":"cmd_000000017297","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777388444541}
{"seq":17298,"ts":1777388384782,"type":"command-enqueued","id":"cmd_000000017298","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777388389780}
{"seq":17299,"ts":1777388390254,"type":"command-enqueued","id":"cmd_000000017299","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777388450252}
{"seq":17300,"ts":1777388390479,"type":"command-enqueued","id":"cmd_000000017300","commandType":"terminal.plan.run","payloadSizeBytes":562,"expiresAt":1777388395477}
{"seq":17301,"ts":1777388390746,"type":"command-enqueued","id":"cmd_000000017301","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388407744}
{"seq":17302,"ts":1777388408332,"type":"command-enqueued","id":"cmd_000000017302","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777388468330}
{"seq":17303,"ts":1777388421123,"type":"command-enqueued","id":"cmd_000000017303","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777388426113}
{"seq":17304,"ts":1777388421680,"type":"command-enqueued","id":"cmd_000000017304","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388438679}
{"seq":17305,"ts":1777388422142,"type":"command-enqueued","id":"cmd_000000017305","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388438679}
{"seq":17306,"ts":1777388422690,"type":"command-enqueued","id":"cmd_000000017306","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388438679}
{"seq":17307,"ts":1777388423154,"type":"command-enqueued","id":"cmd_000000017307","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388438680}
{"seq":17308,"ts":1777388423688,"type":"command-enqueued","id":"cmd_000000017308","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388438679}
{"seq":17309,"ts":1777388424153,"type":"command-enqueued","id":"cmd_000000017309","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388438679}
{"seq":17310,"ts":1777388424698,"type":"command-enqueued","id":"cmd_000000017310","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388438679}
{"seq":17311,"ts":1777388425184,"type":"command-enqueued","id":"cmd_000000017311","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388438679}
{"seq":17312,"ts":1777388425688,"type":"command-enqueued","id":"cmd_000000017312","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388438679}
{"seq":17313,"ts":1777388426146,"type":"command-enqueued","id":"cmd_000000017313","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388438679}
{"seq":17314,"ts":1777388426632,"type":"command-enqueued","id":"cmd_000000017314","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388438679}
{"seq":17315,"ts":1777388427130,"type":"command-enqueued","id":"cmd_000000017315","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388438679}
{"seq":17316,"ts":1777388427683,"type":"command-enqueued","id":"cmd_000000017316","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388438679}
{"seq":17317,"ts":1777388428149,"type":"command-enqueued","id":"cmd_000000017317","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388438679}
{"seq":17318,"ts":1777388428687,"type":"command-enqueued","id":"cmd_000000017318","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388438679}
{"seq":17319,"ts":1777388429158,"type":"command-enqueued","id":"cmd_000000017319","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388438679}
{"seq":17320,"ts":1777388429685,"type":"command-enqueued","id":"cmd_000000017320","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388438680}
{"seq":17321,"ts":1777388430160,"type":"command-enqueued","id":"cmd_000000017321","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388438679}
{"seq":17322,"ts":1777388430682,"type":"command-enqueued","id":"cmd_000000017322","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388438679}
{"seq":17323,"ts":1777388431150,"type":"command-enqueued","id":"cmd_000000017323","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388438679}
{"seq":17324,"ts":1777388431684,"type":"command-enqueued","id":"cmd_000000017324","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388438679}
{"seq":17325,"ts":1777388432154,"type":"command-enqueued","id":"cmd_000000017325","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388438679}
{"seq":17326,"ts":1777388432678,"type":"command-enqueued","id":"cmd_000000017326","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388438679}
{"seq":17327,"ts":1777388433145,"type":"command-enqueued","id":"cmd_000000017327","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388438679}
{"seq":17328,"ts":1777388433682,"type":"command-enqueued","id":"cmd_000000017328","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388438679}
{"seq":17329,"ts":1777388434182,"type":"command-enqueued","id":"cmd_000000017329","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388438679}
{"seq":17330,"ts":1777388434749,"type":"command-enqueued","id":"cmd_000000017330","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388438688}
{"seq":17331,"ts":1777388435433,"type":"command-enqueued","id":"cmd_000000017331","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388438679}
{"seq":17332,"ts":1777388435992,"type":"command-enqueued","id":"cmd_000000017332","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388438679}
{"seq":17333,"ts":1777388436632,"type":"command-enqueued","id":"cmd_000000017333","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388438679}
{"seq":17334,"ts":1777388437185,"type":"command-enqueued","id":"cmd_000000017334","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388438679}
{"seq":17335,"ts":1777388437687,"type":"command-enqueued","id":"cmd_000000017335","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388438684}
{"seq":17336,"ts":1777388438187,"type":"command-enqueued","id":"cmd_000000017336","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777388439184}
{"seq":17337,"ts":1777390413690,"type":"command-enqueued","id":"cmd_000000017337","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777390473686}
{"seq":17338,"ts":1777390414068,"type":"command-enqueued","id":"cmd_000000017338","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777390419066}
{"seq":17339,"ts":1777390414512,"type":"command-enqueued","id":"cmd_000000017339","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777390474509}
```

## Diff actual
```diff
diff --git a/packages/pt-control/src/adapters/runtime-terminal/adapter.ts b/packages/pt-control/src/adapters/runtime-terminal/adapter.ts
index af60ecc6..1fd3b520 100644
--- a/packages/pt-control/src/adapters/runtime-terminal/adapter.ts
+++ b/packages/pt-control/src/adapters/runtime-terminal/adapter.ts
@@ -282,6 +282,18 @@ export function createRuntimeTerminalAdapter(
     };
   }
 
+  function computeDeferredPollTimeoutMs(plan: TerminalPlan, requestedTimeoutMs: number): number {
+    const planTimeouts = plan.timeouts as TerminalPlanTimeouts | undefined;
+    const commandTimeoutMs = Number(planTimeouts?.commandTimeoutMs ?? requestedTimeoutMs ?? 30000);
+    const stallTimeoutMs = Number(planTimeouts?.stallTimeoutMs ?? 15000);
+    const stepCount = Math.max(plan.steps.length, 1);
+
+    const perStepBudgetMs = commandTimeoutMs + stallTimeoutMs + 3000;
+    const totalBudgetMs = perStepBudgetMs * stepCount;
+
+    return Math.max(requestedTimeoutMs, totalBudgetMs, 25000);
+  }
+
   async function executeTerminalPlanRun(
     plan: TerminalPlan,
     timeoutMs: number,
@@ -336,7 +348,7 @@ export function createRuntimeTerminalAdapter(
 
     if (isDeferredValue(submitValue)) {
       const startedAt = Date.now();
-      const pollTimeoutMs = Math.max(timeoutMs, 2000);
+      const pollTimeoutMs = computeDeferredPollTimeoutMs(plan, timeoutMs);
       const pollIntervalMs = 300;
 
       let pollValue: unknown = null;
diff --git a/packages/pt-runtime/src/pt/kernel/execution-engine.ts b/packages/pt-runtime/src/pt/kernel/execution-engine.ts
index 0d68d678..6a1f2b12 100644
--- a/packages/pt-runtime/src/pt/kernel/execution-engine.ts
+++ b/packages/pt-runtime/src/pt/kernel/execution-engine.ts
@@ -119,18 +119,107 @@ export function createExecutionEngine(terminal: TerminalEngine): ExecutionEngine
     };
   }
 
+  function resolvePacketTracerIpc(): any {
+    try {
+      if (typeof ipc !== "undefined" && ipc && typeof ipc.network === "function") {
+        return ipc;
+      }
+    } catch {}
+
+    try {
+      if (typeof _ScriptModule !== "undefined" && _ScriptModule) {
+        const scriptModule = _ScriptModule as any;
+        const context = scriptModule.context;
+        const scriptModuleIpc = context && context.ipc;
+
+        if (scriptModuleIpc && typeof scriptModuleIpc.network === "function") {
+          return scriptModuleIpc;
+        }
+      }
+    } catch {}
+
+    try {
+      if (typeof self !== "undefined" && self) {
+        const root = self as any;
+
+        if (root.ipc && typeof root.ipc.network === "function") {
+          return root.ipc;
+        }
+
+        const scriptModule = root._ScriptModule;
+        const context = scriptModule && scriptModule.context;
+        const scriptModuleIpc = context && context.ipc;
+
+        if (scriptModuleIpc && typeof scriptModuleIpc.network === "function") {
+          return scriptModuleIpc;
+        }
+      }
+    } catch {}
+
+    return null;
+  }
+
   function tryAttachTerminal(device: string): boolean {
     try {
-      var net = typeof ipc !== "undefined" && ipc && typeof ipc.network === "function" ? ipc.network() : null;
-      var dev = net && typeof net.getDevice === "function" ? net.getDevice(device) : null;
-      var term = dev && typeof dev.getCommandLine === "function" ? dev.getCommandLine() : null;
+      const resolvedIpc = resolvePacketTracerIpc();
+
+      if (!resolvedIpc) {
+        execLog("ATTACH failed device=" + device + " reason=no-ipc");
+        return false;
+      }
+
+      const net = typeof resolvedIpc.network === "function" ? resolvedIpc.network() : null;
+
+      if (!net || typeof net.getDevice !== "function") {
+        execLog("ATTACH failed device=" + device + " reason=no-network");
+        return false;
+      }
+
+      const dev = net.getDevice(device);
+
+      if (!dev) {
+        execLog("ATTACH failed device=" + device + " reason=no-device");
+        return false;
+      }
+
+      if (typeof dev.getCommandLine !== "function") {
+        execLog("ATTACH failed device=" + device + " reason=no-get-command-line");
+        return false;
+      }
+
+      const term = dev.getCommandLine();
 
       if (!term) {
         execLog("ATTACH failed device=" + device + " reason=no-command-line");
         return false;
       }
 
-      terminal.attach(device, term);
+      if (typeof term.enterCommand !== "function") {
+        execLog("ATTACH failed device=" + device + " reason=no-enter-command");
+        return false;
+      }
+
+      if (typeof term.registerEvent !== "function") {
+        execLog("ATTACH failed device=" + device + " reason=no-register-event");
+        return false;
+      }
+
+      if (typeof term.unregisterEvent !== "function") {
+        execLog("ATTACH failed device=" + device + " reason=no-unregister-event");
+        return false;
+      }
+
+      const attachableTerm =
+        typeof term.getPrompt === "function"
+          ? term
+          : {
+              ...term,
+              getPrompt: function () {
+                return "";
+              },
+            };
+
+      terminal.attach(device, attachableTerm as any);
       return true;
     } catch (error) {
       execLog("ATTACH failed device=" + device + " error=" + String(error));
@@ -286,6 +375,92 @@ export function createExecutionEngine(terminal: TerminalEngine): ExecutionEngine
     }, 0);
   }
 
+  function modeMatches(actual: unknown, expected: unknown): boolean {
+    const current = String(actual ?? "").trim();
+    const target = String(expected ?? "").trim();
+
+    if (!target) return true;
+    if (current === target) return true;
+
+    if (target === "global-config") {
+      return current === "config" || current === "global-config";
+    }
+
+    if (target === "privileged-exec") {
+      return current === "privileged-exec";
+    }
+
+    return false;
+  }
+
+  function inferModeFromPrompt(prompt: string): string {
+    const value = String(prompt ?? "").trim();
+
+    if (/\(config[^)]*\)#$/.test(value)) return "config";
+    if (/#$/.test(value)) return "privileged-exec";
+    if (/>$/.test(value)) return "user-exec";
+
+    return "unknown";
+  }
+
+  function readSession(device: string): { mode: string; prompt: string } {
+    try {
+      const session = terminal.getSession(device) as any;
+      const prompt = String(session?.prompt ?? "");
+      const mode = String(session?.mode ?? "unknown");
+
+      return {
+        mode: mode === "unknown" ? inferModeFromPrompt(prompt) : mode,
+        prompt,
+      };
+    } catch {
+      return { mode: "unknown", prompt: "" };
+    }
+  }
+
+  function commandForEnsureMode(currentMode: string, targetMode: string): string | null {
+    if (modeMatches(currentMode, targetMode)) return null;
+
+    if (targetMode === "privileged-exec") {
+      if (isConfigMode(currentMode)) return "end";
+      return "enable";
+    }
+
+    if (targetMode === "global-config" || targetMode === "config") {
+      if (currentMode === "user-exec" || currentMode === "unknown") return "enable";
+      if (currentMode === "privileged-exec") return "configure terminal";
+    }
+
+    return null;
+  }
+
+  function completeJobIfLastStep(job: ActiveJob, result: TerminalResult | null): boolean {
+    const ctx = job.context;
+
+    if (ctx.currentStep < ctx.plan.plan.length) {
+      return false;
+    }
+
+    execLog("JOB COMPLETED id=" + job.id + " steps=" + ctx.stepResults.length);
+    ctx.phase = "completed";
+    ctx.result = result;
+    ctx.finished = true;
+    ctx.updatedAt = Date.now();
+    wakePendingJobsForDevice(job.device);
+    return true;
+  }
+
+  function promptMatches(prompt: string, expectedPrompt: string): boolean {
+    if (!expectedPrompt) return true;
+    if (prompt.indexOf(expectedPrompt) >= 0) return true;
+
+    try {
+      return new RegExp(expectedPrompt).test(prompt);
+    } catch {
+      return false;
+    }
+  }
+
   function getCurrentStep(ctx: JobContext): DeferredStep | null {
     if (ctx.currentStep >= ctx.plan.plan.length) return null;
     return ctx.plan.plan[ctx.currentStep];
@@ -319,6 +494,182 @@ export function createExecutionEngine(terminal: TerminalEngine): ExecutionEngine
         break;
       }
 
+      case "ensure-mode": {
+        const targetMode = String(
+          (step as any).expectMode ||
+            (step.options as any)?.expectedMode ||
+            step.value ||
+            "privileged-exec",
+        );
+
+        const session = readSession(job.device);
+        const command = commandForEnsureMode(session.mode, targetMode);
+
+        ctx.phase = "waiting-ensure-mode";
+        ctx.lastMode = session.mode;
+        ctx.lastPrompt = session.prompt;
+
+        if (!targetMode || command === null) {
+          if (targetMode && !modeMatches(session.mode, targetMode)) {
+            execLog("ENSURE MODE unsupported target=" + targetMode + " current=" + session.mode + " id=" + job.id);
+            if (stopOnError) {
+              ctx.phase = "error";
+              ctx.error = "Cannot ensure terminal mode " + targetMode + " from " + session.mode;
+              ctx.errorCode = "ENSURE_MODE_UNSUPPORTED";
+              ctx.finished = true;
+              ctx.updatedAt = Date.now();
+              wakePendingJobsForDevice(job.device);
+              return;
+            }
+          }
+
+          ctx.stepResults.push({
+            stepIndex: ctx.currentStep,
+            stepType: stepType,
+            command: "",
+            raw: "",
+            status: 0,
+            completedAt: Date.now(),
+          });
+          ctx.currentStep++;
+          ctx.phase = "pending";
+          ctx.updatedAt = Date.now();
+          if (!completeJobIfLastStep(job, null)) advanceJob(job.id);
+          return;
+        }
+
+        execLog(
+          "ENSURE MODE id=" +
+            job.id +
+            " device=" +
+            job.device +
+            " current=" +
+            session.mode +
+            " target=" +
+            targetMode +
+            " cmd='" +
+            command +
+            "'",
+        );
+
+        const ensureModeTimeoutMs = Number((step.options as any)?.timeoutMs ?? 8000);
+
+        ctx.waitingForCommandEnd = true;
+        job.pendingCommand = terminal.executeCommand(job.device, command, {
+          commandTimeoutMs: ensureModeTimeoutMs,
+          stallTimeoutMs: ctx.plan.options.stallTimeoutMs,
+          expectedMode: targetMode as any,
+          allowPager: false,
+          autoAdvancePager: false,
+          maxPagerAdvances: 0,
+          autoConfirm: false,
+          autoDismissWizard: true,
+          allowEmptyOutput: true,
+          sendEnterFallback: false,
+        });
+
+        job.pendingCommand
+          .then(function (result) {
+            if (ctx.finished) return;
+
+            job.pendingCommand = null;
+            ctx.waitingForCommandEnd = false;
+            ctx.outputBuffer += result.output;
+            ctx.lastPrompt = result.session.prompt;
+            ctx.lastMode = result.session.mode;
+            ctx.paged = result.session.paging;
+
+            ctx.stepResults.push({
+              stepIndex: ctx.currentStep,
+              stepType: stepType,
+              command: command,
+              raw: result.output,
+              status: result.status,
+              completedAt: Date.now(),
+            });
+
+            if (!modeMatches(result.session.mode, targetMode)) {
+              execLog(
+                "ENSURE MODE FAILED id=" +
+                  job.id +
+                  " expected=" +
+                  targetMode +
+                  " actual=" +
+                  result.session.mode,
+              );
+              ctx.phase = "error";
+              ctx.error = "Expected mode " + targetMode + ", got " + result.session.mode;
+              ctx.errorCode = "ENSURE_MODE_FAILED";
+              ctx.finished = true;
+              ctx.updatedAt = Date.now();
+              cleanupConfigSession(job.device, result.session.mode, result.session.prompt);
+              wakePendingJobsForDevice(job.device);
+              return;
+            }
+
+            ctx.currentStep++;
+            ctx.phase = "pending";
+            ctx.error = null;
+            ctx.errorCode = null;
+            ctx.updatedAt = Date.now();
+
+            if (!completeJobIfLastStep(job, result)) advanceJob(job.id);
+          })
+          .catch(function (err) {
+            if (ctx.finished) return;
+            execLog("ENSURE MODE ERROR id=" + job.id + " error=" + String(err));
+            job.pendingCommand = null;
+            ctx.waitingForCommandEnd = false;
+            ctx.phase = "error";
+            ctx.error = String(err);
+            ctx.errorCode = "ENSURE_MODE_EXEC_ERROR";
+            ctx.finished = true;
+            ctx.updatedAt = Date.now();
+            cleanupConfigSession(job.device, ctx.lastMode, ctx.lastPrompt);
+            wakePendingJobsForDevice(job.device);
+          });
+        break;
+      }
+
+      case "expect-prompt": {
+        const expectedPrompt = String(
+          (step.options as any)?.expectedPrompt ||
+            (step as any).expectPromptPattern ||
+            step.value ||
+            "",
+        );
+
+        const session = readSession(job.device);
+        const prompt = session.prompt || ctx.lastPrompt;
+        const matched = promptMatches(prompt, expectedPrompt);
+
+        if (!matched && stopOnError) {
+          ctx.phase = "error";
+          ctx.error = "Expected prompt " + expectedPrompt + ", got " + prompt;
+          ctx.errorCode = "EXPECT_PROMPT_FAILED";
+          ctx.finished = true;
+          ctx.updatedAt = Date.now();
+          wakePendingJobsForDevice(job.device);
+          return;
+        }
+
+        ctx.stepResults.push({
+          stepIndex: ctx.currentStep,
+          stepType: stepType,
+          command: "",
+          raw: prompt,
+          status: 0,
+          completedAt: Date.now(),
+        });
+        ctx.lastMode = session.mode;
+        ctx.lastPrompt = prompt;
+        ctx.currentStep++;
+        ctx.phase = "pending";
+        ctx.updatedAt = Date.now();
+        if (!completeJobIfLastStep(job, null)) advanceJob(job.id);
+        break;
+      }
+
       case "release-session":
       case "close-session": {
         execLog("RELEASE SESSION id=" + job.id + " device=" + job.device);
@@ -452,13 +803,7 @@ export function createExecutionEngine(terminal: TerminalEngine): ExecutionEngine
             ctx.phase = "pending";
             ctx.updatedAt = Date.now();
 
-            if (ctx.currentStep >= ctx.plan.plan.length) {
-              execLog("JOB COMPLETED id=" + job.id + " steps=" + ctx.stepResults.length);
-              ctx.phase = "completed";
-              ctx.result = result;
-              ctx.finished = true;
-              wakePendingJobsForDevice(job.device);
-            } else {
+            if (!completeJobIfLastStep(job, result)) {
               advanceJob(job.id);
             }
           })
diff --git a/packages/pt-runtime/src/terminal/engine/command-state-machine.ts b/packages/pt-runtime/src/terminal/engine/command-state-machine.ts
index 7047a770..877d87c9 100644
--- a/packages/pt-runtime/src/terminal/engine/command-state-machine.ts
+++ b/packages/pt-runtime/src/terminal/engine/command-state-machine.ts
@@ -230,6 +230,19 @@ export class CommandStateMachine {
     this.onMoreDisplayedHandler = this.onMoreDisplayed.bind(this);
   }
 
+  private debug(message: string): void {
+    try {
+      dprint(
+        "[cmd-sm] device=" +
+          this.config.deviceName +
+          " command=" +
+          JSON.stringify(this.config.command) +
+          " " +
+          message,
+      );
+    } catch {}
+  }
+
   /**
    * Ejecuta el comando y retorna el resultado.
    */
@@ -249,7 +262,19 @@ export class CommandStateMachine {
       this.config.warnings.push("Terminal not ready after retries: " + readyResult.prompt);
     }
 
+    this.debug(
+      "run start promptBefore=" +
+        JSON.stringify(this.config.promptBefore) +
+        " modeBefore=" +
+        JSON.stringify(this.config.modeBefore) +
+        " timeoutMs=" +
+        commandTimeoutMs +
+        " stallMs=" +
+        stallTimeoutMs,
+    );
+
     this.setupHandlers();
+    this.debug("handlers setup complete");
 
     // Start output polling fallback
     this.startOutputPolling();
@@ -279,7 +304,11 @@ export class CommandStateMachine {
         try { terminal.enterChar(13, 0); } catch (e) {}
       }
 
+      this.debug("enterCommand begin");
       terminal.enterCommand(this.config.command);
+      this.startedSeen = true;
+      this.resetStallTimer();
+      this.debug("enterCommand sent");
 
       sleep(100).then(() => {
         if (!this.settled && this.startedSeen) {
@@ -456,9 +485,25 @@ export class CommandStateMachine {
         this.lastTerminalSnapshot = { raw: "", source: "reset" };
       }
 
+      try {
+        const prompt = this.config.getPromptSafeFn(this.config.terminal);
+        if (prompt && prompt !== this.previousPrompt) {
+          this.previousPrompt = prompt;
+          this.promptStableSince = this.config.now();
+
+          const mode = detectModeFromPrompt(normalizePrompt(prompt));
+          this.config.session.lastPrompt = normalizePrompt(prompt);
+          this.config.session.lastMode = mode;
+
+          this.debug("poll prompt=" + JSON.stringify(prompt) + " mode=" + mode);
+          this.scheduleFinalizeAfterCommandEnd();
+        }
+      } catch {}
+
       if (currentRaw.raw.length > this.lastTerminalSnapshot.raw.length) {
         const delta = currentRaw.raw.substring(this.lastTerminalSnapshot.raw.length);
         this.lastTerminalSnapshot = currentRaw;
+        this.debug("poll output deltaLen=" + delta.length);
         this.onOutput(null, { chunk: delta, newOutput: delta });
       }
     };
@@ -746,6 +791,32 @@ export class CommandStateMachine {
 
     const currentPrompt = this.config.getPromptSafeFn(this.config.terminal);
 
+    const snapshot = this.config.readTerminalSnapshotFn!(this.config.terminal);
+    const diff = diffSnapshotStrict(this.config.baselineOutput, snapshot.raw);
+    const snapshotDelta = String(diff.delta || "");
+    const hasAnyOutput = this.outputBuffer.trim().length > 0 || snapshotDelta.trim().length > 0;
+    const promptLooksReady = /^[A-Za-z0-9._-]+(?:\(config[^)]*\))?[>#]\s*$/.test(String(currentPrompt || "").trim());
+    const quietLongEnough = this.config.now() - this.lastOutputAt >= 700;
+
+    if (
+      this.startedSeen &&
+      promptLooksReady &&
+      quietLongEnough &&
+      !this.config.session.pagerActive &&
+      !this.config.session.confirmPromptActive
+    ) {
+      if (hasAnyOutput || this.config.options.allowEmptyOutput === true || this.config.command === "enable") {
+        this.debug(
+          "finalize by prompt-ready fallback prompt=" +
+            JSON.stringify(currentPrompt) +
+            " hasAnyOutput=" +
+            hasAnyOutput,
+        );
+        this.finalize(true, this.endedStatus, "prompt-ready-fallback");
+        return;
+      }
+    }
+
     const verdict = shouldFinalizeCommand({
       state: {
         startedSeen: this.startedSeen,
@@ -778,6 +849,23 @@ export class CommandStateMachine {
   private finalize(cmdOk: boolean, status: number | null, error?: string, code?: TerminalErrorCode): void {
     if (this.settled) return;
 
+    this.debug(
+      "finalize ok=" +
+        cmdOk +
+        " status=" +
+        status +
+        " error=" +
+        JSON.stringify(error || "") +
+        " code=" +
+        JSON.stringify(code || "") +
+        " outputLen=" +
+        this.outputBuffer.length +
+        " startedSeen=" +
+        this.startedSeen +
+        " endedSeen=" +
+        this.commandEndedSeen,
+    );
+
     this.finalizedOk = cmdOk;
     if (status !== null) this.endedStatus = status;
     this.finalizedError = error;
@@ -789,6 +877,15 @@ export class CommandStateMachine {
   }
 
   private finalizeFailure(code: TerminalErrorCode, message: string): void {
+    this.debug(
+      "finalizeFailure code=" +
+        String(code) +
+        " message=" +
+        JSON.stringify(message) +
+        " outputLen=" +
+        this.outputBuffer.length,
+    );
+
     const recoverable =
       code === TerminalErrors.COMMAND_START_TIMEOUT ||
       code === TerminalErrors.COMMAND_END_TIMEOUT ||
```
