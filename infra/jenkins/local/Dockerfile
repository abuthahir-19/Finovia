# Local Jenkins controller with everything the Finovia pipeline needs:
# JDK 21 (base image), Docker CLI, Maven, Node 20, gcloud, and firebase-tools.
# Builds run on the HOST Docker daemon via the mounted /var/run/docker.sock
# (see docker-compose.yml), so no Docker-in-Docker is required.
FROM jenkins/jenkins:lts-jdk21

USER root

# Base tooling + Maven
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      ca-certificates curl gnupg apt-transport-https lsb-release maven \
 && rm -rf /var/lib/apt/lists/*

# Docker CLI (client only — talks to the host daemon)
RUN install -m 0755 -d /etc/apt/keyrings \
 && curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg \
 && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
      > /etc/apt/sources.list.d/docker.list \
 && apt-get update && apt-get install -y --no-install-recommends docker-ce-cli \
 && rm -rf /var/lib/apt/lists/*

# Node.js 20 + firebase-tools
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
 && apt-get install -y --no-install-recommends nodejs \
 && npm install -g firebase-tools \
 && rm -rf /var/lib/apt/lists/*

# Google Cloud CLI
RUN echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" \
      > /etc/apt/sources.list.d/google-cloud-sdk.list \
 && curl -fsSL https://packages.cloud.google.com/apt/doc/apt-key.gpg | gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg \
 && apt-get update && apt-get install -y --no-install-recommends google-cloud-cli \
 && rm -rf /var/lib/apt/lists/*

# (Runs as root via docker-compose so it can reach the mounted docker socket.)
