import * as rpcServer from 'vscode-ws-jsonrpc/lib/server'
import * as path from 'path'
import { createMessageConnection, ConnectionStrategy, Disposable } from 'vscode-jsonrpc'
import {
    InitializeRequest,
    HoverRequest,
    TextDocumentPositionParams,
    InitializeParams,
    DidOpenTextDocumentNotification,
    DidOpenTextDocumentParams,
} from 'vscode-languageserver-protocol'
import { pathToFileURL } from 'url'
import * as fs from 'mz/fs'

async function main() {
    const toDispose: Disposable[] = []
    try {
        // Spawn language server
        const languageServerConnection = rpcServer.createServerProcess('TypeScript language', 'node', [
            path.resolve(__dirname, '..', 'node_modules', 'typescript-language-server', 'lib', 'cli.js'),
            '--stdio',
            '--tsserver-path=' + path.join(__dirname, '..', 'node_modules', 'typescript', 'bin', 'tsserver'),
            '--log-level=4',
        ])
        toDispose.push(languageServerConnection)
        const messageConnection = createMessageConnection(
            languageServerConnection.reader,
            languageServerConnection.writer,
            console
        )
        toDispose.push(messageConnection)
        messageConnection.listen()

        // Send initialize request
        const rootPath = path.resolve(__dirname, '..')
        const rootUri = pathToFileURL(rootPath).href
        const initParams: InitializeParams = {
            processId: 0,
            rootPath,
            rootUri,
            workspaceFolders: [{ name: '', uri: rootUri }],
            capabilities: {},
        }
        console.log('sending initialize request with params', initParams)
        const initResult = await messageConnection.sendRequest(InitializeRequest.type, initParams)
        console.log('initialize result', initResult)

        const testPath = path.resolve(rootPath, 'src', 'test.ts')
        const testUri = pathToFileURL(testPath).href

        // Send textDocument/didOpen
        const didOpenParams: DidOpenTextDocumentParams = {
            textDocument: {
                uri: testUri,
                text: await fs.readFile(testPath, 'utf8'),
                languageId: 'typescript',
                version: 1,
            },
        }
        console.log('sending didOpen notification with params', didOpenParams)
        await messageConnection.sendNotification(DidOpenTextDocumentNotification.type, didOpenParams)

        // Send hover request
        const hoverParams: TextDocumentPositionParams = {
            textDocument: {
                uri: testUri,
            },
            position: {
                line: 3,
                character: 11,
            },
        }
        console.log('sending hover request with params', hoverParams)
        const hover = await messageConnection.sendRequest(HoverRequest.type, hoverParams)
        console.log('hover result', hover)
    } finally {
        for (const disposable of toDispose) {
            disposable.dispose()
        }
    }
}

main().catch(err => {
    console.error(err)
    process.exitCode = 1
})
