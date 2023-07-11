{ pkgs, ... }:
pkgs.buildNpmPackage {
  pname = "plasma-runner-js-eval";
  version = "1.0.0";

  nativeBuildInputs = with pkgs; [
    python3 # Needed by node-gyp
  ];

  src = ./.;

  # Obtained with `prefetch-npm-deps package-lock.json`
  npmDepsHash = "sha256-4Fz1RmLoP4st7QIawcG/7REkUE3KzJgwjHpLpEmPoag=";

  # There is no build script.
  dontNpmBuild = true;

  installPhase = ''
    # Install npm dependencies.
    npm ci

    # Copy program and its dependencies to the build output.
    mkdir -p $out
    cp -r lib node_modules $out

    # Make KRunner able to detect our runner.
    mkdir -p $out/share/kservices5
    # The path should be roughly equivalent to `SERVICES_INSTALL_DIR` of the KDEInstallDirs Extra CMake module.
    # https://api.kde.org/ecm/kde-module/KDEInstallDirs5.html
    cp plasma-runner-js-eval.desktop $out/share/kservices5

    # Create a user service.
    substituteInPlace plasma-runner-js-eval.service --replace "/path/to/program" "$out"
    substituteInPlace plasma-runner-js-eval.service --replace "=node" "=${pkgs.nodejs-18_x}/bin/node"
    mkdir -p $out/share/systemd/user
    cp plasma-runner-js-eval.service $out/share/systemd/user
  '';
}
