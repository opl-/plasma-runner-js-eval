## Updating buildNpmPackage on npm dependency changes

The npm dependencies hash in `default.nix` must be updated after adding or updating the node packages using the following commands:

```sh
$ nix shell nixpkgs#prefetch-npm-deps

nix-shell $ prefetch-npm-deps package-lock.json
```

The `default.nix` should be commited together with `package-lock.json`.
