
import json
import os
import sys
from datetime import datetime

# Set to track unique packages
dynamic_deps = set()

# Original import hook
original_import = __import__

def custom_import(name, *args, **kwargs):
    # Track all imports
    dynamic_deps.add(name)
    # Save to dynamic-dependencies.json in the proper format
    save_dynamic_deps()
    return original_import(name, *args, **kwargs)

def save_dynamic_deps():
    deps_file = os.path.join(os.getcwd(), 'dynamic-dependencies.json')
    formatted_deps = []
    
    for pkg in dynamic_deps:
        # Check if the module is from standard library
        is_stdlib = False
        if pkg in sys.builtin_module_names:
            is_stdlib = True
        elif pkg in sys.modules and hasattr(sys.modules[pkg], '__file__') and sys.modules[pkg].__file__:
            is_stdlib = 'site-packages' not in sys.modules[pkg].__file__ and 'dist-packages' not in sys.modules[pkg].__file__
        
        formatted_deps.append({
            "package": pkg,
            "type": "runtime",
            "timestamp": datetime.now().isoformat(),
            "detected_by": "python-monitor",
            "module_type": "stdlib" if is_stdlib else "third-party"
        })
    
    with open(deps_file, 'w') as f:
        json.dump(formatted_deps, f, indent=2)

# Replace the built-in import function
__builtins__['__import__'] = custom_import

print("Enhanced Python import monitoring enabled - tracking all imports with stdlib/third-party classification")
      