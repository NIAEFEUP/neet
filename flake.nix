{
  description = "neet - SvelteKit local dev shell";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          name = "neet-dev";

          packages = with pkgs; [
            nodejs
            pnpm
          ];

          shellHook = ''
            echo "[neet] Entering dev shell..."

            if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ] || [ "pnpm-lock.yaml" -nt "node_modules" ]; then
              echo "[neet] Installing dependencies with pnpm..."
              pnpm install --frozen-lockfile
            else
              echo "[neet] node_modules is up to date."
            fi

            echo "[neet] Ready. Run 'pnpm dev' to start the dev server."
          '';
        };
      });
}
