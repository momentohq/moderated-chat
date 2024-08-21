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

# For Momento developers, to deploy to your dev account, you will need to have gone through the cell bootstrap
# process at least once. Alternately, you can use a teammate's endpoint or use the preprod endpoint 
# (search for Route53 hosted zones in the appropriate AWS accounts).
# export API_DOMAIN=${API_DOMAIN:-your-chosen-domain-name.com}

# The default is to use the API gateway URL that is provided when you deploy the backend stack.
export API_DOMAIN="default"

AWS_PROFILE=dev AWS_REGION=us-west-2 npx cdk deploy --require-approval never
