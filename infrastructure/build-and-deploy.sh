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

# Default to using matt's dev environment
export API_DOMAIN=${API_DOMAIN:-developer-mst-dev.preprod.a.momentohq.com}

AWS_PROFILE=dev AWS_REGION=us-west-2 npx cdk deploy --require-approval never
