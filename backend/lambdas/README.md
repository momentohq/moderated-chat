# Lambda Template

This repo contains opinionated boilerplate code for building and bundling multiple lambdas from
a single `src` directory, without needing to nest multiple build files. Esbuild is used to
minify and optimize the lambda bundle to reduce cold starts and optimize runtimes. There are also examples deploying
these lambdas via `cdk` and `serverless`

## Folder Structure

```text
src
├── common
│   └── logger.ts
├── products
|   └── handler.ts
└── users
    └── handler.ts
```

Each directory inside the src directory gets bundled as its own lambda, except the common directory. There are 2 lambda assets, 
a users.zip and a products.zip. The common directory is an exception which does not get bundled as its own asset. It has 
code that gets reused across the lambdas.

## Building

To build the lambdas inside this repository, you can just run
`npm run build`

This will create a `dist` directory with the following structure
```text
dist
├── products
│   ├── handler.js
│   ├── handler.js.map
│   └── products.zip
└── users
    ├── handler.js
    ├── handler.js.map
    └── users.zip
```

This `*.zip` files can be uploaded as lambda assets through cdk, serverless, cloud formation... to a
lambda with entrypoints `handler.handler`

## Adding new lambdas

To add a new lambda, a new folder under the `src` directory needs to be created, with a file `handler.ts`. This `handler.ts`
file needs to export a `export const handler = () => {}` function which will be used as the lambda entry point. This file will
then get bundled by esbuild as a lambda asset.

## Shared code

Any code that needs to be shared across multiple lambdas can go into the `common` folder. This folder is
unique in the sense that it is the older folder directly under `src` that does not get builded
into its own lambda.

## Deploying

First run `npm i` to install all required dependencies.

To deploy the example lambdas via `cdk` run `AWS_PROFILE=<profile> npm run cdk-deploy`.
To deploy via the `serverless` framework run `AWS_PROFILE=<profile> npm run serverless-deploy`.
