FROM node:24.21.0-bookworm-slim@sha256:2fe369e969550cde8e867afc3fe370b260140cab4a23d467074295b42163d553

# The timestamp fixes the Debian dependency graph, including browser libraries.
# Update it together with the reviewed tool pins, then rebuild and start normally.
ARG DEBIAN_SNAPSHOT=20260915T000000Z
# Node slim omits the OS CA bundle. Bootstrap it from the pinned Node trust
# store; the snapshot's ca-certificates package then maintains the OS bundle.
RUN mkdir -p /etc/ssl/certs \
    && node --input-type=module -e "import { rootCertificates } from 'node:tls'; import { writeFileSync } from 'node:fs'; writeFileSync('/etc/ssl/certs/ca-certificates.crt', rootCertificates.join('\\n'));" \
    && printf 'Types: deb\nURIs: https://snapshot.debian.org/archive/debian/%s\nSuites: bookworm bookworm-updates\nComponents: main\nSigned-By: /usr/share/keyrings/debian-archive-keyring.gpg\nCheck-Valid-Until: no\n\nTypes: deb\nURIs: https://snapshot.debian.org/archive/debian-security/%s\nSuites: bookworm-security\nComponents: main\nSigned-By: /usr/share/keyrings/debian-archive-keyring.gpg\nCheck-Valid-Until: no\n' "$DEBIAN_SNAPSHOT" "$DEBIAN_SNAPSHOT" > /etc/apt/sources.list.d/debian.sources \
    && apt-get update \
    && apt-get install --no-install-recommends -y \
        bash-completion bubblewrap build-essential ca-certificates curl file \
        git jq less libicu72 libssl3 openssh-client procps python3 ripgrep \
        sqlite3 sudo unzip xz-utils zlib1g \
    && rm -rf /var/lib/apt/lists/*

ENV DOTNET_ROOT=/usr/share/dotnet \
    DOTNET_CLI_TELEMETRY_OPTOUT=1 \
    DOTNET_NOLOGO=1 \
    DOTNET_SKIP_FIRST_TIME_EXPERIENCE=1 \
    PLAYWRIGHT_BROWSERS_PATH=/home/vscode/.cache/ms-playwright \
    PATH=/home/vscode/.local/bin:${PATH}

COPY install-tools.sh install-extension.sh /usr/local/share/skyttel/
RUN bash /usr/local/share/skyttel/install-tools.sh

RUN usermod --login vscode --home /home/vscode --move-home node \
    && groupmod --new-name vscode node \
    && mkdir -p /data /home/vscode/.codex /home/vscode/.config \
        /home/vscode/.vscode-server /home/vscode/.local/bin \
        /home/vscode/.cache/ms-playwright /home/vscode/worktrees \
        /workspaces/skyttel/node_modules /opt/google/chrome \
    && chown -R vscode:vscode /data /home/vscode /workspaces /opt/google/chrome \
    && printf 'vscode ALL=(ALL) NOPASSWD:ALL\n' > /etc/sudoers.d/vscode \
    && chmod 0440 /etc/sudoers.d/vscode \
    && visudo --check --file /etc/sudoers.d/vscode \
    && git config --system --add safe.directory /workspaces/skyttel

USER vscode
RUN bash /usr/local/share/skyttel/install-extension.sh
WORKDIR /workspaces/skyttel
EXPOSE 3000 5173
CMD ["sleep", "infinity"]
