const { exec: childProcessExec } = require('child_process')
const { randomUUID } = require('crypto')
const net = require('net'), tls = require('tls')
const fs = require('fs')
const { EventEmitter } = require('events')
const { Console } = require('console')
const { join: pathJoin } = require('path')
const stoppable = require('stoppable')


module.exports = setup


class ExtConsole extends Console {
    /**
     * @param {net.Socket|tls.TLSSocket} socket 
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


/**
 * @param {boolean} useTLS 
 * @returns {Promise<>}
 */
function setup(useTLS) {
    /**@type {function}*/
    let onready = undefined


    const emitter = new EventEmitter()
    const server = stoppable(
        useTLS ?
            tls.createServer({
                key: fs.readFileSync(process.env.PRIVATEKEYPATH || pathJoin(process.cwd(), 'cert/key.pem')),
                cert: fs.readFileSync(process.env.CERTPATH || pathJoin(process.cwd(), 'cert/cert.pem'))
            }, onConnection)
            : net.createServer(onConnection)
    )


    const controller = {
        useTLS,
        createConsole,
        close,
        server
    }


    server.listen(() => onready(controller))


    /**
     * @param {net.Socket|tls.TLSSocket} socket 
     */
    function onConnection(socket) {
        socket.on('end', () => { })
        socket.on('error', () => { })
        socket.once('data', (data) => {
            try {
                const uuid = /ExtConsole:(.{8}(-.{4}){3}-.{12})\n\n/.exec(data)[1]
                socket.removeAllListeners()
                uuid ? emitter.emit(uuid, socket) : socket.end()
            } catch (err) { }
        })
    }


    /**
     * @returns {Promise<ExtConsole>}
     */
    function createConsole() {
        if (!server.listening) throw new Error('ExtConsole server is not listening yet!')
        /**@type {ExtConsole}*/
        let extConsole = undefined
        const uuid = randomUUID()


        /**@type {function}*/
        let resolve = undefined
        return new Promise((res) => {
            resolve = res
            // Shell specific commands needed in the future
            childProcessExec(`start node ${pathJoin(__dirname, 'extconsole.js')} ${uuid} ${server.address().port} ${useTLS}`)
            emitter.once(uuid, connected)
        })


        /**
         * @param {net.Socket|tls.TLSSocket} socket 
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


    /**
     * @type {Promise<controller>}
     */
    return new Promise(resolve => onready = resolve)
}