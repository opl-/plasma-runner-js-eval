# KRunner JavaScript Eval

This node script allows running JavaScript code from your KRunner. It uses DBus to communicate with KRunner.


## Installation

In order for KRunner to be aware of this script, you need to link `plasma-runner-js-eval.desktop` to `~/.local/share/kservices5/` or equivalent. You may also need to enable the `JavaScript Eval` runner in KRunner settings.


## Usage

Start your query with `>` to signal that you want to run JavaScript, then write your code. It will be continuously ran as you type, immediately reporting errors or the last returned value in your script. For example:

`>'JavaScript'.length` shows `10`

`>'JavaScript'.toLowerCase()` shows `'javascript'`

You can select the JavaScript Eval match to save the result into the `$` variable. For example:

```js
>'JavaScript'.toLowerCase()
>$.slice(0, 4)
```

Results `'java'` as your result. You can also set global variables and access them in later queries:

```js
>x = [1, 2]
>x[1]
```

This results in `2`. You can then use `>>new` to reset the global environment to its defaults.

## Built-in functions

There's a number of built-in functions to extend functionality and ease writing quick scripts.

### `log(...args: any) => any | any[]`

Prints the passed in objects in a notification and returns the passed in arguments. If more than one argument is passed, the arguments are treated as a single array, affecting also the return value.

### `makeArr(length: number, entryGenerator: (index: number, array: any[], ...args: any[]) => any, ...args: any) => any[]`

Generates an array by calling the `entryGenerator` function `length` number of times and pushing the returned values into the array. The `entryGenerator` function is called with arguments:

- `index` - Current index
- `array` - The array being generated
- `...args` - List of arguments that were passed to the `makeArr` function after the generator

### `sum(...args: number | string) => number`

Returns the sum of passed items, flattning passed arrays and converting strings into floats.

### `randF(numberA: number, numberB?: number) => number`

Returns a random number:

- If `numberB` is specified, between `numberA` and exclusive `numberB`
- Otherwise between `0` and exclusive `numberA`

### `rand(numberA: number, numberB?: number) => number`

Returns a random integer number:

- If `numberB` is specified, between `numberA` and exclusive `numberB`
- Otherwise between `0` and exclusive `numberA`
