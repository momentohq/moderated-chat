#!/usr/bin/env bash

set -e
set -o pipefail

# This script is to setup all of the necessary secrets for the infrastructure to run. 
# This script is really only needed when setting up the secrets for the first time.

function log() {
  local msg=$1
  >&2 echo "$msg"
}

function usage() {
  log "
This script will create the AWS Secrets Manager secrets that the backend lambdas 
expect to be present when it is run.
Only the Momento API key secret should be passed as an environment variable to this script. 

Usage:
AWS_PROFILE=<> MOMENTO_API_KEY=<> $0
  "
  exit 1
}

doesCommandExist() {
  if ! command -v $1 &> /dev/null
  then
      echo "$1 could not be found. Please install before running this script"
      exit 1
  fi
}

function createOrUpdateSecret() {
  set +e
  local secretName=$1
  local secretValue=$2
  local description=$3
  echo "creating ${secretName} secret"
  aws secretsmanager create-secret \
          --secret-string "${secretValue}" \
          --name ${secretName} \
          --description "${description}"
  if [ $? -eq 0 ]; then
      echo "${secretName} secret created successfully"
  else
    set -e
    echo "${secretName} secret already exists, updating it to the new value"
    aws secretsmanager update-secret \
          --secret-string "${secretValue}" \
          --secret-id ${secretName}
  fi
  set -e
}

if [ -z "$AWS_PROFILE" ]
then
      echo "\$AWS_PROFILE is empty"
      usage
fi

if [ -z "$MOMENTO_API_KEY" ]
then
      echo "\$MOMENTO_API_KEY is empty"
      usage
fi

# Make sure user has aws cli installed before continuing
doesCommandExist "aws"

createOrUpdateSecret "moderator/demo/secrets" "{\"momentoApiKey\":\"${MOMENTO_API_KEY}\", \"momentoSigningSecret\":\"placeholder-will-be-replaced-during-cdk-setup\"}"
