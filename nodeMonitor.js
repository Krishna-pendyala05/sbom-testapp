
        const originalRequire = module.constructor.prototype.require;
        module.constructor.prototype.require = function(path) {
          console.log(`DYNDEP:node:${path}`);
          return originalRequire.apply(this, arguments);
        };
      