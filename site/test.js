const sourceImages = document.getElementById("source-images");
const urls = [
    "https://cdn.discordapp.com/attachments/994674931688292412/1192953854246006914/image.png?ex=65cfddda&is=65bd68da&hm=3a9b6695e292a6ec711e98776a650c99c6722e9c768922d5775cd079ef9bc37f&",
    "https://cdn.discordapp.com/attachments/1194266508696752148/1205270762093813800/image.png?ex=65d7c2de&is=65c54dde&hm=bc0467ca581fcbe53bc4d562a4be1e9bfbbb75bcbad2c3b1512d15ae812dd8cb&",
    "https://cdn.discordapp.com/attachments/816324109105496107/1197612345753600092/image.png?ex=65ce5b69&is=65bbe669&hm=58c87f179c10e49391f0ff3fe2825c30346f55eaa7195c1ff87d9649f4a3b718&",
    "https://cdn.discordapp.com/attachments/1194277754879877251/1202780940737450024/image.png?ex=65ceb40a&is=65bc3f0a&hm=8eb2c0a1a5db91e995cc7e307b0d56e27d2095584049a57b85e945f97fef20c4&"
]

const isLinePixel = (ctx, x, y) => ctx.getImageData(x, y, 1, 1).data.slice(0, 3).every(v => v >= 15 && v <= 75)

urls.forEach(url => {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    sourceImages.appendChild(canvas)
    let img = new Image()
    img.crossOrigin = "Anonymous"
    img.src = url
    img.onload = () => {
        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)
        //cv code here
        
        let src = cv.imread(canvas); let rawCircles = new cv.Mat(); let rawLines = new cv.Mat()
        cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);
        cv.GaussianBlur(src, src, new cv.Size(5, 5), 0,0,cv.BORDER_DEFAULT)
        cv.HoughCircles(src, rawCircles, cv.HOUGH_GRADIENT, 1, 5, 75, 15, 0, 15);

        cv.Canny(src, src, 50, 100, 7, false)
        cv.HoughLinesP(src, rawLines, 1, Math.PI / 180, 5, 2, 2);
        
        const circles = Object.values(Object.groupBy(Array.from(rawCircles.data32F), (_, i) => Math.floor(i/3))).map(([x,y,r]) => ({x, y, radius: r}))
        src.delete(); rawCircles.delete(); rawLines.delete()

        ctx.strokeStyle = "green"
        ctx.lineWidth = 2

        circles.forEach(circle => {
            ctx.beginPath()
            ctx.arc(circle.x, circle.y, circle.radius + 1, 0, Math.PI * 2, false)
            ctx.stroke()

            circles.forEach(circle2 => {
                if (circle == circle2) return
                const slope = (circle.y - circle2.y)/(circle.x - circle2.x)
                const smaller = circle.x < circle2.x ? circle : circle2


                const getY = (x) => slope * (x - smaller.x) + smaller.y 
                let nTrue = 0
                for (let x = Math.min(circle.x, circle2.x); x<Math.max(circle.x, circle2.x); x++) {
                    for (let mod = -1; mod <= 1; mod++) {if (isLinePixel(ctx, x, getY(x)+mod)) nTrue++}
                }

                const THRESHOLD = 1/2
                const percentTrue = nTrue / Math.abs(circle.x-circle2.x)

                if (percentTrue < THRESHOLD) return

                ctx.beginPath()
                ctx.moveTo(circle.x, circle.y)
                ctx.lineTo(circle2.x, circle2.y)
                ctx.stroke()
            })
        })

    }

    
})

