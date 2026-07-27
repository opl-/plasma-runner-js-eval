{ overlay }:
{
  config,
  lib,
  pkgs,
  ...
}:
with lib;
let
  cfg = config.services.plasma-runner-js-eval;
in {
  options.services.plasma-runner-js-eval = {
    enable = options.mkEnableOption "KRunner JavaScript Eval, a KRunner plugin for JavaScript evaluation";

    package = options.mkPackageOption pkgs "plasma-runner-js-eval" {};
  };

  config = mkIf cfg.enable {
    nixpkgs.overlays = [ overlay ];

    # Add to system packages to make the plugin discoverable by KRunner via the .desktop file.
    environment.systemPackages = [ cfg.package ];

    systemd.user.services.plasma-runner-js-eval = {
      description = "KRunner plugin for JavaScript evaluation";

      after = [ "graphical.target" ];
      wantedBy = [ "graphical.target" ];

      serviceConfig = {
        ExecStart = [ "${cfg.package}/bin/plasma-runner-js-eval" ];
      };
    };
  };
}
