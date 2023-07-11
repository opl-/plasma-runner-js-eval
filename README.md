# KRunner JavaScript Eval

This node script allows running JavaScript code from your KRunner. It uses DBus to communicate with KRunner.


## Installation

## NixOS with flakes

To install on a flake-based NixOS system:

```nix
{
  inputs = {
    nixpkgs = {
      url = "github:NixOS/nixpkgs/nixos-unstable";
    };
    # Add this repository as an input.
    plasma-runner-js-eval = {
      url = "github:opl-/plasma-runner-js-eval";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  # Add the input to the arguments.
  outputs = { self, nixpkgs, plasma-runner-js-eval, ... }: {
    nixosConfigurations = {
      hostname = let
        system = "x86_64-linux";
      in
        nixpkgs.lib.nixosSystem {
          inherit system;
          modules = [
            ./configuration.nix
            {
              # Add the package to nixpkgs using an overlay.
              nixpkgs.overlays = [ plasma-runner-js-eval.overlays.${system} ];

              users.users.opl = {
                # Add it to user packages.
                packages = with pkgs; [
                  plasma-runner-js-eval
                ];
              };
            }
          ];
        };
    };
  };
}
```

After rebuilding the system you can enable the service with `systemctl --user enable plasma-runner-js-eval`.

## Manually

Alternatively, you can install this script manually by running the following commands:

```bash
git clone https://github.com/opl-/plasma-runner-js-eval.git
cd plasma-runner-js-eval
npm install
node index.js
```

In order for KRunner to be aware of this runner, you need to link `plasma-runner-js-eval.desktop` to `~/.local/share/kservices5/` or equivalent. You may also need to enable the `JavaScript Eval` runner in KRunner settings.


## Usage

Start your query with `>` to signal that you want to run JavaScript, then write your code. It will be continuously ran as you type, immediately reporting errors or the last returned value in your script. For example:

`>'JavaScript'.length` shows `10`

`>'JavaScript'.toLowerCase()` shows `'javascript'`

You can select the JavaScript Eval match to save the result into the `$` variable. For example:

```js
>'JavaScript'.toLowerCase()
>$.slice(0, 4)
```

Returns `'java'` as your result. You can also set global variables and access them in later queries:

```js
>x = [1, 2]
>x[1]
```

This results in `2`. You can then use `>>new` to reset the global environment to its defaults.

## Built-in functions

There's a number of built-in functions to extend functionality and ease writing quick scripts.

### `log(...args: any) => any | any[]`

Prints the passed in objects in a notification and returns the passed in arguments. If more than one argument is passed, the arguments are treated as a single array, affecting also the return value.

### `require(what: string) => any`

A limited version of the Node.js `require()` function. `what` specifies the requested module. The allowed modules are:

- `crypto`
- `path`
- `querystring`
- `string_decoder`
- `url`

### `makeArr(length: number, entryGenerator: (index: number, array: any[], ...args: any[]) => any, ...args: any) => any[]`

Generates an array by calling the `entryGenerator` function `length` number of times and pushing the returned values into the array. The `entryGenerator` function is called with arguments:

- `index` - Current index
- `array` - The array being generated
- `...args` - List of arguments that were passed to the `makeArr` function after the generator

### `range(start: number, end?: number, step?: number) => number[]`

Generates an array of numbers ranging from `start` to `end`, using the increment of `step`.

If `end` is missing, it defaults to `0`. If `step` is missing or `0`, it defaults to `1` if `end > start`, or `-1` if `end < start`.

If `step` takes takes the range in the direction opposite of `end`, an empty array is returned.

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

### `copy(...args: any) => any | any[]`

Stringifies and puts the passed in argument into the clipboard using Klipper's DBus interface, then returns the argument. If more than one argument is passed, the arguments are treated as a single array, also affecting the return value.

### `paste(index?: number | string) => string`

Returns the clipboard entry at `index` or the most recent entry if `index` cannot be converted into a number.

### `deg(degrees: number) => number`

Converts degrees to radians.

### `rad(radians: number) => number`

Converts radians to degrees.
