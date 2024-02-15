import { SPECTRAL_CLASSES } from "./constants.js"

//fetch the map data, determine neighbor class counts
const MAP_DATA = await (await fetch("./map.json")).json()
for (let systemName in MAP_DATA) {
    let counts = {"B":0, "A":0, "F":0, "G":0, "K":0, "M":0}
    MAP_DATA[systemName].neighbors.map(name => MAP_DATA[name].class).forEach(cls => counts[cls] = counts[cls] + 1)
    MAP_DATA[systemName].neighborClassCounts = counts
}


function* solveBeacon(startPoint, starList) {
    let starListBFS = new Map()
    let largestDistance = 0
    starListBFS.set(startPoint, {dist: 0, parent: null})
    let queue = [startPoint]
    while (queue.length > 0) {
        const current = queue.shift()
        const currentStats = starListBFS.get(current)
        if (currentStats.dist > largestDistance) largestDistance = currentStats.dist

        starList.get(current).forEach((_, neighbor) => {
            const neighborStats = starListBFS.get(neighbor)
            if (neighborStats != undefined) return

            starListBFS.set(neighbor, {
                dist: currentStats.dist + 1,
                parent: current
            })
            queue.push(neighbor)
            
        })
    }

    for (let systemName in MAP_DATA) {
        const systemData = MAP_DATA[systemName]
        if (!systemData.isWild) continue
        if (systemData.class != SPECTRAL_CLASSES[startPoint.className]) continue


        //do a bfs search to find the cluster of systems srrounding `systemName`. limited to the max distance of the search graph
        let systemCluster = {}
        let queue = [systemName]
        systemCluster[systemName] = 0
        while (queue.length > 0) {
            const current = queue.shift()
            const currentDistance = systemCluster[current]
            if (currentDistance+1 > largestDistance) continue
            MAP_DATA[current].neighbors.forEach(neighbor => {
                if (neighbor in systemCluster) return
                systemCluster[neighbor] = currentDistance + 1
                queue.push(neighbor)
            })
        }

        //do a check to ensure every node (star) in the search graph (starlistbfs) 
        //has a matching node in the checked system's nearby systems (systemCluster)
        const basicCheckPassed = Array.from(starListBFS.entries()).every(([starDiv, starDivInfo]) => {
            //find the classcounts for stardiv
            let starDivClassCounts = {"B":0, "A":0, "F":0, "G":0, "K":0, "M":0}
            Array.from(starList.get(starDiv).keys()).map(d => SPECTRAL_CLASSES[d.className]).forEach(cl => starDivClassCounts[cl] += 1)

            return Object.entries(systemCluster).some(([sName, sDist]) => {
                const sData = MAP_DATA[sName]
                //same spectral class?
                if (SPECTRAL_CLASSES[starDiv.className] != sData.class) return false
                //same distance in bfs?
                if (starDivInfo.dist != sDist) return false
                //same or greater neighbor class counts
                return Object.entries(starDivClassCounts).every(([cls, divCount]) => sData.neighborClassCounts[cls] >= divCount)

            }) 
        })
        if (!basicCheckPassed) continue

        // if reached this point, system is valid, and yield it
        yield systemName
    }
}

export {solveBeacon}