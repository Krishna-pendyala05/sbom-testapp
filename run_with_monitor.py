
import sys
import os

# First import our monitor
sys.path.insert(0, '.')
import pythonMonitor

# Then import the actual app
if len(sys.argv) > 1:
    # Get the script name from args
    script_name = sys.argv[1]
    
    # Set up sys.argv for the script
    sys.argv = sys.argv[1:]
    
    # Execute the script
    with open(script_name) as f:
        code = compile(f.read(), script_name, 'exec')
        exec(code, globals())
else:
    print("Please provide a script to run: python run_with_monitor.py your_script.py")
