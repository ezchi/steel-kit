#!/usr/bin/env bash

set -euo pipefail

REPO_SLUG="ezchi/steel-kit"
DEFAULT_REF="main"
INSTALL_ROOT="${STEEL_INSTALL_ROOT:-${XDG_DATA_HOME:-$HOME/.local/share}/steel-kit}"
BIN_DIR="${STEEL_BIN_DIR:-$HOME/.local/bin}"
REF="$DEFAULT_REF"
SOURCE_DIR="${STEEL_INSTALL_SOURCE_DIR:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCAL_SOURCE=false

usage() {
  cat <<EOF
Usage: $0 [--ref <git-ref>] [--install-root <dir>] [--bin-dir <dir>] [--source-dir <dir>]

Installs Steel-Kit into:
  files: $INSTALL_ROOT
  binary: $BIN_DIR/steel
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --ref)
      REF="$2"
      shift 2
      ;;
    --install-root)
      INSTALL_ROOT="$2"
      shift 2
      ;;
    --bin-dir)
      BIN_DIR="$2"
      shift 2
      ;;
    --source-dir)
      SOURCE_DIR="$2"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: required command '$1' not found in PATH" >&2
    exit 1
  fi
}

need_cmd node
need_cmd npm
need_cmd tar

TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

SOURCE_WORKTREE=""
if [[ -n "$SOURCE_DIR" ]]; then
  SOURCE_WORKTREE="$SOURCE_DIR"
  LOCAL_SOURCE=true
elif [[ -f "./package.json" && -d "./src" && -d "./resources" ]]; then
  SOURCE_WORKTREE="$(pwd)"
  LOCAL_SOURCE=true
elif [[ -f "$SCRIPT_DIR/package.json" && -d "$SCRIPT_DIR/src" && -d "$SCRIPT_DIR/resources" ]]; then
  SOURCE_WORKTREE="$SCRIPT_DIR"
  LOCAL_SOURCE=true
else
  need_cmd curl
  ARCHIVE="$TMP_DIR/steel-kit.tar.gz"
  URL="https://github.com/$REPO_SLUG/archive/refs/heads/$REF.tar.gz"
  if [[ "$REF" == v* ]]; then
    URL="https://github.com/$REPO_SLUG/archive/refs/tags/$REF.tar.gz"
  fi
  echo "Downloading Steel-Kit from $URL..."
  curl -fsSL "$URL" -o "$ARCHIVE"
  tar -xzf "$ARCHIVE" -C "$TMP_DIR"
  SOURCE_WORKTREE="$(find "$TMP_DIR" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
  if [[ ! -f "$SOURCE_WORKTREE/dist/src/cli.js" ]]; then
    LOCAL_SOURCE=true
  fi
fi

if [[ "$LOCAL_SOURCE" == "true" ]]; then
  if [[ ! -d "$SOURCE_WORKTREE/node_modules" ]]; then
    echo "Installing build dependencies..."
    (cd "$SOURCE_WORKTREE" && npm install)
  fi
  echo "Building Steel-Kit from source..."
  (cd "$SOURCE_WORKTREE" && npm run build)
fi

if [[ ! -f "$SOURCE_WORKTREE/dist/src/cli.js" ]]; then
  echo "Error: built CLI not found at $SOURCE_WORKTREE/dist/src/cli.js" >&2
  echo "Failed to build from source." >&2
  exit 1
fi

mkdir -p "$INSTALL_ROOT" "$BIN_DIR"
rm -rf "$INSTALL_ROOT"/*

for path in dist resources prompts templates package.json package-lock.json README.md LICENSE; do
  if [[ -e "$SOURCE_WORKTREE/$path" ]]; then
    cp -R "$SOURCE_WORKTREE/$path" "$INSTALL_ROOT/"
  fi
done

npm install --omit=dev --prefix "$INSTALL_ROOT"

cat >"$BIN_DIR/steel" <<EOF
#!/usr/bin/env bash
exec node "$INSTALL_ROOT/dist/src/cli.js" "\$@"
EOF
chmod +x "$BIN_DIR/steel"

echo "Steel-Kit installed."
echo "  files: $INSTALL_ROOT"
echo "  binary: $BIN_DIR/steel"

case ":$PATH:" in
  *":$BIN_DIR:"*) ;;
  *)
    echo
    echo "Add $BIN_DIR to your PATH to use 'steel' directly."
    ;;
esac
