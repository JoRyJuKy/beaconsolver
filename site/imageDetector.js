import { COLORS, SPECTRAL_CLASSES } from "./constants.js"

//returns windows into an array
const windows = (array, sizes) => Object.values(Object.groupBy(
    array,
    (_, i) => Math.floor(i/sizes)
))

//checks if a color is close to another color
const colorIsClose = (color1Hex, color2RGB) => 
    windows (color1Hex.slice(1), 2)
    .map    (([a, b]) => Number  ("0x"+a+b        )    )
    .every  (( v, i ) => Math.abs(v - color2RGB[i]) < 5)

//finds an estimated spectral class based on pixel color
const findSpectralClass = (pixelColor) => SPECTRAL_CLASSES[
    Object.entries(COLORS)
    .filter(([_, hexCode]) => colorIsClose(hexCode, pixelColor))
    [0][0]
]

//checks if a given pixel is likely on a line
const isLinePixel = (ctx, x, y) => ctx
    .getImageData(x, y, 1, 1)
    .data.slice(0, 3)
    .every(v => v >= 15 && v <= 75)


const detectBeacon = (urlData) => {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext('2d')

    const image = new Image()
    image.crossOrigin = "Anonymous"
    image.onload = () => {
        canvas.width = image.width
        canvas.height = image.height
        ctx.drawImage(image, 0, 0)

        const [sourceImage, rawCircles] = [cv.imread(canvas), new cv.Mat()]
        cv.cvtColor( //convert source image to greyscale
            sourceImage, sourceImage,
            cv.COLOR_RGBA2GRAY, 0    
        )
        cv.GaussianBlur( //blur source image
            sourceImage, sourceImage,
            new cv.Size(5, 5),
            0, 0, cv.BORDER_DEFAULT
        )
        cv.HoughCircles( //detect cirlces
            sourceImage, rawCircles,
            cv.HOUGH_GRADIENT,
            1, 5, 75, 15, 0, 15
        )

        //map the raw circles to their x/y coords (don't need radius)
        const circles = windows(rawCircles.data32F, 3)
            .map(([x, y, _]) => ({x, y}))
        sourceImage.delete(); rawCircles.delete() //free memory

        circles.forEach(({x, y}) => {
            console.log(findSpectralClass(ctx.getImageData(x, y, 1, 1).data.slice(0, 3)))
        })


    }
    image.src = urlData

} 

export {detectBeacon}