//colors of systems
const COLORS = {
    "blue":"#64c8ff",
    "light-blue": "#c8e6ff",
    "light-yellow":"#fff5d2",
    "yellow": "#fff078",
    "orange": "#ffa550",
    "red": "#ff503c"
}

// convert div colors to star classes
const SPECTRAL_CLASSES = {
    "blue": "B",
    "light-blue": "A",
    "light-yellow": "F",
    "yellow": "G",
    "orange": "K",
    "red": "M"
}

// star radius in pixels
const STAR_RAD = 18

// ratio of (points on a line):(points off a line) for it to be accepted as valid
const LINE_THRESHOLD = 1 

//helper function for settingm the positions of a svg line
const setLinePositions = (line, x1, y1, x2, y2) => {
    line.setAttribute("x1", x1+8)
    line.setAttribute("y1", y1+8)
    line.setAttribute("x2", x2+8)
    line.setAttribute("y2", y2+8)
}

//returns windows into an array
const windows = (array, sizes) => Object.values(Object.groupBy(
    array,
    (_, i) => Math.floor(i/sizes)
))

export {
    COLORS, 
    SPECTRAL_CLASSES, 
    STAR_RAD,
    LINE_THRESHOLD,
    setLinePositions, 
    windows
}