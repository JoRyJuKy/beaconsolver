import { COLORS, STAR_RAD } from "./constants.js"
import { solveBeacon } from "./search_algorithm.js"
import { detectBeacon } from "./imageDetector.js"

const buttons = document.getElementById("star-buttons")
const stars = document.getElementById("stars")
const lines = document.getElementById("lines")
const resultsArea = document.getElementById("results")
const editLine = document.createElementNS("http://www.w3.org/2000/svg", "line"); lines.appendChild(editLine)
const primaryStar = document.createElement("div"); primaryStar.id = "primary-star"

//state vars
let movingStar = undefined
let movingMouseOffset = [0,0]
let lastM2edStar = undefined
let lastRemovedPosition = [0,0]
let starList = new Map()

//helper function for settingm the positions of a svg line
const setLinePositions = (line, x1, y1, x2, y2) => {
    line.setAttribute("x1", x1)
    line.setAttribute("y1", y1)
    line.setAttribute("x2", x2)
    line.setAttribute("y2", y2)
}

//updates the results section on the page
const updateResults = () => {
    //remove any existing results from previous solves
    while (resultsArea.lastChild) resultsArea.removeChild(resultsArea.lastChild)

    //add any results
    for (const result of solveBeacon(primaryStar.parentElement, starList)) {
        //create a list element, which contains a code element, which contains the name of the found system
        const codeBlock = document.createElement("code"); codeBlock.textContent = result
        const listItem = document.createElement("li");    listItem.appendChild(codeBlock)

        //append it to the results area
        resultsArea.appendChild(listItem)
    }

    //if the first result isn't the last result, there were multiple results, warn the user
    if (resultsArea.firstChild != resultsArea.lastChild) {
        const warningsvg = document.createElement("img")
        const p = document.createElement("p");
        warningsvg.setAttribute("src", "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/26a0.svg")
        warningsvg.setAttribute("height", 30)
        p.innerHTML = "Multiple results found!<br>Check for the right one ingame."
        resultsArea.insertBefore(p, resultsArea.firstChild)
        resultsArea.insertBefore(warningsvg, p)
        
    }

    //if no results were found, warn the user
    if (resultsArea.firstChild == null) {
        const warningsvg = document.createElement("img")
        const p = document.createElement("p");
        warningsvg.setAttribute("src", "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/26a0.svg")
        warningsvg.setAttribute("height", 30)
        warningsvg.style.paddingBottom = "16px"
        p.innerHTML = "No results found! Make sure you've inputted the beacon correctly."
        resultsArea.insertBefore(p, resultsArea.firstChild)
        resultsArea.insertBefore(warningsvg, p)
    }
}

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

        //if there is no primary star yet, this one will do :)
        if (primaryStar.parentElement == null) { 
            star.appendChild(primaryStar)
            updateResults()
        }

        //on click setup: set this as currently moving star, set offset to click offset from topleft
        star.onmousedown = starEv => {
            if (starEv.button == 0) { //handle m1s (0 is m1 because javascript)
                movingStar = star
                movingMouseOffset = [star.offsetLeft - starEv.x, star.offsetTop - starEv.y]
            } else if (starEv.button == 2 && !starEv.shiftKey) { //handle m2s (not if shift is pressed tho, want to allow ctx menu still)
                lastM2edStar = star
            }
            
        }
        star.onmouseup = starEv => {
            if (starEv.button != 2) return //dont handle non-m2s
            if (starEv.shiftKey) return // dont handle debug stuff

            if (lastM2edStar == star) { //if just rightclicking on one star, remove it
                //make sure primary star isn't removed
                if (primaryStar.parentElement == star) {
                    alert("You can't remove the primary star!\nDouble-click another star to set it as primary.")
                    return
                }

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
            //in both cases, the results need to be updated
            updateResults()
        }
        star.ondblclick = () => { star.appendChild(primaryStar); updateResults() }
        star.oncontextmenu = ev => ev.shiftKey   
    }
    buttons.appendChild(button)
})

document.onmouseup = () => {
    movingStar = undefined
    lastM2edStar = undefined
    setLinePositions(editLine, 0,0,0,0)
}
document.onmousemove = (ev) => {
    // if moving star is active
    if (movingStar != undefined) {
        //if cursor out of bounds of stars div, don't move:
        const starX = ev.x + movingMouseOffset[0]
        const starY = ev.y + movingMouseOffset[1]

        if ( // as long as star X is in bound
            starX > stars.offsetLeft 
            && starX < stars.offsetLeft + stars.offsetWidth - (STAR_RAD*2)
        ) {
            movingStar.style.left = starX + "px"
            starList.get(movingStar).forEach(([n, link],_ ) => link.setAttribute("x"+n, starX+STAR_RAD))
        }

        // as long as star Y is in bound
        if (
            starY > stars.offsetTop
            && starY < stars.offsetTop + stars.offsetHeight - (STAR_RAD*2)
        ) {
            movingStar.style.top = starY + "px"
            starList.get(movingStar).forEach(([n, link],_ ) => link.setAttribute("y"+n, starY+STAR_RAD))
        }
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
stars    .oncontextmenu = ev => ev.shiftKey

const openModalButton = document.getElementById("open-image-modal")
const closeModalButton = document.getElementById("close-image-modal")
const modal = document.getElementById("image-modal")
const uploadArea = document.getElementById("upload-area")
const imageUploader = document.getElementById("modal-image-uploader")

//setup opencv image dection stuff
const openCVReady = () => {
    //get a list of elements that we need to blur when the modal opens
    const blurElements = Array.from(document.body.children)
        .filter(child => child.id != "image-modal")

    openModalButton.onclick = () => {
        if (modal.open) return //if modal is already open do nothing
        
        modal.showModal()
        blurElements //add blur effect
            .forEach(child => child.classList.add("blur"))
    }
    closeModalButton.onclick = () => {
        if (!modal.open) return // if modal is not open do nothing

        modal.close()
        blurElements //remove blur effect
            .forEach(child => child.classList.add("blur-removing"))
        setTimeout(
            () => blurElements.forEach(child => {
                child.classList.remove("blur")
                child.classList.remove("blur-removing")
            }),
            1000 * 0.3 //.3 seconds
        )
    }
    uploadArea.onclick = () => imageUploader.click()

    const processFile = (file) => {
        const fileReader = new FileReader()
        fileReader.onload = () => {
            const results = detectBeacon(fileReader.result)
        }
        fileReader.readAsDataURL(file)
    }

    imageUploader.onchange = (event) => processFile(event.target.files[0])
    document.onpaste = (event) => {
        if (!modal.open) return
        event.preventDefault()
        
        if (event.clipboardData.files.length == 0) return
        const file = event.clipboardData.files[0]
        if (!file.type.startsWith("image/")) return

        processFile(file)
    }

    openModalButton.innerText = "Load From Image"
}

//create script element to load opencv
const openCVScriptElement = document.createElement("script")
Module.onRuntimeInitialized = openCVReady
openCVScriptElement.async = true
openCVScriptElement.src = "https://docs.opencv.org/4.9.0/opencv.js"
document.body.appendChild(openCVScriptElement)