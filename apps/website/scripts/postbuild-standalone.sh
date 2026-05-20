#!/usr/bin/env bash
# Copy .next/static and public into the standalone output (required for production).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STANDALONE="${ROOT}/.next/standalone/apps/website"
STATIC_SRC="${ROOT}/.next/static"
PUBLIC_SRC="${ROOT}/public"

if [[ ! -f "${STANDALONE}/server.js" ]]; then
  echo "postbuild-standalone: missing ${STANDALONE}/server.js — run next build first" >&2
  exit 1
fi

if [[ ! -d "${STATIC_SRC}" ]]; then
  echo "postbuild-standalone: missing ${STATIC_SRC}" >&2
  exit 1
fi

mkdir -p "${STANDALONE}/.next"
rm -rf "${STANDALONE}/.next/static"
cp -a "${STATIC_SRC}" "${STANDALONE}/.next/static"

if [[ -d "${PUBLIC_SRC}" ]]; then
  rm -rf "${STANDALONE}/public"
  cp -a "${PUBLIC_SRC}" "${STANDALONE}/public"
fi

echo "postbuild-standalone: copied static + public → ${STANDALONE}"
