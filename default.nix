{ pkgs, lib, ... }:
pkgs.buildNpmPackage {
  pname = "plasma-runner-js-eval";
  version = "1.0.0";

  meta = {
    description = "KRunner plugin for JavaScript evaluation";
    license = lib.licenses.mit;
    homepage = "https://github.com/opl-/plasma-runner-js-eval#readme";
    mainProgram = "plasma-runner-js-eval";
  };

  src = ./.;

  # Obtained with `prefetch-npm-deps package-lock.json`
  npmDepsHash = "sha256-nVr4vdTzYrZ9kBkH+yhC/6sZDlHrP+yMEFTv24uPrjg=";

  # There is no build script.
  dontNpmBuild = true;

  # dbus-native uses npm package abstract-socket to support unix:abstract DBus path (see envvar DBUS_SESSION_BUS_ADDRESS).
  # The abstract-socket package is optional, deprecated, and requires node-gyp to install.
  # We use overrides to replace it work npm:dry-uninstall.
  postInstall = ''
    # Make KRunner able to detect our runner.
    # This path is used by official plasma runners on Nix for both KDE 5 and 6 plugins.
    mkdir -p $out/share/krunner/dbusplugins
    cp plasma-runner-js-eval.desktop $out/share/krunner/dbusplugins
  '';
}
