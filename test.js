const extConsole = require('./index.js')


extConsole.createConsole().then((c) => {
    c.log('Number incoming', 123, 'yes.')
    c.time('test')
    setTimeout(() => c.timeEnd('test'), 1000)
})

