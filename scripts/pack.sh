#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(realpath $(dirname $0))"
PROJECT_DIR="$(realpath ${SCRIPT_DIR}/../)"

SOURCE_FILES=(
  content.js
  manifest.json
  LICENSE
)

cd $PROJECT_DIR
rm -rf build && mkdir -p build/firefox && mkdir -p build/chrome
cp "${SOURCE_FILES[@]}" .web-extension-id README.md build/firefox
cp "${SOURCE_FILES[@]}" build/chrome

echo "Building for Firefox"
pushd build/firefox
node ../../change-to-v2.js
yarn run web-ext build \
    --source-dir "${PROJECT_DIR}/build/firefox" \
    --artifacts-dir "${PROJECT_DIR}/build/firefox/web-ext-artifacts" \
    --overwrite-dest || true
popd

echo "Building for Chrome"
pushd build/chrome
zip -9 -r ../chrome_build.zip "./"
popd
