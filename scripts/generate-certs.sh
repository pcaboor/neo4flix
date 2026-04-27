#!/usr/bin/env bash

set -euo pipefail

CERTS_DIR="${CERTS_DIR:-certs}"
CERT_FILE="${CERTS_DIR}/localhost.pem"
KEY_FILE="${CERTS_DIR}/localhost-key.pem"

mkdir -p "${CERTS_DIR}"

if command -v mkcert >/dev/null 2>&1; then
  echo "mkcert detecte : generation d'un certificat local de confiance..."
  mkcert -install
  mkcert -cert-file "${CERT_FILE}" -key-file "${KEY_FILE}" localhost 127.0.0.1 ::1
  echo "Certificat genere dans ${CERT_FILE}"
  exit 0
fi

if ! command -v openssl >/dev/null 2>&1; then
  echo "Erreur : ni mkcert ni openssl ne sont disponibles." >&2
  exit 1
fi

echo "mkcert absent : fallback openssl self-signed."
echo "Le navigateur affichera un avertissement tant que le certificat ne sera pas ajoute a la confiance locale."

openssl req \
  -x509 \
  -nodes \
  -newkey rsa:2048 \
  -sha256 \
  -days 825 \
  -keyout "${KEY_FILE}" \
  -out "${CERT_FILE}" \
  -subj "/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

echo "Certificat self-signed genere dans ${CERT_FILE}"
