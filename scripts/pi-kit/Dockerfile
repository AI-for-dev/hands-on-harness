FROM docker/sandbox-templates:shell-docker
USER root

ARG NODE_VERSION=22.21.1
ARG PI_VERSION=0.84.2

RUN apt-get update \
 && apt-get install -y --no-install-recommends xz-utils ca-certificates curl \
 && rm -rf /var/lib/apt/lists/*

# Node explicite plutot qu'hérité du template: pi exige >= 22.19 et la version
# embarquée dans l'image de base n'est pas un contrat.
RUN set -eux; \
    case "$(dpkg --print-architecture)" in \
      amd64) a=x64 ;; \
      arm64) a=arm64 ;; \
      *) echo "architecture non supportee" >&2; exit 1 ;; \
    esac; \
    cd /tmp; \
    curl -fsSLO "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${a}.tar.xz"; \
    curl -fsSLO "https://nodejs.org/dist/v${NODE_VERSION}/SHASUMS256.txt"; \
    grep " node-v${NODE_VERSION}-linux-${a}.tar.xz$" SHASUMS256.txt | sha256sum -c -; \
    mkdir -p /opt/node; \
    tar -xJf "node-v${NODE_VERSION}-linux-${a}.tar.xz" -C /opt/node --strip-components=1; \
    ln -sf /opt/node/bin/node /usr/local/bin/node; \
    ln -sf /opt/node/bin/npm /usr/local/bin/npm; \
    rm -f /tmp/*.tar.xz /tmp/SHASUMS256.txt

RUN npm install -g "@earendil-works/pi-coding-agent@${PI_VERSION}" \
 && ln -sf /opt/node/bin/pi /usr/local/bin/pi \
 && pi --version

USER agent
