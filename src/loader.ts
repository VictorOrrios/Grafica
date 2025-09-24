import parseExr from "parse-exr";

function applyExposure(data:Float32Array, exposure:number){
    data.forEach((v,i) => data[i] = v*exposure);
}

function getMaxValue(data:Float32Array):number{
    let maxV = -Infinity;
    data.forEach((v) => {
        maxV = Math.max(maxV,v)
    })
    return maxV
}

function equalize(data:Float32Array, maxV:number){
    data.forEach((v,i) => data[i] = Math.min(maxV,v/maxV));
}

function correctGamma(data:Float32Array, gammaV:number){
    data.forEach((v,i) => data[i] = Math.pow(v,gammaV));
}

export async function loadEXRImage(fileName:string, exposure:number):
Promise<{ data: Float32Array; width: number; height: number; }>{
    console.log("=== STARTING EXR LOADER")
    const response = await fetch(fileName);
    if (!response.ok) throw new Error("Could not load image: " + fileName);
    console.log("=== FILE FETCHED")
    
    const exrData = await response.arrayBuffer();
    const FloatType = 1015;
    // const HalfFloatType = 1016;
    let { data, width, height } = parseExr(exrData, FloatType);
    data = data as Float32Array

    console.log("=== IMAGE READ: width ",width," height ",height)
    console.log("=== FIRST 10 PIXELS")
    for(let i = 0; i<10; i++){
        console.log("R:",data[i]," G:",data[i+1]," B:",data[i+2])
    }

     applyExposure(data,exposure)

    const maxV = getMaxValue(data)
    console.log("=== MAX VALUE:", maxV)

    //equalize(data, maxV);
    equalize(data, 1.0);
    correctGamma(data, 1/2.2);

    return { data, width, height }
}