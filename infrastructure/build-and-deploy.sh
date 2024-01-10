#!/bin/bash
set -e
set -x

pushd ../backend/lambdas
  npm install
  npm run build
popd

rm -f cdk.context.json

npm i
npm run build

AWS_PROFILE=dev AWS_REGION=us-west-2 npx cdk deploy --require-approval never
