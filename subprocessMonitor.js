
        const cp = require('child_process');
        const origExec = cp.exec;
        const origSpawn = cp.spawn;
        const origExecFile = cp.execFile;
        const fs = require('fs');
        
        // Helper to log subprocess calls
        function logSubprocessCall(command) {
          const logFile = 'subprocess-calls.log';
          fs.appendFileSync(logFile, `${command}\n`);
          
          // Check for package managers
          if (command.includes('pip install')) {
            const logEntry = `SUBPROCESS:pip:${command}\n`;
            fs.appendFileSync(logFile, logEntry);
          } else if (command.includes('apt') && command.includes('install')) {
            const logEntry = `SUBPROCESS:apt:${command}\n`;
            fs.appendFileSync(logFile, logEntry);
          } else if (command.includes('yum install')) {
            const logEntry = `SUBPROCESS:yum:${command}\n`;
            fs.appendFileSync(logFile, logEntry);
          }
        }
        
        // Override child_process.exec
        cp.exec = function(command, options, callback) {
          logSubprocessCall(command);
          return origExec.apply(this, arguments);
        };
        
        // Override child_process.spawn
        cp.spawn = function(command, args, options) {
          if (args && args.length) {
            const fullCommand = `${command} ${args.join(' ')}`;
            logSubprocessCall(fullCommand);
          } else {
            logSubprocessCall(command);
          }
          return origSpawn.apply(this, arguments);
        };
        
        // Override child_process.execFile
        cp.execFile = function(file, args, options, callback) {
          if (args && args.length) {
            const fullCommand = `${file} ${args.join(' ')}`;
            logSubprocessCall(fullCommand);
          } else {
            logSubprocessCall(file);
          }
          return origExecFile.apply(this, arguments);
        };
      