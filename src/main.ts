import * as rpcServer from 'vscode-ws-jsonrpc/lib/server'
import * as path from 'path'
import { createMessageConnection, ConnectionStrategy, Disposable } from 'vscode-jsonrpc'
import {
    InitializeRequest,
    HoverRequest,
    TextDocumentPositionParams,
    InitializeParams,
} from 'vscode-languageserver-protocol'
import { pathToFileURL } from 'url'

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
            rootUri,
            workspaceFolders: [{ name: '', uri: rootUri }],
            capabilities: {},
        }
        const initResult = await messageConnection.sendRequest(InitializeRequest.type, initParams)
        console.log('initialize result', initResult)

        // Send hover request
        const hoverParams: TextDocumentPositionParams = {
            textDocument: {
                uri: pathToFileURL(path.resolve(rootPath, 'src', 'test.ts')).href,
            },
            position: {
                line: 3,
                character: 11,
            },
        }
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
