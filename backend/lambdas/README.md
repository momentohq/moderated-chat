# Moderated Chat Backend Lambdas

This repo uses opinionated boilerplate code for building and bundling multiple lambdas from
a single `src` directory, without needing to nest multiple build files. Esbuild is used to
minify and optimize the lambda bundle to reduce cold starts and optimize runtimes. 

## Folder Structure

```text
src
├── common
│   └── logger.ts
|   └── routes
|       └── IRoute.ts
├── shared
|   └── models.ts
├── setup
|   └── handler.ts
└── translations-api
|   └── handler.ts
|   └── routes/v1
|       └── translation.ts
```

Each directory inside the src directory gets bundled as its own lambda, except the common and shared directories. 
There are 2 lambda assets: a setup.zip and a translations-api.zip. 
The common and shared directories are an exception; they do not get bundled as their own asset, they have code that gets reused across the translation lambdas.
The setup lambda is used during cdk deploys of the TranslationApiStack in order to create the Momento cache and webhook necessary for the moderated chat if those resources do not already exist. 

## Building

To build the lambdas inside this repository, you can just run
`npm run build`

This will create a `dist` directory with the following structure
```text
dist
├── setup
│   ├── handler.js
│   ├── handler.js.map
│   └── setup.zip
└── translations-api
    ├── handler.js
    ├── handler.js.map
    └── translations-api.zip
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

Navigate to the infrastructure directory and run the script `./build-and-deploy.sh`
