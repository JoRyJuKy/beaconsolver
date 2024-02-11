const express = require("express")
const path = require("path")

const app = express()
app.use(express.static(path.join(__dirname, "site")))
app.listen(3000, function (err) {
    if (err) console.error(err)
    console.log("Listening on http://localhost:3000")
})