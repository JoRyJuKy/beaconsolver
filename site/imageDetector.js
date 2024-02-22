// -------------------------
// |   ABANDON ALL SANITY  |
// | YE WHO READ THIS FILE |
// -------------------------

import { COLORS, LINE_THRESHOLD, windows } from "./constants_helpers.js"

//checks if a color is close to another color
const colorIsClose = (color1Hex, color2RGB, thresh) => 
    windows (color1Hex.slice(1), 2)
    .map    (([a, b]) => Number  ("0x"+a+b        )    )
    .every  (( v, i ) => Math.abs(v - color2RGB[i]) < thresh)

//finds an estimated spectral class based on pixel color
const findSpectralClass = (pixelColor) => {
    const filteredColors = Object.entries(COLORS)
        .filter(([_, hexCode]) => colorIsClose(hexCode, pixelColor, 5))
    
    if (filteredColors.length == 0) return null
    return filteredColors[0][0]
}

// gets 4 small variations on a point
const variants = (x, y) => [
    [x + 0.5, y + 0.5],
    [x + 0.5, y - 0.5],
    [x - 0.5, y + 0.5],
    [x - 0.5, y - 0.5]
]

//finds the distance between two points
const dist = (x1, y1, x2, y2) => Math.hypot(x1 - x2, y1 - y2)


const detectBeacon = (urlData) => new Promise(resolve => {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext('2d')
    const image = new Image()
    image.crossOrigin = "Anonymous"
    image.onload = () => {
        canvas.width = image.width
        canvas.height = image.height
        ctx.drawImage(image, 0, 0)

        const sourceImage = cv.imread(canvas),
              rawCircles  = new cv.Mat()
        cv.cvtColor( //convert to greyscale
            sourceImage, sourceImage,
            cv.COLOR_RGBA2GRAY, 0    
        )

        let lineMask  = new cv.Mat(),
            starsMask = new cv.Mat()
        cv.threshold(sourceImage, lineMask, 20, 255, cv.THRESH_BINARY)
        cv.threshold(sourceImage, starsMask, 60, 255, cv.THRESH_BINARY)
        sourceImage.delete()
        cv.subtract(lineMask, starsMask, lineMask, new cv.Mat(), -1); 
        

        cv.GaussianBlur( //blur source image
            starsMask, starsMask,
            new cv.Size(5, 5),
            0, 0, cv.BORDER_DEFAULT
        )
        cv.HoughCircles( //detect cirlces
            starsMask, rawCircles,
            cv.HOUGH_GRADIENT,
            1, 5, 75, 15, 0, 5
        );
        starsMask.delete()

        const circles = windows(rawCircles.data32F, 3)
            .map(([x, y, r]) => ({x, y, r}))
        rawCircles.delete();

        const xS = circles.map(({x}) => x).sort((x1, x2) => x1-x2);
        const yS = circles.map(({y}) => y).sort((y1, y2) => y1-y2);
        const smallestX = xS[0],
              largestX  = xS[xS.length-1] - smallestX,
              smallestY = yS[0],
              largestY  = yS[yS.length-1] - smallestY,
              largest   = Math.max(largestX, largestY)
        const toKey = (x, y) => `${
            Math.round(((x - smallestX - ((largestX - largest) / 2)))/largest * 600) + 75
        }_${
            Math.round(((y - smallestY - ((largestY - largest) / 2)))/largest * 600) + 75
        }`

        const isLinePixel = (x, y) => lineMask.ucharAt(y, x) > 50
        const circlesAreClose = (c1, c2) => Math.abs(c1.x - c2.x) < 1.2 && Math.abs(c1.y - c2.y) < 1.2
        const lineIntersectsCircle = (m, yInt, cx, cy, r) => {
            // determines whether a line (represented by its slope m and y intercept yInt) intersects a circle\
            // circle has cx x pos, cy y pos, and r radius
            // works by finding discriminant of intersection quadratic, if it is >= 0 then there is some intersection
            // https://www.desmos.com/calculator/mlvhm99j8z
            
            const a = m**2 + 1
            const b = 2 * ((m * yInt) - (m * cy) - cx)
            const c = (yInt**2) + (cx**2) + (cy**2) - (r**2) - (2 * yInt * cy)
            const disc = (b ** 2) - (4*a*c)
            return disc >= 0
        }
        const lineIsValid = (x1, y1, r1, x2, y2, r2) => {
            //variables n functions 4 getting points
            const slope = (y1 - y2)/(x1 - x2)
            const smallerY = x1 < x2 ? y1 : y2
            const smallerX = y1 < y2 ? x1 : x2
            const getY = x => slope * (x - Math.min(x1, x2)) + smallerY
            const getX = y => smallerX - ((Math.min(y1, y2) - y)/slope)

            //check that no circle intersects this line, if there is it is invalid
            if (circles.some(c => {
                if ( //circle is beyond the rect bounded by the two other circles
                    Math.abs(x1 - c.x) + Math.abs(x2 - c.x) != Math.abs(x1 - x2) ||
                    Math.abs(y1 - c.y) + Math.abs(y2 - c.y) != Math.abs(y1 - y2)
                ) return false

                return lineIntersectsCircle(slope, getY(0), c.x, c.y, c.r) &&
                !circlesAreClose(c, {x: x1, y: y1}) &&
                !circlesAreClose(c, {x: x2, y: y2})
            })) return false

            //loops stuff:
            let nMatches = 0, //state vars for loops
                nNot     = 0
            const handlePoint = (x, y) => {
                if (dist(x, y, x1, y1) <= r1) return
                if (dist(x, y, x2, y2) <= r2) return
                if (isLinePixel(x, y)) nMatches++
                else nNot++
            }
            //loop over all integer points on line, handle them
            for (let x = Math.min(x1, x2); x < Math.max(x1, x2); x++)
                handlePoint(x, getY(x))
            for (let y = Math.min(y1, y2); y < Math.max(y1, y2); y++)
                handlePoint(getX(y), y)

            return nMatches/nNot >= LINE_THRESHOLD
        }
        
        let systemCluster = {}
        circles.forEach(({x: x1, y: y1, r: r1}) => {
            const systemKey = toKey(x1, y1)
            if (systemKey in systemCluster) return

            const systemClass = findSpectralClass(
                ctx.getImageData(x1, y1, 1, 1).data.slice(0, 3)
            )
            if (systemClass == null) return

            const variants1 = variants(x1, y1)
            systemCluster[systemKey] = {}
            systemCluster[systemKey].class = systemClass
            systemCluster[systemKey].connections = circles
                .filter(({x: x2, y: y2, r: r2}) => 
                    variants(x2, y2)
                    .some(p1 => 
                        variants1.some(p2 =>lineIsValid(...p1, r1, ...p2, r2))
                    )
                )
                .map(({x, y}) => toKey(x, y))
        })
        lineMask.delete() //free up memory, won't be needed here on out
        const primaryCircle = circles
            .map(circle => {
                const expandedRadius = circle.r * 3.85
                let count = 0
                for (let deg = 0; deg < 360; deg++) {
                    const rad = deg * (180/Math.PI)
                    const x = circle.x + expandedRadius * Math.cos(rad),
                          y = circle.y + expandedRadius * Math.sin(rad)
                    const color = ctx.getImageData(x, y, 1, 1).data.slice(0, 3)
                    if (colorIsClose("#c8c8c8", color, 30)) count++
                }
                return [circle, count]
            })
            .sort((c1, c2) => c2[1] - c1[1])
            .map(c => c[0])[0]
        systemCluster[toKey(primaryCircle.x, primaryCircle.y)].primary = true
        resolve(systemCluster)
    }
    image.src = urlData

})

export {detectBeacon}