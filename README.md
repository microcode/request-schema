
#### Installation

```
    npm install --save @microcode/request-schema
```

## API

new Schema(methods) - Create a new schema, supporting a set of methods.

* methods - What methods to support registration on.

Example:
```
    new Schema(['create','read','update','delete']);
```
_Creates a new schema supporting CRUD._

schema.on(method, path, [filters], func) - Register a function on a specific method and path in the schema.

* method - What method to register on
* path - What path to register on
* filters - Optional list of filters to run before the function
* func - Function to execute

The function arguments are dynamic (determined when registered), and supports all extracted parameters in the path, along with two special parameters `data` and `context`.

* For normal functions, `context` is used as the context for the function call.
* Arrow functions requires `context` as a parameter since the context is already overridden.

You can register multiple functions on the same path. If a filter on a function fails (due to e.g. missing authorization), the next function will attempt to run.

Example:
```
    schema.on('read', '/objects/:object_id/attributes', new AuthCheckFilter(), (object_id, data, context) => { ... });
```

schema.run(method, path, data, context) - Run a registered method

Example:
```
    schema.run('read', '/objects/1234/attributes', {}, { user_id: 5763 });
```

### Filters

Filters allow for sharing common functionality to verify and or modify a request. Example use cases could be authentication or request caching.

A filter inherits from the `Filter` class, and implements the method `run`. This method may return a promise.

The data passed into the filter method is a `FilterData` object, and it exposes the following attributes and methods.
* method - Method type being called
* data - Data being passed into the function
* context - Context used in this call
* resolve(response) - Call to resolve early (without calling function)
* reject(err) - Call to reject filter (same as throwing an error)
* on_resolve(func) - Register a callback that runs after the function has successfully executed. Parameters are:
  * data - Data returned from function
  * context - Context used in function

Resolve callbacks execute in the order they are registered, and will execute even if a filters resolves early. If a callback throws an exception, the following functions will NOT be executed.

Resolve callbacks may return a promise.

### Paths

* Paths are separated by forward slashes. Example: `/this/is/a/path`
* Parameters are supported by prefixing a path component with a colon. Example: `/this/is/a/:parameter`. Parameters are made available to the registered function.

### License

This package uses the MIT license. Please read [LICENSE.md] for details.
