@shim-works/babel-plugin-transform-async-to-promises
====================================================

Babel plugin to transform `async` functions containing `await` expressions to the equivalent chain of `Promise` calls with use of minimal helper functions.

> **Fork notice**
>
> This is a fork of [rpetrich/babel-plugin-transform-async-to-promises](https://github.com/rpetrich/babel-plugin-transform-async-to-promises), whose last release was `0.8.18` in December 2021. All credit for the plugin belongs to Ryan Petrich; it remains MIT licensed under his copyright.
>
> Versions track upstream: `0.8.19` is upstream `0.8.18` plus the changes below.
>
> Supports Babel 6 and Babel 7, matching upstream. **Babel 8 is not supported.**
>
> ### Bugs fixed
>
> Both reproduce against upstream `0.8.18` and are covered by the test suite.
>
> - **[#84](https://github.com/rpetrich/babel-plugin-transform-async-to-promises/issues/84) — `_async is not defined`.** With `topLevelAwait: "return"` and `@babel/plugin-transform-modules-systemjs`, the output called `_async(...)` without ever emitting the helper, so the module threw `ReferenceError` at runtime.
> - **`Could not find newly created binding for _temp!`** — thrown when compiling an `async` function where a `for...of` wraps a `try`/`catch` containing `await`, with `hoist: true` and `@babel/preset-env` downlevelling `for...of` for an older target. Babel's `Scope#push` descends into the loop body and registers the binding on a descendant scope, while `getBinding` only walks up.
>
> ### Hardening
>
> No failing test behind these — they were verified not to change output across 792 transform pairs on Babel 6 and Babel 7.
>
> - Keeps the parsed helper cache per plugin instance rather than per module, so two Babel versions sharing a process cannot reuse each other's helper ASTs.
> - Skips await expressions in subtrees an earlier rewrite has already detached. This only misbehaves under Babel 8, which is unsupported here, so it is forward-looking.
> - Adds the regression test from upstream [PR #94](https://github.com/rpetrich/babel-plugin-transform-async-to-promises/pull/94). The bug it covers ([#90](https://github.com/rpetrich/babel-plugin-transform-async-to-promises/issues/90)) was already fixed in `0.8.18`; the test pins it.

Install:

```bash
npm install --save-dev @shim-works/babel-plugin-transform-async-to-promises
```

```jsonc
// babel.config.json
{
	"plugins": ["@shim-works/babel-plugin-transform-async-to-promises"]
}
```

### Input:

```javascript
async function fetchAsObjectURL(url) {
    const response = await fetch(url);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
}
```

### Output:

```javascript
const fetchAsObjectURL = _async(function(url) {
	return _await(fetch(url), function(response) {
		return _await(response.blob(), URL.createObjectURL);
	});
});
```

### Output with `hoist` enabled:

```javascript
function _response$blob(response) {
	return _await(response.blob(), URL.createObjectURL);
}
const fetchAsObjectURL = _async(function(url) {
	return _await(fetch(url), _response$blob);
});
```

### Output with `inlineHelpers` enabled:

```javascript
const fetchAsObjectURL = function(url) {
	try {
		return Promise.resolve(fetch(url)).then(function(response) {
			return Promise.resolve(response.blob()).then(URL.createObjectURL);
		});
	} catch(e) {
		return Promise.reject(e);
	}
}
```

### Output with `externalHelpers` enabled:

In the normal case, helpers are added to the top of the file for the `_async` and `_await` functions (as well as others). This can cause bloat in a codebase due to duplication of helper code in every file. To avoid this, enable `externalHelpers` and those will be imported instead:

```javascript
import { _async } from "@shim-works/babel-plugin-transform-async-to-promises/helpers";
import { _await } from "@shim-works/babel-plugin-transform-async-to-promises/helpers";

const fetchAsObjectURL = _async(function(url) {
	return _await(fetch(url), function(response) {
		return _await(response.blob(), URL.createObjectURL);
	});
});

export default fetchAsObjectURL;
```

## JavaScript Language Features

### Full Support
- `async`/`await`
- `for`/`while`/`do` loops (including loops that would exhaust stack if dispatched recursively)
- `switch` statements (including fallthrough and `default` cases)
- conditional expressions
- logical expressions
- `try`/`catch`
- `break`/`continue` statements (on both loops and labeled statements)
- `throw` expressions
- Function hoisting
- Variable hoisting
- Arrow functions
- Methods
- `arguments`
- `this`
- Proper member dereference order of operations
- Standards-compliant event loop scheduling

### Partial Support
- `Function.length`: `async` functions will often return a length of 0 (when the `_async` wrapper is used)
- Top level await support is experimental with compatible module bundler. Set `topLevelAwait` option to `return` when using SystemJS.

### No support
- `eval`: impossible to support without deep hooks into the runtime
- Async generator functions: not implemented or planned
- `Function.name`: rewrite pass removes function name instrumentation
- `new AsyncFunction(...)`: impossible to support without shipping babel and the plugin in the output
