# ExtConsole
Allows the use of multiple STDINs and STDOUTs.

## Example
```javascript
const extConsole = require('extconsole')

extConsole(false).then((consoles) => {
    process.stdin.on('data', (data) =>
        consoles.createConsole().then((console1) => {
            console1.log(data.toString('utf8', 0, data.length - 2)) // Remove 2x newline
            console1.ondata = (data) => console.log(data.toString('utf8', 0, data.length - 1))
        })
    )

    let exiting = false
    process.on('SIGINT', () => {
        if (exiting++) return process.exit(1)
        consoles.stop((err, gracefully) => {
            console.log({ err, gracefully })
            process.exit(gracefully ? 0 : 1)
        })
    })
})
```

## TLS
For now the options are as follows:<br>
**key**: process.env.PRIVATEKEYPATH || ./cert/key.pem<br>
**cert**: process.env.CERTPATH || ./cert/cert.pem
