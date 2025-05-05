
import json
import os
import sys
import importlib
import importlib.util
import importlib.metadata
from datetime import datetime
import threading
import time

# Path to the dynamic dependencies file
DEPS_FILE = os.path.join(os.getcwd(), 'dynamic-dependencies.json')

# Lock for thread-safe file access
file_lock = threading.Lock()

# Set to track unique packages
dynamic_deps = set()

def get_package_name(module_name):
    """Get the top-level package name from a module"""
    return module_name.split('.')[0]

def is_stdlib_module(module_name):
    """Check if a module is from the standard library"""
    if module_name in sys.builtin_module_names:
        return True
    
    spec = importlib.util.find_spec(module_name)
    if spec is None:
        return False
    
    origin = spec.origin
    if origin is None:
        return True
    
    return ('site-packages' not in origin and 
            'dist-packages' not in origin and
            'Lib' in origin)

def get_package_metadata(package_name):
    """Get detailed metadata for a package"""
    try:
        if is_stdlib_module(package_name):
            return {
                "name": package_name,
                "version": "stdlib",
                "type": "runtime",
                "timestamp": datetime.now().isoformat(),
                "detected_by": "python-monitor",
                "module_type": "stdlib"
            }
        
        # Try to get distribution info using importlib.metadata (Python 3.8+)
        try:
            metadata = importlib.metadata.metadata(package_name)
            version = importlib.metadata.version(package_name)
            
            # Extract license info
            license_info = metadata.get('License', 'unknown')
            
            # Additional metadata
            author = metadata.get('Author', 'unknown')
            description = metadata.get('Summary', '')
            homepage = metadata.get('Home-page', '')
            
            # Create PURL (Package URL)
            purl = f"pkg:pypi/{package_name}@{version}"
            
            return {
                "name": package_name,
                "version": version,
                "license": license_info,
                "type": "runtime",
                "timestamp": datetime.now().isoformat(),
                "detected_by": "python-monitor",
                "module_type": "third-party",
                "author": author,
                "description": description,
                "homepage": homepage,
                "purl": purl
            }
        except Exception as e:
            # Fallback to using the package's __version__ attribute
            try:
                module = importlib.import_module(package_name)
                version = getattr(module, '__version__', 'unknown')
                return {
                    "name": package_name,
                    "version": version,
                    "type": "runtime",
                    "timestamp": datetime.now().isoformat(),
                    "detected_by": "python-monitor",
                    "module_type": "third-party",
                    "purl": f"pkg:pypi/{package_name}@{version}"
                }
            except Exception as inner_e:
                return {
                    "name": package_name,
                    "version": "unknown",
                    "type": "runtime",
                    "timestamp": datetime.now().isoformat(),
                    "detected_by": "python-monitor",
                    "module_type": "third-party",
                    "error": f"Failed to extract metadata: {str(inner_e)}"
                }
    except Exception as e:
        print(f"Error getting metadata for {package_name}: {e}")
        return {
            "name": package_name,
            "version": "unknown",
            "type": "runtime",
            "timestamp": datetime.now().isoformat(),
            "detected_by": "python-monitor",
            "module_type": "third-party",
            "error": f"Failed to extract metadata: {str(e)}"
        }

def save_dynamic_deps():
    """Save the dynamic dependencies to the JSON file"""
    with file_lock:
        # Read existing deps first
        existing_deps = []
        if os.path.exists(DEPS_FILE):
            try:
                with open(DEPS_FILE, 'r') as f:
                    content = f.read().strip()
                    if content:
                        existing_deps = json.loads(content)
            except Exception as e:
                print(f"Error reading existing deps: {e}")
                existing_deps = []
        
        # Create a map of existing packages
        existing_map = {(item.get('name', ''), item.get('type', '')): item for item in existing_deps}
        
        # Add new deps
        for pkg in dynamic_deps:
            # Skip standard library modules for SBOM
            if is_stdlib_module(pkg):
                continue
                
            # Get full metadata
            metadata = get_package_metadata(pkg)
            
            key = (pkg, 'runtime')
            if key not in existing_map:
                existing_deps.append(metadata)
                print(f"Added dynamic dependency: {pkg}@{metadata.get('version', 'unknown')}")
        
        # Write back to file
        with open(DEPS_FILE, 'w') as f:
            json.dump(existing_deps, f, indent=2)

# Original import hook
original_import = __import__

def custom_import(name, *args, **kwargs):
    # Track all imports
    pkg_name = get_package_name(name)
    if pkg_name and pkg_name not in dynamic_deps:
        dynamic_deps.add(pkg_name)
        save_dynamic_deps()
    return original_import(name, *args, **kwargs)

# Replace the built-in import function
__builtins__['__import__'] = custom_import

# Set up a background thread to periodically check for new modules
def monitor_loaded_modules():
    known_modules = set(sys.modules.keys())
    
    while True:
        # Wait a bit
        time.sleep(5)
        
        # Check for new modules
        current_modules = set(sys.modules.keys())
        new_modules = current_modules - known_modules
        
        # Add any new modules
        for module in new_modules:
            pkg_name = get_package_name(module)
            if pkg_name and pkg_name not in dynamic_deps:
                dynamic_deps.add(pkg_name)
        
        # Save if we found any new ones
        if new_modules:
            save_dynamic_deps()
            
        # Update known modules
        known_modules = current_modules

# Start the monitoring thread
monitor_thread = threading.Thread(target=monitor_loaded_modules, daemon=True)
monitor_thread.start()

print("Enhanced Python import monitoring enabled - now with complete package metadata")
      