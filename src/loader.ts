

export async function loadHDRImage(fileName:string){
    const response = await fetch(fileName);
    if (!response.ok) throw new Error("Could not load image: " + fileName);
    //...
}