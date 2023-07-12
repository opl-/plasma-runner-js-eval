{
  description = "JavaScript runner for KRunner using Node.js";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      # Support all systems supported by nodejs
      allSystems = [
        "aarch64-linux"
        "x86_64-linux"
        "x86_64-darwin"
        "aarch64-linux"
        "aarch64-darwin"
        "i686-linux"
      ];

      # Helper to provide system-specific attributes
      forAllSystems = f: nixpkgs.lib.genAttrs allSystems (system: f {
        inherit system;
        pkgs = import nixpkgs { inherit system; };
      });
    in
    {
      packages = forAllSystems ({ pkgs, ... }: rec {
        default = plasma-runner-js-eval;
        plasma-runner-js-eval = pkgs.callPackage ./default.nix {};
      });

      overlays = forAllSystems ({ pkgs, system }: final: prev: {
        plasma-runner-js-eval = self.packages.${system}.plasma-runner-js-eval;
      });
    };
}
