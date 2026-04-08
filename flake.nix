{
  description = "Development shell for the Obsidian simple plugin monorepo";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.11";
    flake-utils.url = "github:numtide/flake-utils";
    moonbit-overlay.url = "github:moonbit-community/moonbit-overlay";
  };

  outputs = { self, nixpkgs, flake-utils, moonbit-overlay }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          overlays = [ moonbit-overlay.overlays.default ];
        };
      in {
        devShells.default = pkgs.mkShell {
          packages = [
            pkgs.moonbit-bin.moonbit.latest
          ];

          shellHook = ''
            export PATH="$PWD/bin:$PATH"
            echo "Helper: obsidian-dev <command>"
          '';
        };
      });
}
