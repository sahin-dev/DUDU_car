

module.exports = {
    apps: [
        {
            name: "E-Hailing-Server",
            script: "./src/server.js",
            instances: "1",
            exec_mode: "cluster",
            env: {
                NODE_ENV: "production",
                PORT: 8001,
            },
        },
    ],
}