import { solveBeacon } from "./search_algorithm.js"

//colors of systems
const COLORS = {
    "blue":"#64c8ff",
    "light-blue": "#c8e6ff",
    "light-yellow":"#fff5d2",
    "yellow": "#fff078",
    "orange": "#ffa550",
    "red": "#ff503c"
}
const STAR_RAD = 18

const buttons = document.getElementById("star-buttons")
const stars = document.getElementById("stars")
const lines = document.getElementById("lines")
const solveArea = document.getElementById("solve-area")
const resultsArea = document.getElementById("results")
const editLine = document.createElementNS("http://www.w3.org/2000/svg", "line"); lines.appendChild(editLine)

//helper function for settingm the positions of a svg line
const setLinePositions = (line, x1, y1, x2, y2) => {
    line.setAttribute("x1", x1)
    line.setAttribute("y1", y1)
    line.setAttribute("x2", x2)
    line.setAttribute("y2", y2)
}

//state vars
let movingStar = undefined
let movingMouseOffset = [0,0]
let lastM2edStar = undefined
let lastRemovedPosition = [0,0]

let starList = new Map()

//set up star buttons
Object.entries(COLORS).forEach(([color, hex]) => {
    let button = document.createElement("button")
    //capitalize text, replace for special case with Light-Yellow
    button.innerText = color[0].toUpperCase()+color.slice(1).replace("-y", " Y").replace("-b", " B")
    button.style.backgroundColor = hex

    //setup onclick fn
    button.onclick = (_) => {
        //setup star element
        let star = document.createElement("div")
        starList.set(star, new Map())   
        star.className = color
        star.style.backgroundColor = hex
        stars.appendChild(star)
        star.style.left = button.offsetLeft + ((button.offsetWidth- star.offsetWidth) / 2) +"px" //position in middle of btn
        star.style.top = button.offsetTop + button.offsetHeight + 6 + "px"

        //on click setup: set this as currently moving star, set offset to click offset from topleft
        star.onmousedown = (starEv) => {
            if (starEv.button == 0) { //handle m1s (0 is m1 because javascript)
                movingStar = star
                movingMouseOffset = [star.offsetLeft - starEv.x, star.offsetTop - starEv.y]
            } else if (starEv.button == 2 && !starEv.shiftKey) { //handle m2s (not if shift is pressed tho, want to allow ctx menu still)
                lastM2edStar = star
            }
            
        }
        star.onmouseup = (starEv) => {
            if (starEv.button != 2) return //dont handle non-m2s
            if (starEv.shiftKey) return // dont handle debug stuff

            if (lastM2edStar == star) { //if just rightclicking on one star, remove it
                star.remove()
                lastRemovedPosition = [starEv.x, starEv.y]
                starList.get(star).forEach(([_, line], link) => {
                    line.remove()
                    starList.get(star).delete(link)
                    starList.get(link).delete(star)
                    
                })
                starList.delete(star)
            } else {
                //if line already exists, remove it
                if (starList.get(star).get(lastM2edStar) != undefined) {
                    starList.get(star        ).get(lastM2edStar)[1].remove()
                    starList.get(star        ).delete(lastM2edStar)
                    starList.get(lastM2edStar).delete(star        )
                } else { //otherwise create line
                    let line = document.createElementNS("http://www.w3.org/2000/svg", "line")
                    setLinePositions(
                        line,
                        star        .offsetLeft + STAR_RAD,
                        star        .offsetTop  + STAR_RAD,
                        lastM2edStar.offsetLeft + STAR_RAD,
                        lastM2edStar.offsetTop  + STAR_RAD
                    )
                    lines.appendChild(line)
                    starList.get(star        ).set(lastM2edStar, ["1",line])
                    starList.get(lastM2edStar).set(star,         ["2",line])
                }
            }
        }
        star.oncontextmenu = ev => ev.shiftKey   
    }
    buttons.appendChild(button)
})

document.onmouseup = () => {
    movingStar = undefined
    lastM2edStar = undefined
    setLinePositions(editLine, 0,0,0,0)
}
solveArea.onmouseup = ev => {
    if (ev.button != 2) return
    if (lastM2edStar == undefined) return

    //remove any existing results from previous solves
    while (resultsArea.lastChild) resultsArea.removeChild(resultsArea.lastChild)

    //add any results
    for (const result of solveBeacon(lastM2edStar, starList)) {
        //create a list element, which contains a code element, which contains the name of the found system
        const codeBlock = document.createElement("code")
        codeBlock.textContent = result
        const listItem = document.createElement("li")
        listItem.appendChild(codeBlock)

        //append it to the results area
        resultsArea.append(listItem)
    }
}

document.onmousemove = (ev) => {
    // if moving star is active
    if (movingStar != undefined) {
        //if cursor out of bounds of stars div deactivate movement
        let starX = ev.x + movingMouseOffset[0]
        let starY = ev.y + movingMouseOffset[1]

        if (
               starX < stars.offsetLeft
            || starX > stars.offsetLeft + stars.offsetWidth  - 30
            || starY < stars. offsetTop
            || starY > stars. offsetTop  + stars.offsetHeight - 30
        ) {
            return
        }

        movingStar.style.left = starX + "px"
        movingStar.style.top = starY + "px" 
        
        starList.get(movingStar).forEach(([n, link],_ ) => {
            link.setAttribute("x"+n, starX+STAR_RAD)
            link.setAttribute("y"+n, starY+STAR_RAD)
        })
    }
    if (lastM2edStar != undefined) setLinePositions(
        editLine, ev.x, ev.y,
        lastM2edStar.offsetLeft + STAR_RAD,
        lastM2edStar.offsetTop  + STAR_RAD    
    )
    
}

document .oncontextmenu = ev => {
    //disable context menu by returning false if:
        // shift key is pressed (debug purposes)
        // hacky fix for if a system was just removed with rclick
        // dragging to create connection and fails
    return (
        ev.shiftKey || 
        !(
            ev.x == lastRemovedPosition[0] &&
            ev.y == lastRemovedPosition[1]
        )
    )
}
solveArea.oncontextmenu = ev => ev.shiftKey
stars    .oncontextmenu = ev => ev.shiftKey
