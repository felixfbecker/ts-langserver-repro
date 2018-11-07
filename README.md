Reproduces issue https://github.com/theia-ide/typescript-language-server/issues/89

With Node 11 installed, run

```sh
npm install
npm run build
node dist/main.js
```

This will spawn the language server, initialize it and send a hover request for the `test` function in `src/test.ts`.
The hover should come back with the contents of the docblock, but it is empty.
