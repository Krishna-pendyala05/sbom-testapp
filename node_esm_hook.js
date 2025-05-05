
        // ESM Hook for Node.js
        export function resolve(specifier, context, nextResolve) {
          // Add to dependencies list (this function comes from the data option)
          if (context.parentURL && context.data && context.data.addDependency) {
            context.data.addDependency(specifier);
          }
          return nextResolve(specifier, context);
        }
      