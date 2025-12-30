import parseExr from "./Mesh/loaders/parse-exr";


function float32ToUint8(floatArray:Float32Array) {
  const len = floatArray.length;
  const uint8Array = new Uint8Array(len);

  for (let i = 0; i < len; i++) {
    let v = floatArray[i] * 255;
    v = Math.min(255, Math.max(0, v));
    uint8Array[i] = Math.round(v);
  }

  return uint8Array;
}

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

function equalizeAndClamp(data:Float32Array, maxV:number){
    data.forEach((v,i) => data[i] = Math.min(1,v/maxV));
}

function clamp(data:Float32Array){
    data.forEach((v,i) => data[i] = Math.min(1,data[i]));
}

function correctGamma(data:Float32Array, gammaV:number){
    data.forEach((v,i) => data[i] = Math.pow(v,gammaV));
}

// From: https://knarkowicz.wordpress.com/2016/01/06/aces-filmic-tone-mapping-curve/
function acesFilm(data:Float32Array){
    const a = 2.51;
    const b = 0.03;
    const c = 2.43;
    const d = 0.59;
    const e = 0.14;
    data.forEach((v,i) => data[i] = (v*(a*v+b))/(v*(c*v+d)+e));
}

// Computes relative luminance (CIE Y) from linear RGB
// http://www.brucelindbloom.com/index.html?Eqn_RGB_XYZ_Matrix.html
function computeLuminance(data:Float32Array):Float32Array {
  const N = data.length / 3;
  const L = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const r = data[i*3 + 0];
    const g = data[i*3 + 1];
    const b = data[i*3 + 2];
    L[i] = 0.2126*r + 0.7152*g + 0.0722*b;
  }
  return L;
}

// From: https://dl.acm.org/doi/pdf/10.1145/566654.566575
function reinhard(data: Float32Array, key_value: number = 0.18) {
    // 1) Compute log-average luminance
    const N = data.length/3;
    const delta = 1e-5;
    const epsilon = 1e-8;
    const L = computeLuminance(data);
    let sum = 0;
    for (let i = 0; i < L.length; i++) {
        sum += Math.log(delta + L[i]);
    }
    const log_avg_luminance = Math.exp(sum / L.length);

    // 2) Compute scaled luminance
    const scaled_luminance = L.map((v,i) => (key_value/log_avg_luminance) * v);

    // 3) Compute Ld
    const Ld = scaled_luminance.map((v,i) => v / (1 + v));

    // 4) Apply computed luminance
    for(let i = 0; i<Ld.length; i++){
        const scale = Ld[i] / (L[i] + epsilon);
        data[i*3] *= scale
        data[i*3 + 1] *= scale
        data[i*3 + 2] *= scale
    }
}

export async function loadEXRImage(fileName:string, exposure:number):
Promise<{ data: Float32Array; width: number; height: number; }>{

    console.log("=== STARTING EXR LOADER")
    const response = await fetch(fileName);
    if (!response.ok) throw new Error("Could not load image: " + fileName);
    console.log("=== EXR FILE FETCHED")
    
    const exrData = await response.arrayBuffer();
    const FloatType = 1015;
    // const HalfFloatType = 1016;

    let { data, width, height } = parseExr(exrData, FloatType);
    data = data as Float32Array

    //let data = new Float32Array(), width = 0, height = 0;

    console.log("=== IMAGE READ: width ",width," height ",height, " data.len",data.length)
    console.log("=== FIRST 10 PIXELS")
    for(let i = 0; i<10; i++){
        console.log("R:",data[i]," G:",data[i+1]," B:",data[i+2]," A:",data[i+3])
    }

    // Skip alpha values in parsed exr file
    let realData = data.filter((v,i) => (i + 1) % 4 != 0)

    applyExposure(realData,exposure)

    const maxV = getMaxValue(realData)
    console.log("=== MAX VALUE:", maxV)

    //equalizeAndClamp(realData, maxV);
    //equalizeAndClamp(realData, 5);
    //acesFilm(realData);
    //reinhard(realData, 0.18)
    //clamp(realData);
    //correctGamma(realData, 1/2.2);


    console.log("=== FINISHED LOADING")
    return { data:realData, width, height }
}