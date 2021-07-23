const childProcess = require('child_process')
const crypto = require('crypto')
const tls = require('tls')
const fs = require('fs')
const events = require('events')
const { Console } = require('console')
const path = require('path')
const stoppable = require('stoppable')


/**@type {function}*/
let onready = undefined
module.exports = new Promise((resolve) => onready = resolve)


class ExtConsole extends Console {
    /**
     * @param {tls.TLSSocket} socket 
     * @param {string} uuid
     */
    constructor(socket, uuid) {
        super({ stdout: socket, stderr: socket })
        this.socket = socket
        this.uuid = uuid
        socket.on('data', (data) => this.ondata(data))
    }


    /**
     * @param {Buffer} data 
     */
    ondata(data) { // Default
        process.stdout.write(`${this.uuid}: ` + data)
    }


    /**
     * @param {function?} cb 
     */
    close(cb) {
        this.socket.end(cb)
    }
}


const emitter = new events.EventEmitter()


const server = stoppable(tls.createServer({
    key: fs.readFileSync(process.env.PRIVATEKEYPATH || 'cert/key.pem'),
    cert: fs.readFileSync(process.env.CERTPATH || 'cert/cert.pem')
}, (socket) => {
    socket.on('end', () => { })
    socket.on('error', () => { })
    socket.once('data', (data) => {
        try {
            const uuid = /ExtConsole:(.{8}(-.{4}){3}-.{12})\n\n/.exec(data)[1]
            socket.removeAllListeners()
            uuid ? emitter.emit(uuid, socket) : socket.end()
        } catch (err) { }
    })
}))
server.listen(() => {
    console.log('ExtConsole server address:', server.address())
    onready()
})


/**
 * @returns {Promise<ExtConsole>}
 */
function createConsole() {
    if (!server.listening) throw new Error('ExtConsole server is not listening yet!')
    /**@type {ExtConsole}*/
    let extConsole = undefined
    const uuid = crypto.randomUUID()


    /**@type {function}*/
    let resolve = undefined
    return new Promise((res) => {
        resolve = res
        // Shell specific commands needed in the future
        childProcess.exec(`start node ${path.join(process.cwd(), 'extconsole.js')} ${server.address().port} ${uuid}`)
        emitter.once(uuid, connected)
    })


    /**
     * @param {tls.TLSSocket} socket 
     */
    function connected(socket) {
        const address = socket.remoteFamily === 'IPv6' ? '[' + socket.remoteAddress + ']' : socket.remoteAddress
        console.log(`External console ${uuid} connected from ${address}:${socket.remotePort}.`)
        socket.on('end', disconnected)
        socket.on('error', disconnected)
        function disconnected(err) {
            console.log(
                `External console ${uuid} disconnected.`,
                err ? `Error: ${err.message}` : ''
            )
        }
        extConsole = new ExtConsole(socket, uuid)
        resolve(extConsole)
    }
}


/**
 * @param {function(Error, boolean)} cb 
 */
function close(cb) {
    server.stop(cb)
}


module.exports.createConsole = createConsole
module.exports.close = close
module.exports.server = server