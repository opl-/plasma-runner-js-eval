{ pkgs, nodejs, ... }:
pkgs.buildNpmPackage {
  pname = "plasma-runner-js-eval";
  version = "1.0.0";

  src = ./.;

  # Obtained with `prefetch-npm-deps package-lock.json`
  npmDepsHash = "sha256-nVr4vdTzYrZ9kBkH+yhC/6sZDlHrP+yMEFTv24uPrjg=";

  # There is no build script.
  dontNpmBuild = true;

  # dbus-native uses npm package abstract-socket to support unix:abstract DBus path (see envvar DBUS_SESSION_BUS_ADDRESS).
  # The abstract-socket package is optional, deprecated, and requires node-gyp to install.
  # We use overrides to replace it work npm:dry-uninstall.
  installPhase = ''
    # Install npm dependencies.
    npm ci

    # Copy program and its dependencies to the build output.
    mkdir -p $out
    cp -r lib node_modules $out

    # Make KRunner able to detect our runner.
    # This path is used by official plasma runners on Nix for both KDE 5 and 6 plugins.
    mkdir -p $out/share/krunner/dbusplugins
    cp plasma-runner-js-eval.desktop $out/share/krunner/dbusplugins

    # Create a user service.
    substituteInPlace plasma-runner-js-eval.service --replace "/path/to/program" "$out"
    substituteInPlace plasma-runner-js-eval.service --replace "=node" "=${nodejs}/bin/node"
    mkdir -p $out/share/systemd/user
    cp plasma-runner-js-eval.service $out/share/systemd/user
  '';
}
