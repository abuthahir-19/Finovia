#!/usr/bin/env bash
# GCE VM startup script to provision a Jenkins controller with the tooling this
# pipeline needs: Temurin JDK 21, Docker, Node 20, gcloud (preinstalled on GCE),
# firebase-tools, and Jenkins LTS. Tested on Debian 12 (bookworm).
#
# Usage: paste into the VM's "Automation > Startup script", or run manually as root.
set -euxo pipefail

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y curl gnupg ca-certificates apt-transport-https software-properties-common git

# --- Temurin JDK 21 (for the Maven build, though the build also runs in Docker) ---
mkdir -p /etc/apt/keyrings
curl -fsSL https://packages.adoptium.net/artifactory/api/gpg/key/public \
  | gpg --dearmor -o /etc/apt/keyrings/adoptium.gpg
echo "deb [signed-by=/etc/apt/keyrings/adoptium.gpg] https://packages.adoptium.net/artifactory/deb $(. /etc/os-release && echo "$VERSION_CODENAME") main" \
  > /etc/apt/sources.list.d/adoptium.list

# --- Node.js 20 ---
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -

# --- Docker ---
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg \
  | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  > /etc/apt/sources.list.d/docker.list

# --- Jenkins LTS ---
curl -fsSL https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key \
  | tee /usr/share/keyrings/jenkins-keyring.asc > /dev/null
echo "deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] https://pkg.jenkins.io/debian-stable binary/" \
  > /etc/apt/sources.list.d/jenkins.list

apt-get update
apt-get install -y temurin-21-jdk nodejs docker-ce docker-ce-cli containerd.io jenkins

# Let Jenkins drive Docker.
usermod -aG docker jenkins

# firebase-tools available globally (the pipeline also npx-pins a version).
npm install -g firebase-tools

systemctl enable docker
systemctl restart docker
systemctl enable jenkins
systemctl restart jenkins

echo "Jenkins installed. Initial admin password:"
cat /var/lib/jenkins/secrets/initialAdminPassword || true
echo "Browse to http://<VM_EXTERNAL_IP>:8080 to finish setup."
