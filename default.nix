# Due to using node-gyp, the nodejs version should be the same as the one used by `buildNpmPackage`, as otherwise the native module will likely fail to load.
{ pkgs, nodejs, ... }:
pkgs.buildNpmPackage {
  pname = "plasma-runner-js-eval";
  version = "1.0.0";

  nativeBuildInputs = with pkgs; [
    python3 # Needed by node-gyp
  ];

  src = ./.;

  # Obtained with `prefetch-npm-deps package-lock.json`
  npmDepsHash = "sha256-hOP8FmpK2nHFASuuCynVNJWckgh9n9YsZ5DwCKvk0e8=";

  # There is no build script.
  dontNpmBuild = true;

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
