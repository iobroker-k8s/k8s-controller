#!/bin/bash

set -e

# wait for file /tmp/k3s/kubeconfig to exist
echo "Waiting for /tmp/k3s/kubeconfig to exist"
while [ ! -f /tmp/k3s/kubeconfig ]; do
  sleep 1
done
echo "Found /tmp/k3s/kubeconfig"

# rewrite kubeconfig to be valid from this container
sed 's|https://127.0.0.1:6443|https://k3s-master:6443|g' /tmp/k3s/kubeconfig > /tmp/k3s/kubeconfig.devcontainer
echo "Created /tmp/k3s/kubeconfig.devcontainer"