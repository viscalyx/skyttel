#!/usr/bin/env bash
set -euo pipefail

dotnet_version=8.0.425
gitversion_version=6.8.2
gh_version=2.101.0
vscode_commit=7debcd0e2acdea1c52de81bf9ee1620444407dda
extension_version=26.908.40401

case "$(dpkg --print-architecture)" in
  amd64)
    architecture=x64
    gh_architecture=amd64
    dotnet_sha512=934b8060a7190e5909ad1fd0785db542f487b3bbf6cdd14826b02095fdd0d0394298b1634085eff302928fccc33f7c1a7253e9b87df555fc36fce819bcd2e798
    gh_sha256=9bca2d1c16825f109907a23307628a2f0698fbf99662b73a5cf0b020293072b8
    vscode_sha256=f766476592cd9f875e9e7e66e483dba7e9661b794d8dbca566249126d3525324
    extension_sha256=4b6d13d480222df091f905343c6666a53b67877fa8551ee7ac0b7ace15d4c244
    extension_asset=1789137980221
    ;;
  arm64)
    architecture=arm64
    gh_architecture=arm64
    dotnet_sha512=84a4d017d74d7aa842e981679d1b044e6be1f35b9b2b214021e30bc40871d016d29611cca373d8502ad5c890e3ad360ee698f9cf2d7a4d5a9fba102d88ba310f
    gh_sha256=b57e8063f18862647c9d22727c32e9da1b963f8bf9db648fe123a6975695640f
    vscode_sha256=a2ed76254492de3240bbde9d5be200ea3b5c1143e10e062208aeb8e67415fd1a
    extension_sha256=9f805309294d09d94d94accce23d49818911f22877d7b1c8fd3094a37945487c
    extension_asset=1789138046536
    ;;
  *) echo 'Unsupported devcontainer CPU architecture' >&2; exit 1 ;;
esac

downloads=$(mktemp -d)
trap 'rm -rf "$downloads"' EXIT

curl --fail --silent --show-error --location --retry 3 \
  "https://builds.dotnet.microsoft.com/dotnet/Sdk/${dotnet_version}/dotnet-sdk-${dotnet_version}-linux-${architecture}.tar.gz" \
  --output "$downloads/dotnet.tar.gz"
printf '%s  %s\n' "$dotnet_sha512" "$downloads/dotnet.tar.gz" | sha512sum --check --status
mkdir -p /usr/share/dotnet
tar -xzf "$downloads/dotnet.tar.gz" -C /usr/share/dotnet
ln -s /usr/share/dotnet/dotnet /usr/local/bin/dotnet
dotnet tool install GitVersion.Tool --version "$gitversion_version" --tool-path /opt/gitversion
ln -s /opt/gitversion/dotnet-gitversion /usr/local/bin/dotnet-gitversion

curl --fail --silent --show-error --location --retry 3 \
  "https://github.com/cli/cli/releases/download/v${gh_version}/gh_${gh_version}_linux_${gh_architecture}.tar.gz" \
  --output "$downloads/gh.tar.gz"
printf '%s  %s\n' "$gh_sha256" "$downloads/gh.tar.gz" | sha256sum --check --status
tar -xzf "$downloads/gh.tar.gz" -C "$downloads"
install -m 0755 "$downloads/gh_${gh_version}_linux_${gh_architecture}/bin/gh" /usr/local/bin/gh

curl --fail --silent --show-error --location --retry 3 \
  "https://vscode.download.prss.microsoft.com/dbazure/download/stable/${vscode_commit}/vscode-server-linux-${architecture}.tar.gz" \
  --output "$downloads/vscode.tar.gz"
printf '%s  %s\n' "$vscode_sha256" "$downloads/vscode.tar.gz" | sha256sum --check --status
mkdir -p /opt/vscode
tar -xzf "$downloads/vscode.tar.gz" --strip-components=1 -C /opt/vscode

curl --fail --silent --show-error --location --retry 3 \
  "https://openai.gallerycdn.vsassets.io/extensions/openai/chatgpt/${extension_version}/${extension_asset}/Microsoft.VisualStudio.Services.VSIXPackage" \
  --output /opt/codex-extension.vsix
printf '%s  %s\n' "$extension_sha256" /opt/codex-extension.vsix | sha256sum --check --status
