

module.exports = {
    apps: [
        {
            name: "E-Hailing-Server",
            script: "./src/server.js",
            env: {
                NODE_ENV: "./.env",
                PORT: 8002,
            },
        },
    ],
}