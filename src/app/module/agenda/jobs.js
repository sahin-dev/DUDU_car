
const tripWatcher = require("./jobs/tripWatcher");


module.exports = {
    "trip:watcher": {
        interval:"1 minute",
        job: tripWatcher
    }
}
